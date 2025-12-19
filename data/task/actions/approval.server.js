// data/task/actions/approval.server.js
// Mục đích: Server Actions cho approval workflow (duyệt task creation, assignee confirm, completion approval)

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { canManageProject } from '@/lib/permissions.js';
import { logActivity } from '@/lib/activity.js';
import { notifyEvent } from '@/lib/noti.js';
import * as tags from '@/data/_shared/tags.js';
import Task from '@/model/task.model.js';
import Project from '@/model/project.model.js';
import { TASK_STATUS, APPROVAL_STATUS } from '@/model/common/enums.js';
import { asPlainTask } from '@/lib/serialize.js';


import AppUser from '@/model/user.model';
import { sendZaloMessage } from '@/lib/noti.js';
/**
 * ACTION: Manager duyệt task do member tạo
 * @param {string} taskId - Task ID
 * @param {Object} params - { approve: boolean, note?: string, initialPoints?: number }
 * @returns {Promise<Object>} - Plain task object
 */
export async function approveTaskCreation(taskId, { approve, note, initialPoints = 0 }) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const task = await Task.findById(taskId);
        assert(task, 'Công việc không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);
        assert(task.status === TASK_STATUS.PENDING_APPROVAL, 'Công việc không ở trạng thái chờ duyệt.', 'BAD_REQUEST', 400);

        const project = await Project.findById(task.project);
        assert(project, 'Dự án không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);
        assert(canManageProject(project, user), 'Bạn không có quyền duyệt công việc này.', 'FORBIDDEN', 403);

        if (approve) {
            task.approval.status = APPROVAL_STATUS.APPROVED;
            task.approval.by = uid;
            task.approval.at = new Date();
            task.approval.note = note || '';
            task.initialPoints = Number(initialPoints) || 0;

            // Determine next status based on assignee
            if (task.assignee) {
                if (task.assignee === uid) {
                    // Người duyệt cũng là người thực hiện → Chuyển thẳng sang IN_PROGRESS
                    task.status = TASK_STATUS.IN_PROGRESS;
                    task.startedAt = new Date();
                } else {
                    // Có assignee khác → Cần xác nhận từ assignee
                    task.status = TASK_STATUS.WAITING_ASSIGNEE_CONFIRM;
                    task.assigneeConfirm.required = true;
                }
            } else {
                // Chưa có assignee → Để ở DRAFT chờ assign
                task.status = TASK_STATUS.DRAFT;
            }
        } else {
            task.approval.status = APPROVAL_STATUS.REJECTED;
            task.approval.by = uid;
            task.approval.at = new Date();
            task.approval.note = note || '';
            task.status = TASK_STATUS.REJECTED;
        }

        await task.save();

        await logActivity({
            actor: uid,
            team: task.team,
            project: task.project,
            task: task._id,
            type: approve ? 'task.approval.approved' : 'task.approval.rejected',
            payload: { initialPoints: task.initialPoints, note },
        });

        // Determine who to notify based on status
        let toUserIds = [task.createdBy];
        
        if (approve) {
            if (task.status === TASK_STATUS.WAITING_ASSIGNEE_CONFIRM && task.assignee) {
                // Notify both creator and assignee
                toUserIds = [task.createdBy, task.assignee].filter((id, index, arr) => id && arr.indexOf(id) === index);
            } else if (task.status === TASK_STATUS.IN_PROGRESS && task.assignee && task.assignee !== task.createdBy) {
                // Notify both creator and assignee (task started)
                toUserIds = [task.createdBy, task.assignee].filter((id, index, arr) => id && arr.indexOf(id) === index);
            }
        }

        await notifyEvent(approve ? 'task.approval.approved' : 'task.approval.rejected', {
            taskId: String(task._id),
            projectId: String(task.project),
            byUserId: uid,
            toUserIds: toUserIds.filter(Boolean),
            taskTitle: task.title // [NEW]
        });

        await revalidateMany([
            tags.project(task.project),
            tags.task(task._id),
        ]);

        return asPlainTask(task.toObject());
    }, { requireAuth: true });
}

/**
 * ACTION: Assignee xác nhận nhận task
 * @param {string} taskId - Task ID
 * @param {Object} params - { accept: boolean, note?: string }
 * @returns {Promise<Object>} - Plain task object
 */
export async function confirmAssignment(taskId, { accept, note }) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const task = await Task.findById(taskId);
        assert(task, 'Công việc không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);
        assert(task.assignee === uid, 'Bạn không phải là người được giao công việc này.', 'FORBIDDEN', 403);
        assert(task.status === TASK_STATUS.WAITING_ASSIGNEE_CONFIRM, 'Công việc không ở trạng thái chờ xác nhận.', 'BAD_REQUEST', 400);

        if (accept) {
            task.assigneeConfirm.confirmedBy = uid;
            task.assigneeConfirm.confirmedAt = new Date();
            task.status = TASK_STATUS.IN_PROGRESS;
            task.startedAt = new Date();
        } else {
            // Từ chối - trả task về draft và bỏ assignee
            task.assignee = null;
            task.assigneeConfirm = { required: false };
            task.status = TASK_STATUS.DRAFT;
        }

        await task.save();

        await logActivity({
            actor: uid,
            team: task.team,
            project: task.project,
            task: task._id,
            type: accept ? 'task.assignment.confirmed' : 'task.assignment.rejected',
            payload: { note: note || '' },
        });

        await notifyEvent(accept ? 'task.assignment.confirmed' : 'task.assignment.rejected', {
            taskId: String(task._id),
            projectId: String(task.project),
            byUserId: uid,
            toUserIds: [task.createdBy].filter(Boolean),
        });

        await revalidateMany([
            tags.project(task.project),
            tags.task(task._id),
        ]);

        return asPlainTask(task.toObject());
    }, { requireAuth: true });
}

/**
 * ACTION: Manager duyệt hoàn thành task (final approval)
 * @param {string} taskId - Task ID
 * @param {Object} params - { approve: boolean, finalPoints?: number, note?: string }
 * @returns {Promise<Object>} - Plain task object
 */
export async function approveTaskCompletion(taskId, { approve, finalPoints, note }) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const task = await Task.findById(taskId);

        assert(task, 'Công việc không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);
        assert(task.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW, 'Công việc không ở trạng thái chờ duyệt hoàn thành.', 'BAD_REQUEST', 400);

        // Kiểm tra và cảnh báo nếu task có subtasks chưa hoàn thành
        const pendingSubtasks = await Task.countDocuments({
            parentTask: taskId,
            status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED] },
            deletedAt: null
        });

        if (pendingSubtasks > 0) {
            console.warn(`[POINTS][WARN] Task ${taskId} được duyệt nhưng còn ${pendingSubtasks} subtasks chưa hoàn thành.`);
            // Tương lai có thể thêm một notification cho manager tại đây
        }

        const project = await Project.findById(task.project);
        assert(project, 'Dự án không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);
        assert(canManageProject(project, user), 'Bạn không có quyền duyệt hoàn thành công việc này.', 'FORBIDDEN', 403);

        if (approve) {
            const points = Number(finalPoints) || 0;
            assert(points >= 0, 'Điểm số phải là số không âm.', 'BAD_REQUEST', 400);
            
            // Nếu là subtask, validate không vượt quá parent
            if (task.parentTask) {
                const parentTask = await Task.findById(task.parentTask);
                if (parentTask) {
                    assert(
                        points <= parentTask.initialPoints, 
                        `Điểm công việc con (${points}) không được vượt quá điểm công việc cha (${parentTask.initialPoints}).`,
                        'BAD_REQUEST',
                        400
                    );
                }
            }
            
            // Nếu có subtasks, validate tổng điểm subtasks không vượt quá điểm task này
            const subtasks = await Task.find({ 
                parentTask: taskId, 
                deletedAt: null,
                status: TASK_STATUS.COMPLETED, // Chỉ tính subtasks đã hoàn thành
            }).lean();
            
            if (subtasks.length > 0) {
                const totalSubtaskPoints = subtasks.reduce((sum, st) => sum + (st.finalPoints || 0), 0);
                assert(
                    totalSubtaskPoints <= points,
                    `Tổng điểm của các công việc con (${totalSubtaskPoints}) không được vượt quá điểm công việc này (${points}).`,
                    'BAD_REQUEST',
                    400
                );
            }
            
            task.status = TASK_STATUS.COMPLETED;
            task.finalPoints = points;
            task.scoredBy = uid;
            task.scoredAt = new Date();

            // Update workflow node status if exists
            if (task.workflowNodeKey && task.workflowId) {
                // Import dynamically để tránh circular dependency
                const { updateWorkflowNodeStatus } = await import('@/data/workflow/actions/server.js');
                await updateWorkflowNodeStatus(String(task.workflowId), task.workflowNodeKey, 'completed');
            }
        } else {
            // Từ chối - yêu cầu làm lại
            task.status = TASK_STATUS.IN_PROGRESS;
            task.completedAt = null;
        }

        await task.save();

        await logActivity({
            actor: uid,
            team: task.team,
            project: task.project,
            task: task._id,
            type: approve ? 'task.completion.approved' : 'task.completion.rejected',
            payload: { finalPoints: task.finalPoints || 0, note: note || '' },
        });

        await notifyEvent(approve ? 'task.completed' : 'task.approval.rejected', {
            taskId: String(task._id),
            projectId: String(task.project),
            byUserId: uid,
            toUserIds: [task.assignee, task.createdBy].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i),
            taskTitle: task.title
        });

        // [NEW] If this is a subtask, notify Parent Task Assignee
        if (task.parentTask) {
             const parentTask = await Task.findById(task.parentTask).select('assignee title').lean();
             if (parentTask && parentTask.assignee && String(parentTask.assignee) !== uid && String(parentTask.assignee) !== String(task.assignee)) {
                 await notifyEvent('subtask.completed', {
                    taskId: String(task._id),
                    projectId: String(task.project),
                    byUserId: uid,
                    toUserIds: [String(parentTask.assignee)],
                    taskTitle: task.title
                 });
             }
        }

        await revalidateMany([
            tags.project(task.project),
            tags.task(task._id),
        ]);

        return asPlainTask(task.toObject());
    }, { requireAuth: true });
}
