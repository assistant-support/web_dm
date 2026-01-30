// data/task/actions/subtasks.server.js
// Mục đích: Server Actions cho Subtasks

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { canManageProject, canCreateSubtask } from '@/lib/permissions.js';
import { logActivity } from '@/lib/activity.js';
import * as tags from '@/data/_shared/tags.js';
import { notifySubtaskCreated } from '@/lib/noti-helpers.js';

import Task from '@/model/task.model.js';
import Project from '@/model/project.model.js';
import { TASK_STATUS, TASK_SCOPE } from '@/model/common/enums.js';
import { asPlainTask } from '@/lib/serialize.js';

import {
    getSubtasks,
    getSubtaskStats,
    canHaveSubtasks,
    validateSubtask,
    updateParentStatusFromSubtasks,
    getTaskTree,
} from '@/data/task/processors/subtasks.js';

/**
 * Get subtasks of a parent task
 */
export async function listSubtasks(parentTaskId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        // Verify parent task access
        const parentTask = await Task.findById(parentTaskId).lean();
        assert(parentTask, 'Không tìm thấy công việc cha', 'NOT_FOUND', 404);

        // Verify project access
        if (parentTask.scope === TASK_SCOPE.PROJECT) {
            const project = await Project.findById(parentTask.project).lean();
            assert(project, 'Không tìm thấy dự án', 'NOT_FOUND', 404);
            // Permission check would go here
        }

        const subtasks = await getSubtasks(parentTaskId);
        return subtasks.map(asPlainTask);
    }, { requireAuth: true });
}

/**
 * Get subtask stats for a parent task
 */
export async function getSubtaskStatsAction(parentTaskId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const parentTask = await Task.findById(parentTaskId).lean();
        assert(parentTask, 'Không tìm thấy công việc cha', 'NOT_FOUND', 404);

        const stats = await getSubtaskStats(parentTaskId);
        return stats;
    }, { requireAuth: true });
}

/**
 * Create a subtask
 */
export async function createSubtask(parentTaskId, payload) {
    
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        // Get parent task
        const parentTask = await Task.findById(parentTaskId);
        assert(parentTask, 'Không tìm thấy công việc cha', 'NOT_FOUND', 404);
        assert(parentTask.status !== TASK_STATUS.CANCELLED, 'Không thể tạo subtask cho task đã hủy. Task đã hủy chỉ được phép xem.', 'FORBIDDEN', 403);

        // Get project for permission check
        const project = await Project.findById(parentTask.project).lean();
        assert(project, 'Không tìm thấy dự án', 'NOT_FOUND', 404);

        // Validate subtask creation
        const validation = validateSubtask(parentTask, payload);
        assert(validation.valid, validation.error, 'VALIDATION_ERROR', 400);
        
        // **Kiểm tra quyền tạo SUBTASK - Manager hoặc Creator/Assignee của task cha**
        assert(
            canCreateSubtask(parentTask, project, user),
            'Không có quyền tạo công việc con cho task này',
            'FORBIDDEN',
            403
        );

        // [THÊM] Xác định status và assigneeConfirm cho subtask dựa trên assignee
        let status = payload.status || TASK_STATUS.DRAFT;
        let assigneeConfirm = { required: false };
        let startedAt = null;
        
        // Nếu có assignee khi tạo subtask
        if (payload.assignee) {
            // Chỉ tự động IN_PROGRESS khi:
            // 1. Parent task có assignee (parent owner)
            // 2. Người được giao subtask chính là parent owner đó
            if (parentTask.assignee && String(parentTask.assignee) === String(payload.assignee)) {
                // Parent owner tự giao cho mình → Tự động IN_PROGRESS
                status = TASK_STATUS.IN_PROGRESS;
                startedAt = new Date();
                assigneeConfirm = {
                    required: false,
                    confirmedBy: payload.assignee,
                    confirmedAt: new Date()
                };
            } else {
                // TẤT CẢ các trường hợp khác → Cần xác nhận
                // - Giao cho người khác
                // - Parent task chưa có assignee
                status = TASK_STATUS.WAITING_ASSIGNEE_CONFIRM;
                assigneeConfirm = {
                    required: true
                };
            }
        }

        // Create subtask
        const subtask = await Task.create({
            ...payload,
            parentTask: parentTaskId,
            project: parentTask.project,
            team: parentTask.team,
            scope: parentTask.scope,
            createdBy: uid,
            status,
            assigneeConfirm,
            startedAt,
            // Inherit some properties from parent if not provided
            priority: payload.priority || parentTask.priority,
            workType: payload.workType || parentTask.workType,
            platforms: payload.platforms || parentTask.platforms,
        });

        await logActivity({
            actor: uid,
            team: parentTask.team,
            project: parentTask.project,
            task: subtask._id,
            type: 'subtask.created',
            payload: {
                title: subtask.title,
                parentTaskId: parentTaskId,
                parentTaskTitle: parentTask.title,
            },
        });

        // --- Send Zalo Notification for Subtask Creation ---
        // Gửi cho người được giao subtask (nếu có)
        if (subtask.assignee && subtask.assignee !== uid) {
            notifySubtaskCreated(
                parentTask.title,
                subtask.title,
                String(subtask.assignee)
            ).catch(err => {
                console.error(`[createSubtask ${subtask._id}] Failed to send Zalo notification to assignee ${subtask.assignee}:`, err);
            });
        }
        
        // Gửi cho người được giao task cha (nếu khác với người tạo subtask và người được giao subtask)
        if (parentTask.assignee && 
            String(parentTask.assignee) !== uid && 
            String(parentTask.assignee) !== String(subtask.assignee)) {
            notifySubtaskCreated(
                parentTask.title,
                subtask.title,
                String(parentTask.assignee)
            ).catch(err => {
                console.error(`[createSubtask ${subtask._id}] Failed to send Zalo notification to parent task owner ${parentTask.assignee}:`, err);
            });
        }
        // -----------------------------------------------------

        await revalidateMany([
            tags.project(parentTask.project),
            tags.task(parentTaskId),
            tags.task(subtask._id),
        ]);

        return asPlainTask(subtask.toObject());
    }, { requireAuth: true });
}

/**
 * Update subtask
 */
export async function updateSubtask(subtaskId, payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const subtask = await Task.findById(subtaskId);
        assert(subtask, 'Không tìm thấy công việc con', 'NOT_FOUND', 404);
        assert(subtask.parentTask, 'Công việc này không phải là công việc con', 'VALIDATION_ERROR', 400);
        assert(subtask.status !== TASK_STATUS.CANCELLED, 'Không thể cập nhật subtask đã hủy. Subtask đã hủy chỉ được phép xem.', 'FORBIDDEN', 403);
        
        // Check parent task status
        const parentTask = await Task.findById(subtask.parentTask);
        if (parentTask) {
            assert(parentTask.status !== TASK_STATUS.CANCELLED, 'Không thể cập nhật subtask của task đã hủy. Task đã hủy chỉ được phép xem.', 'FORBIDDEN', 403);
        }

        // Verify permission
        if (subtask.scope === TASK_SCOPE.PROJECT) {
            const project = await Project.findById(subtask.project);
            assert(project, 'Không tìm thấy dự án', 'NOT_FOUND', 404);

            const hasManagePermission = await canManageProject(project, user);
            assert(hasManagePermission, 'Bạn không có quyền thực hiện thao tác này', 'FORBIDDEN', 403);
        }

        const oldStatus = subtask.status;

        // Update fields
        Object.keys(payload).forEach(key => {
            if (payload[key] !== undefined) {
                subtask[key] = payload[key];
            }
        });

        // If status changed to completed, set completedAt
        if (payload.status === TASK_STATUS.COMPLETED && oldStatus !== TASK_STATUS.COMPLETED) {
            subtask.completedAt = new Date();
        }

        await subtask.save();

        // Update parent task status if needed
        await updateParentStatusFromSubtasks(subtask.parentTask);

        await logActivity({
            actor: uid,
            team: subtask.team,
            project: subtask.project,
            task: subtask._id,
            type: 'subtask.updated',
            payload: { title: subtask.title },
        });

        await revalidateMany([
            tags.project(subtask.project),
            tags.task(subtask.parentTask),
            tags.task(subtask._id),
        ]);

        return asPlainTask(subtask.toObject());
    }, { requireAuth: true });
}

/**
 * Delete subtask (soft delete)
 */
export async function deleteSubtask(subtaskId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const subtask = await Task.findById(subtaskId);
        assert(subtask, 'Không tìm thấy công việc con', 'NOT_FOUND', 404);
        assert(subtask.parentTask, 'Công việc này không phải là công việc con', 'VALIDATION_ERROR', 400);

        // Verify permission
        if (subtask.scope === TASK_SCOPE.PROJECT) {
            const project = await Project.findById(subtask.project);
            assert(project, 'Không tìm thấy dự án', 'NOT_FOUND', 404);

            const hasManagePermission = await canManageProject(project, user);
            assert(hasManagePermission, 'Bạn không có quyền thực hiện thao tác này', 'FORBIDDEN', 403);
        }

        const parentTaskId = subtask.parentTask;

        // Soft delete
        subtask.deletedAt = new Date();
        await subtask.save();

        // Update parent status
        await updateParentStatusFromSubtasks(parentTaskId);

        await logActivity({
            actor: uid,
            team: subtask.team,
            project: subtask.project,
            task: subtask._id,
            type: 'subtask.deleted',
            payload: { title: subtask.title },
        });

        await revalidateMany([
            tags.project(subtask.project),
            tags.task(parentTaskId),
            tags.task(subtask._id),
        ]);

        return { success: true };
    }, { requireAuth: true });
}

/**
 * Get task with subtasks (tree view)
 */
export async function getTaskWithSubtasks(taskId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const tree = await getTaskTree(taskId);
        assert(tree, 'Không tìm thấy công việc', 'NOT_FOUND', 404);

        // Convert to plain objects
        const plainTree = {
            ...asPlainTask(tree),
            subtasks: tree.subtasks ? tree.subtasks.map(asPlainTask) : [],
        };

        return plainTree;
    }, { requireAuth: true });
}

/**
 * Reorder subtasks
 */
export async function reorderSubtasks(parentTaskId, subtaskIds) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const parentTask = await Task.findById(parentTaskId);
        assert(parentTask, 'Không tìm thấy công việc cha', 'NOT_FOUND', 404);

        // Verify permission
        if (parentTask.scope === TASK_SCOPE.PROJECT) {
            const project = await Project.findById(parentTask.project);
            assert(project, 'Không tìm thấy dự án', 'NOT_FOUND', 404);

            const hasManagePermission = await canManageProject(project, user);
            assert(hasManagePermission, 'Bạn không có quyền thực hiện thao tác này', 'FORBIDDEN', 403);
        }

        // Update listOrder for each subtask
        const updates = subtaskIds.map((subtaskId, index) => {
            return Task.updateOne(
                { _id: subtaskId, parentTask: parentTaskId },
                { $set: { listOrder: index } }
            );
        });

        await Promise.all(updates);

        await revalidateMany([
            tags.project(parentTask.project),
            tags.task(parentTaskId),
        ]);

        return { success: true };
    }, { requireAuth: true });
}
