// lib/noti-helpers.js
// Mục đích: Helper functions để gửi Zalo notifications cho các sự kiện quan trọng

'use server';

import { sendZalo } from '@/lib/noti.js';
import { connectDB } from '@/lib/db.js';
import Notification from '@/model/notification.model.js';
import { sanitizeMetadata } from '@/lib/serialize.js';
import { getUserDisplayInfo } from '@/lib/user-display.js';

/**
 * Helper để tạo in-app notification
 */
async function createInAppNotification({ userId, type, message, metadata }) {
    try {
        if (!userId) return;
        await connectDB();
        const cleanMetadata = sanitizeMetadata(metadata);
        await Notification.create({
            userId,
            type,
            message,
            metadata: cleanMetadata,
            read: false,
            createdAt: new Date()
        });
    } catch (error) {
        console.error('[Notification] Failed to create in-app notification:', error);
    }
}

/**
 * Gửi thông báo Zalo khi task/subtask được giao cho người dùng
 * @param {string} taskTitle - Tiêu đề của task được giao
 * @param {string} assigneeUserId - externalUserId của người được giao việc
 * @param {string} taskId - ID của task (để tạo link)
 * @returns {Promise<void>}
 */
export async function notifyTaskAssignment(taskTitle, assigneeUserId, taskId) {
    try {
        if (!assigneeUserId || !taskTitle) {
            console.warn('[notifyTaskAssignment] Missing required parameters');
            return;
        }

        const message = `Bạn vừa được giao một nhiệm vụ mới: ${taskTitle}`;
        
        // 1. Send Zalo
        await sendZalo(assigneeUserId, message);
        
        // 2. Create In-App Notification
        if (taskId) {
            await createInAppNotification({
                userId: assigneeUserId,
                type: 'task.assigned',
                message: message,
                metadata: { taskId }
            });
        }
        
        
    } catch (error) {
        // Không throw error để tránh làm hỏng toàn bộ action
        console.error(`[NOTI][ERROR] Failed to send task assignment notification to ${assigneeUserId}:`, error);
    }
}

/**
 * Gửi thông báo Zalo khi subtask mới được tạo
 * @param {string} parentTaskTitle - Tiêu đề của task cha
 * @param {string} subtaskTitle - Tiêu đề của subtask mới
 * @param {string} assigneeUserId - externalUserId của người được giao subtask (hoặc người giao task cha)
 * @param {string} taskId - ID của subtask
 * @param {string} parentTaskId - ID của task cha
 * @returns {Promise<void>}
 */
export async function notifySubtaskCreated(parentTaskTitle, subtaskTitle, assigneeUserId, taskId, parentTaskId) {
    try {
        if (!assigneeUserId || !parentTaskTitle || !subtaskTitle) {
            console.warn('[notifySubtaskCreated] Missing required parameters');
            return;
        }

        const message = `Một task con mới (${subtaskTitle}) vừa được thêm vào task: ${parentTaskTitle}`;
        
        // 1. Send Zalo
        await sendZalo(assigneeUserId, message);

        // 2. Create In-App Notification
        if (taskId) {
            await createInAppNotification({
                userId: assigneeUserId,
                type: 'subtask.assigned', // Hoặc type khác phù hợp
                message: message,
                metadata: { taskId, parentTaskId }
            });
        }
        
        
    } catch (error) {
        // Không throw error để tránh làm hỏng toàn bộ action
        console.error(`[NOTI][ERROR] Failed to send subtask created notification to ${assigneeUserId}:`, error);
    }
}

/**
 * Gửi thông báo Zalo khi người dùng được thêm vào dự án
 * @param {string} projectName - Tên của dự án
 * @param {string} newMemberUserId - externalUserId của thành viên mới
 * @param {string} projectId - ID của dự án
 * @returns {Promise<void>}
 */
export async function notifyProjectMemberAdded(projectName, newMemberUserId, projectId) {
    try {
        if (!newMemberUserId || !projectName) {
            console.warn('[notifyProjectMemberAdded] Missing required parameters');
            return;
        }

        const message = `Bạn vừa được thêm vào dự án: ${projectName}`;
        
        // 1. Send Zalo (DISABLED per user request)
        // await sendZalo(newMemberUserId, message);

        // 2. Create In-App Notification
        if (projectId) {
            await createInAppNotification({
                userId: newMemberUserId,
                type: 'project.member.added',
                message: message,
                metadata: { projectId }
            });
        }
        
        
    } catch (error) {
        // Không throw error để tránh làm hỏng toàn bộ action
        console.error(`[NOTI][ERROR] Failed to send project member added notification to ${newMemberUserId}:`, error);
    }
}

/**
 * Gửi thông báo Zalo khi người dùng được thêm vào nhóm (Team)
 * @param {string} teamName - Tên của nhóm
 * @param {string} newMemberUserId - externalUserId của thành viên mới
 * @param {string} teamId - ID của nhóm
 * @returns {Promise<void>}
 */
export async function notifyTeamMemberAdded(teamName, newMemberUserId, teamId) {
    try {
        if (!newMemberUserId || !teamName) {
            console.warn('[notifyTeamMemberAdded] Missing required parameters');
            return;
        }

        const message = `Bạn vừa được thêm vào nhóm: ${teamName}`;
        
        // 1. Send Zalo (DISABLED per user request)
        // await sendZalo(newMemberUserId, message);

        // 2. Create In-App Notification
        if (teamId) {
            await createInAppNotification({
                userId: newMemberUserId,
                type: 'team.member.added',
                message: message,
                metadata: { teamId }
            });
        }
        
        
    } catch (error) {
        console.error(`[NOTI][ERROR] Failed to send team member added notification to ${newMemberUserId}:`, error);
    }
}

/**
 * Gửi thông báo khi thành viên bị xóa khỏi nhóm
 */
export async function notifyTeamMemberRemoved(teamName, removedUserId, managerUserIds, teamId) {
    try {
        // 1. Notify removed user
        const userMsg = `Bạn đã bị xóa khỏi nhóm: ${teamName}`;
        // await sendZalo(removedUserId, userMsg); // DISABLED
        await createInAppNotification({ 
            userId: removedUserId, 
            type: 'team.member.removed', 
            message: userMsg, 
            metadata: { teamId } 
        });

        // 2. Notify managers - Lấy tên của thành viên bị xóa
        const removedUserInfo = await getUserDisplayInfo(removedUserId);
        const removedUserName = removedUserInfo.name || removedUserId;
        const managerMsg = `Thành viên ${removedUserName} vừa bị xóa khỏi nhóm: ${teamName}`;
        for (const managerId of managerUserIds) {
            if (String(managerId) === String(removedUserId)) continue;
            
            // await sendZalo(managerId, managerMsg); // DISABLED
            await createInAppNotification({ 
                userId: managerId, 
                type: 'team.member.removed', 
                message: managerMsg, 
                metadata: { teamId } 
            });
        }
    } catch (error) {
        console.error('[notifyTeamMemberRemoved] Error:', error);
    }
}

/**
 * Gửi thông báo khi thành viên nhóm được cập nhật vai trò
 */
export async function notifyTeamMemberRoleUpdated(teamName, updatedUserId, newRole, managerUserIds, teamId) {
    try {
        // 1. Notify updated user
        const userMsg = `Vai trò của bạn trong nhóm ${teamName} đã thay đổi thành: ${newRole}`;
        // await sendZalo(updatedUserId, userMsg); // DISABLED
        await createInAppNotification({ 
            userId: updatedUserId, 
            type: 'team.member.updated', 
            message: userMsg, 
            metadata: { teamId } 
        });

        // 2. Notify managers - Lấy tên của thành viên được cập nhật
        const updatedUserInfo = await getUserDisplayInfo(updatedUserId);
        const updatedUserName = updatedUserInfo.name || updatedUserId;
        const managerMsg = `Thành viên ${updatedUserName} trong nhóm ${teamName} vừa được cập nhật vai trò thành: ${newRole}`;
        for (const managerId of managerUserIds) {
            if (String(managerId) === String(updatedUserId)) continue;

            // await sendZalo(managerId, managerMsg); // DISABLED
            await createInAppNotification({ 
                userId: managerId, 
                type: 'team.member.updated', 
                message: managerMsg, 
                metadata: { teamId } 
            });
        }
    } catch (error) {
        console.error('[notifyTeamMemberRoleUpdated] Error:', error);
    }
}

/**
 * Gửi thông báo khi thành viên bị xóa khỏi dự án
 */
export async function notifyProjectMemberRemoved(projectName, removedUserId, managerUserIds, projectId) {
    try {
        // 1. Notify removed user
        const userMsg = `Bạn đã bị xóa khỏi dự án: ${projectName}`;
        // await sendZalo(removedUserId, userMsg); // DISABLED
        await createInAppNotification({ 
            userId: removedUserId, 
            type: 'project.member.removed', 
            message: userMsg, 
            metadata: { projectId } 
        });

        // 2. Notify managers - Lấy tên của thành viên bị xóa
        const removedUserInfo = await getUserDisplayInfo(removedUserId);
        const removedUserName = removedUserInfo.name || removedUserId;
        const managerMsg = `Thành viên ${removedUserName} vừa bị xóa khỏi dự án: ${projectName}`;
        for (const managerId of managerUserIds) {
            if (String(managerId) === String(removedUserId)) continue;

            // await sendZalo(managerId, managerMsg); // DISABLED
            await createInAppNotification({ 
                userId: managerId, 
                type: 'project.member.removed', 
                message: managerMsg, 
                metadata: { projectId } 
            });
        }
    } catch (error) {
        console.error('[notifyProjectMemberRemoved] Error:', error);
    }
}

/**
 * Gửi thông báo khi thành viên dự án được cập nhật vai trò
 */
export async function notifyProjectMemberRoleUpdated(projectName, updatedUserId, newRole, managerUserIds, projectId) {
    try {
        // 1. Notify updated user
        const userMsg = `Vai trò của bạn trong dự án ${projectName} đã thay đổi thành: ${newRole}`;
        // await sendZalo(updatedUserId, userMsg); // DISABLED
        await createInAppNotification({ 
            userId: updatedUserId, 
            type: 'project.member.updated', 
            message: userMsg, 
            metadata: { projectId } 
        });

        // 2. Notify managers - Lấy tên của thành viên được cập nhật
        const updatedUserInfo = await getUserDisplayInfo(updatedUserId);
        const updatedUserName = updatedUserInfo.name || updatedUserId;
        const managerMsg = `Thành viên ${updatedUserName} trong dự án ${projectName} vừa được cập nhật vai trò thành: ${newRole}`;
        for (const managerId of managerUserIds) {
            if (String(managerId) === String(updatedUserId)) continue;

            // await sendZalo(managerId, managerMsg); // DISABLED
            await createInAppNotification({ 
                userId: managerId, 
                type: 'project.member.updated', 
                message: managerMsg, 
                metadata: { projectId } 
            });
        }
    } catch (error) {
        console.error('[notifyProjectMemberRoleUpdated] Error:', error);
    }
}
