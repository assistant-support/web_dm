// data/task/processors/progress.js
// Mục đích: Tính toán và cập nhật progress từ subtasks

import Task from '@/model/task.model.js';
import { TASK_STATUS } from '@/model/common/enums.js';

/**
 * Tính progress từ subtasks
 * @param {string} parentTaskId - Parent task ID
 * @returns {Promise<Object>} - { total, completed, inProgress, percentage }
 */
export async function calculateTaskProgress(parentTaskId) {
    const subtasks = await Task.find({
        parentTask: parentTaskId,
        deletedAt: null,
    }).lean();
    
    const total = subtasks.length;
    const completed = subtasks.filter(t => t.status === TASK_STATUS.COMPLETED).length;
    const inProgress = subtasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, inProgress, percentage };
}

/**
 * Update progress vào parent task
 * @param {string} parentTaskId - Parent task ID
 * @returns {Promise<Object>} - Updated progress
 */
export async function updateParentProgress(parentTaskId) {
    const progress = await calculateTaskProgress(parentTaskId);
    
    await Task.findByIdAndUpdate(
        parentTaskId, 
        { 
            progress: {
                total: progress.total,
                completed: progress.completed,
                inProgress: progress.inProgress,
                percentage: progress.percentage,
            }
        },
        { lean: true }
    );
    
    return progress;
}
