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
        assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);
        assert(task.status === TASK_STATUS.PENDING_APPROVAL, 'Task không ở trạng thái chờ duyệt', 'BAD_REQUEST', 400);
        
        const project = await Project.findById(task.project);
        assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);
        assert(canManageProject(project, uid), 'Bạn không có quyền duyệt task', 'FORBIDDEN', 403);
        
        if (approve) {
            task.approval.status = APPROVAL_STATUS.APPROVED;
            task.approval.by = uid;
            task.approval.at = new Date();
            task.approval.note = note || '';
            task.status = TASK_STATUS.DRAFT;
            task.initialPoints = Number(initialPoints) || 0;
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
        
        await notifyEvent(approve ? 'task.approval.approved' : 'task.approval.rejected', {
            taskId: String(task._id),
            projectId: String(task.project),
            byUserId: uid,
            toUserIds: [task.createdBy],
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
        assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);
        assert(task.assignee === uid, 'Bạn không phải là người được assign', 'FORBIDDEN', 403);
        assert(task.status === TASK_STATUS.WAITING_ASSIGNEE_CONFIRM, 'Task không ở trạng thái chờ xác nhận', 'BAD_REQUEST', 400);
        
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
        assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);
        assert(task.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW, 'Task không ở trạng thái chờ duyệt hoàn thành', 'BAD_REQUEST', 400);
        
        const project = await Project.findById(task.project);
        assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);
        assert(canManageProject(project, uid), 'Bạn không có quyền duyệt hoàn thành', 'FORBIDDEN', 403);
        
        if (approve) {
            task.status = TASK_STATUS.COMPLETED;
            task.finalPoints = Number(finalPoints) || 0;
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
        
        await notifyEvent(approve ? 'task.completion.approved' : 'task.completion.rejected', {
            taskId: String(task._id),
            projectId: String(task.project),
            byUserId: uid,
            toUserIds: [task.assignee, task.createdBy].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i),
        });
        
        await revalidateMany([
            tags.project(task.project),
            tags.task(task._id),
        ]);
        
        return asPlainTask(task.toObject());
    }, { requireAuth: true });
}
