// lib/noti-helpers.js
// Mục đích: Helper functions để gửi Zalo notifications cho các sự kiện quan trọng

'use server';

import { sendZalo } from '@/lib/noti.js';

/**
 * Gửi thông báo Zalo khi task/subtask được giao cho người dùng
 * @param {string} taskTitle - Tiêu đề của task được giao
 * @param {string} assigneeUserId - externalUserId của người được giao việc
 * @returns {Promise<void>}
 */
export async function notifyTaskAssignment(taskTitle, assigneeUserId) {
    try {
        if (!assigneeUserId || !taskTitle) {
            console.warn('[notifyTaskAssignment] Missing required parameters');
            return;
        }

        const message = `Bạn vừa được giao một nhiệm vụ mới: ${taskTitle}`;
        
        await sendZalo(assigneeUserId, message);
        
        console.log(`[ZALO][SUCCESS] Task assignment notification sent to user ${assigneeUserId}`);
    } catch (error) {
        // Không throw error để tránh làm hỏng toàn bộ action
        console.error(`[ZALO][ERROR] Failed to send task assignment notification to ${assigneeUserId}:`, error);
    }
}

/**
 * Gửi thông báo Zalo khi subtask mới được tạo
 * @param {string} parentTaskTitle - Tiêu đề của task cha
 * @param {string} subtaskTitle - Tiêu đề của subtask mới
 * @param {string} assigneeUserId - externalUserId của người được giao subtask (hoặc người giao task cha)
 * @returns {Promise<void>}
 */
export async function notifySubtaskCreated(parentTaskTitle, subtaskTitle, assigneeUserId) {
    try {
        if (!assigneeUserId || !parentTaskTitle || !subtaskTitle) {
            console.warn('[notifySubtaskCreated] Missing required parameters');
            return;
        }

        const message = `Một task con mới (${subtaskTitle}) vừa được thêm vào task: ${parentTaskTitle}`;
        
        await sendZalo(assigneeUserId, message);
        
        console.log(`[ZALO][SUCCESS] Subtask created notification sent to user ${assigneeUserId}`);
    } catch (error) {
        // Không throw error để tránh làm hỏng toàn bộ action
        console.error(`[ZALO][ERROR] Failed to send subtask created notification to ${assigneeUserId}:`, error);
    }
}

/**
 * Gửi thông báo Zalo khi người dùng được thêm vào dự án
 * @param {string} projectName - Tên của dự án
 * @param {string} newMemberUserId - externalUserId của thành viên mới
 * @returns {Promise<void>}
 */
export async function notifyProjectMemberAdded(projectName, newMemberUserId) {
    try {
        if (!newMemberUserId || !projectName) {
            console.warn('[notifyProjectMemberAdded] Missing required parameters');
            return;
        }

        const message = `Bạn vừa được thêm vào dự án: ${projectName}`;
        
        await sendZalo(newMemberUserId, message);
        
        console.log(`[ZALO][SUCCESS] Project member added notification sent to user ${newMemberUserId}`);
    } catch (error) {
        // Không throw error để tránh làm hỏng toàn bộ action
        console.error(`[ZALO][ERROR] Failed to send project member added notification to ${newMemberUserId}:`, error);
    }
}
