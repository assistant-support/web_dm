// data/noti/actions/list.js
// Mục đích: Server Actions để quản lý notifications cho user

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction } from '@/lib/action-utils.js';
import Notification from '@/model/notification.model.js';

/**
 * Get notifications for current user
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of notifications to return (default: 20)
 * @param {number} options.skip - Number of notifications to skip (default: 0)
 * @param {boolean} options.unreadOnly - If true, only return unread notifications (default: false)
 * @returns {Promise<{notifications: Array, unreadCount: number}>}
 */
export async function getMyNotifications({ limit = 20, skip = 0, unreadOnly = false } = {}) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        // Build query
        const query = { userId: uid };
        if (unreadOnly) {
            query.read = false;
        }

        // Fetch notifications
        const notifications = await Notification
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get unread count (always calculate total unread, not just for filtered results)
        const unreadCount = await Notification.countDocuments({ 
            userId: uid, 
            read: false 
        });

        // Serialize notifications (convert ObjectId and Date to strings)
        const serializedNotifications = notifications.map(n => ({
            ...n,
            _id: String(n._id),
            createdAt: n.createdAt.toISOString(),
            // Serialize metadata IDs if they exist
            metadata: n.metadata ? {
                ...n.metadata,
                taskId: n.metadata.taskId ? String(n.metadata.taskId) : undefined,
                projectId: n.metadata.projectId ? String(n.metadata.projectId) : undefined,
                commentId: n.metadata.commentId ? String(n.metadata.commentId) : undefined,
                actorId: n.metadata.actorId || undefined,
            } : undefined,
        }));

        return {
            ok: true,
            notifications: serializedNotifications,
            unreadCount,
        };
    }, { requireAuth: true });
}

/**
 * Mark a single notification as read
 * @param {string} notificationId - The ID of the notification to mark as read
 * @returns {Promise<{success: boolean}>}
 */
export async function markNotificationAsRead(notificationId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        // Update notification, but only if it belongs to the current user
        // This prevents user A from marking user B's notifications as read
        const result = await Notification.findOneAndUpdate(
            { 
                _id: notificationId, 
                userId: uid 
            },
            { 
                read: true 
            },
            { 
                new: true 
            }
        );

        // If result is null, notification was not found or doesn't belong to user
        if (!result) {
            return {
                ok: false,
                code: 'NOT_FOUND',
                message: 'Không tìm thấy thông báo hoặc bạn không có quyền truy cập',
            };
        }

        return {
            ok: true,
            success: true,
        };
    }, { requireAuth: true });
}

/**
 * Mark all unread notifications as read for current user
 * @returns {Promise<{success: boolean, modifiedCount: number}>}
 */
export async function markAllNotificationsAsRead() {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        // Update all unread notifications for this user
        const result = await Notification.updateMany(
            { 
                userId: uid, 
                read: false 
            },
            { 
                read: true 
            }
        );

        return {
            ok: true,
            success: true,
            modifiedCount: result.modifiedCount || 0,
        };
    }, { requireAuth: true });
}
