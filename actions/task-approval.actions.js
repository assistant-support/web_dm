'use server';

import {
    approveTaskCreation,
    approveTaskCompletion,
} from '@/data/task/actions/approval.server.js';

/**
 * Server Action: submit task approval decision.
 * @param {Object} params
 * @param {string} params.taskId
 * @param {'start'|'complete'} params.type
 * @param {boolean} params.approve
 * @param {number} [params.points]
 * @param {string} [params.note]
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function submitTaskApproval({ taskId, type, approve, points = 0, note = '' }) {
    if (!taskId || !type) {
        return { success: false, error: 'Thiếu thông tin bắt buộc.' };
    }

    try {
        if (type === 'start') {
            const result = await approveTaskCreation(taskId, {
                approve,
                note,
                initialPoints: approve ? Number(points) || 0 : 0,
            });
            return { success: true, data: result };
        }

        if (type === 'complete') {
            const result = await approveTaskCompletion(taskId, {
                approve,
                finalPoints: approve ? Number(points) || 0 : 0,
                note,
            });
            return { success: true, data: result };
        }

        return { success: false, error: 'Loại duyệt không hợp lệ.' };
    } catch (error) {
        const message = error?.message || 'Không thể xử lý yêu cầu duyệt.';
        return { success: false, error: message };
    }
}
