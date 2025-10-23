// data/task/processors/subtasks.js
// Mục đích: Processor functions cho subtasks (parent-child tasks)

import Task from '@/model/task.model.js';
import { TASK_STATUS } from '@/model/common/enums.js';
import { updateParentProgress } from '@/data/task/processors/progress.js';

/**
 * Get all subtasks of a parent task
 * @param {string} parentTaskId - Parent task ID
 * @returns {Promise<Array>} - Array of subtasks
 */
export async function getSubtasks(parentTaskId) {
    const subtasks = await Task.find({
        parentTask: parentTaskId,
        deletedAt: null,
    })
    .sort({ listOrder: 1, createdAt: 1 })
    .lean();

    return subtasks;
}

/**
 * Get subtask statistics for a parent task
 * @param {string} parentTaskId - Parent task ID
 * @returns {Promise<Object>} - Stats object
 */
export async function getSubtaskStats(parentTaskId) {
    const subtasks = await Task.find({
        parentTask: parentTaskId,
        deletedAt: null,
    }).lean();

    const stats = {
        total: subtasks.length,
        completed: subtasks.filter(t => t.status === TASK_STATUS.COMPLETED).length,
        inProgress: subtasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length,
        todo: subtasks.filter(t => ![TASK_STATUS.COMPLETED, TASK_STATUS.IN_PROGRESS].includes(t.status)).length,
        completionRate: 0,
    };

    if (stats.total > 0) {
        stats.completionRate = Math.round((stats.completed / stats.total) * 100);
    }

    return stats;
}

/**
 * Check if task can have subtasks
 * A task cannot have subtasks if it's already a subtask (max depth = 1)
 * @param {Object} task - Task object
 * @returns {boolean}
 */
export function canHaveSubtasks(task) {
    return !task.parentTask; // Only root tasks can have subtasks
}

/**
 * Update parent task status based on subtasks
 * Auto-complete parent if all subtasks are completed
 * @param {string} parentTaskId - Parent task ID
 */
export async function updateParentStatusFromSubtasks(parentTaskId) {
    const stats = await getSubtaskStats(parentTaskId);
    
    if (stats.total === 0) {
        return; // No subtasks, don't change parent
    }

    const parent = await Task.findById(parentTaskId);
    if (!parent) return;

    // Update progress
    await updateParentProgress(parentTaskId);

    // If all subtasks completed, mark parent as completed (if autoBypassForSubtask is true)
    if (parent.autoBypassForSubtask && stats.completed === stats.total) {
        if (parent.status !== TASK_STATUS.COMPLETED) {
            parent.status = TASK_STATUS.COMPLETED;
            parent.completedAt = new Date();
            await parent.save();
        }
    }
    // If parent was completed but subtask is reopened, reopen parent
    else if (parent.status === TASK_STATUS.COMPLETED && stats.completed < stats.total) {
        if (parent.autoBypassForSubtask) {
            parent.status = TASK_STATUS.IN_PROGRESS;
            parent.completedAt = null;
            await parent.save();
        }
    }
}

/**
 * Get task tree (parent + all subtasks)
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} - Task with subtasks array
 */
export async function getTaskTree(taskId) {
    const task = await Task.findById(taskId).lean();
    if (!task) return null;

    // If it's a subtask, get the parent
    if (task.parentTask) {
        const parent = await Task.findById(task.parentTask).lean();
        if (parent) {
            const siblings = await getSubtasks(parent._id);
            return {
                ...parent,
                subtasks: siblings,
                currentSubtask: task._id,
            };
        }
    }

    // If it's a parent, get subtasks
    const subtasks = await getSubtasks(task._id);
    return {
        ...task,
        subtasks,
    };
}

/**
 * Validate subtask creation
 * @param {Object} parentTask - Parent task object
 * @param {Object} payload - Subtask data
 * @returns {Object} - { valid: boolean, error: string }
 */
export function validateSubtask(parentTask, payload) {
    if (!canHaveSubtasks(parentTask)) {
        return {
            valid: false,
            error: 'Không thể tạo subtask cho task này (đã là subtask)',
        };
    }

    if (!payload.title || !payload.title.trim()) {
        return {
            valid: false,
            error: 'Tiêu đề subtask là bắt buộc',
        };
    }

    return { valid: true };
}
