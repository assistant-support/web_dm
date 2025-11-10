'use server';

import { reorderSubtasks as reorderSubtasksInternal } from '@/data/task/actions/subtasks.server.js';

/**
 * Server action: reorder subtasks for a parent task.
 * Delegates to the shared task action to keep permission and revalidation logic centralized.
 *
 * @param {string} parentTaskId - ID of the parent task whose subtasks are being reordered.
 * @param {string[]} subtaskIds - Ordered list of subtask IDs after drag-and-drop.
 * @returns {Promise<{ success: boolean }>} Result from the underlying server action.
 */
export async function reorderSubtasksAction(parentTaskId, subtaskIds) {
    if (!parentTaskId) {
        throw new Error('Thiếu parentTaskId khi sắp xếp lại subtasks.');
    }
    if (!Array.isArray(subtaskIds)) {
        throw new Error('Thiếu danh sách subtaskIds hợp lệ khi sắp xếp lại subtasks.');
    }

    const normalizedIds = subtaskIds.map((id) => String(id));
    return reorderSubtasksInternal(parentTaskId, normalizedIds);
}
