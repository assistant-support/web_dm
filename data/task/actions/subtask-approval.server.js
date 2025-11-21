// data/task/actions/subtask-approval.server.js
// Mục đích: Server Actions cho duyệt subtask và chia điểm

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { canManageProject, canApproveSubtask } from '@/lib/permissions.js';
import { logActivity } from '@/lib/activity.js';
import { notifyEvent } from '@/lib/noti.js';
import * as tags from '@/data/_shared/tags.js';

import Task from '@/model/task.model.js';
import Project from '@/model/project.model.js';
import { TASK_STATUS } from '@/model/common/enums.js';
import { asPlainTask } from '@/lib/serialize.js';
import { updateParentProgress } from '@/data/task/processors/progress.js';

/**
 * ACTION: Parent task assignee duyệt subtask hoàn thành
 * @param {string} subtaskId - Subtask ID
 * @param {Object} params - { approve: boolean, finalPoints?: number, note?: string }
 * @returns {Promise<Object>} - Plain subtask object
 */
export async function approveSubtaskCompletion(subtaskId, { approve, finalPoints, note }) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        
        const subtask = await Task.findById(subtaskId);
        assert(subtask, 'Subtask không tồn tại', 'NOT_FOUND', 404);
        assert(subtask.parentTask, 'Task này không phải là subtask', 'BAD_REQUEST', 400);
        assert(subtask.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW, 'Subtask không ở trạng thái chờ duyệt', 'BAD_REQUEST', 400);
        
        const parentTask = await Task.findById(subtask.parentTask);
        assert(parentTask, 'Parent task không tồn tại', 'NOT_FOUND', 404);
        
        // Fetch project for permission check
        if (parentTask.project) {
            const project = await import('@/model/project.model.js').then(m => m.default.findById(parentTask.project).lean());
            if (project) parentTask.project = project;
        }

        assert(canApproveSubtask(subtask, parentTask, user), 'Bạn không có quyền duyệt subtask', 'FORBIDDEN', 403);
        
        if (approve) {
            // Validate finalPoints
            const points = Number(finalPoints) || 0;
            assert(points >= 0, 'Điểm phải là số không âm', 'BAD_REQUEST', 400);
            assert(points <= parentTask.initialPoints, `Điểm subtask (${points}) không được vượt quá điểm parent task (${parentTask.initialPoints})`, 'BAD_REQUEST', 400);
            
            subtask.status = TASK_STATUS.COMPLETED;
            subtask.finalPoints = points;
            subtask.completedAt = new Date();
            subtask.scoredBy = uid;
            subtask.scoredAt = new Date();
            
            // Update progress của parent
            await updateParentProgress(String(subtask.parentTask));
            
            // Update workflow node nếu có
            if (subtask.workflowNodeKey && parentTask.workflowId) {
                const { updateWorkflowNodeStatus } = await import('@/data/workflow/actions/server.js');
                await updateWorkflowNodeStatus(String(parentTask.workflowId), subtask.workflowNodeKey, 'completed');
            }
        } else {
            // Từ chối - yêu cầu làm lại
            subtask.status = TASK_STATUS.IN_PROGRESS;
            subtask.completedAt = null;
        }
        
        await subtask.save();
        
        await logActivity({
            actor: uid,
            project: subtask.project,
            task: subtask._id,
            type: approve ? 'subtask.approved' : 'subtask.rejected',
            payload: { 
                note: note || '', 
                parentTaskId: String(subtask.parentTask),
                finalPoints: subtask.finalPoints || 0,
            },
        });
        
        await notifyEvent(approve ? 'subtask.approved' : 'subtask.rejected', {
            taskId: String(subtask._id),
            projectId: subtask.project ? String(subtask.project) : null,
            byUserId: uid,
            toUserIds: [subtask.assignee, subtask.createdBy].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i),
        });
        
        await revalidateMany([
            tags.task(subtask._id),
            tags.task(subtask.parentTask),
            tags.project(subtask.project),
        ].filter(Boolean));
        
        return asPlainTask(subtask.toObject());
    }, { requireAuth: true });
}

/**
 * ACTION: Chia điểm cho các subtasks
 * Chỉ assignee của parent task mới chia được
 * @param {string} parentTaskId - Parent task ID
 * @param {Array} distribution - [{ subtaskId, points }]
 * @returns {Promise<Object>} - Plain parent task object
 */
export async function distributePointsToSubtasks(parentTaskId, distribution) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        
        const task = await Task.findById(parentTaskId);
        assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);
        
        // Check permission: Assignee OR Project Manager OR Admin
        let canDistribute = task.assignee === uid;
        if (!canDistribute && task.project) {
            const project = await Project.findById(task.project).lean();
            if (project && canManageProject(project, user)) {
                canDistribute = true;
            }
        }
        if (user.role === 'admin') canDistribute = true;

        assert(canDistribute, 'Bạn không có quyền chia điểm', 'FORBIDDEN', 403);
        
        // Validate distribution
        assert(Array.isArray(distribution), 'Distribution phải là array', 'BAD_REQUEST', 400);
        
        const totalAssigned = distribution.reduce((sum, d) => sum + (Number(d.points) || 0), 0);
        assert(totalAssigned <= task.initialPoints, `Tổng điểm chia (${totalAssigned}) vượt quá điểm task (${task.initialPoints})`, 'BAD_REQUEST', 400);
        
        // Validate subtasks belong to this parent
        const subtaskIds = distribution.map(d => d.subtaskId);
        const subtasks = await Task.find({ 
            _id: { $in: subtaskIds },
            parentTask: parentTaskId,
            deletedAt: null,
        }).lean();
        
        assert(subtasks.length === subtaskIds.length, 'Một số subtask không hợp lệ', 'BAD_REQUEST', 400);
        
        // Update task's distribution
        task.subtaskPointsDistribution = distribution.map(d => ({
            subtaskId: d.subtaskId,
            assignedPoints: Number(d.points) || 0,
        }));
        
        await task.save();
        
        // Update initialPoints cho từng subtask
        for (const d of distribution) {
            await Task.findByIdAndUpdate(d.subtaskId, {
                initialPoints: Number(d.points) || 0,
            });
        }
        
        await logActivity({
            actor: uid,
            project: task.project,
            task: task._id,
            type: 'task.points.distributed',
            payload: { 
                totalAssigned,
                subtaskCount: distribution.length,
            },
        });
        
        await revalidateMany([
            tags.task(parentTaskId),
            tags.project(task.project),
        ].filter(Boolean));
        
        return asPlainTask(task.toObject());
    }, { requireAuth: true });
}

/**
 * ACTION: Get progress của parent task
 * @param {string} parentTaskId - Parent task ID
 * @returns {Promise<Object>} - Progress info
 */
export async function getTaskProgress(parentTaskId) {
    await connectDB();
    return runAction(async () => {
        const task = await Task.findById(parentTaskId).lean();
        assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);
        
        return task.progress || {
            total: 0,
            completed: 0,
            inProgress: 0,
            percentage: 0,
        };
    }, { requireAuth: true });
}
