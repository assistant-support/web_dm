// data/noti/actions/list.js
// Mục đích: Server Actions để quản lý notifications cho user

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction } from '@/lib/action-utils.js';
import Notification from '@/model/notification.model.js';
import { safeSerialize } from '@/lib/serialize.js';

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
        const isAdmin = user.role === 'admin';
        
        // Build query - Admin thấy tất cả thông báo, user thường chỉ thấy của mình
        const query = isAdmin ? {} : { userId: uid };
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

        // Get unread count - Admin đếm tất cả, user thường chỉ đếm của mình
        const unreadCountQuery = isAdmin ? { read: false } : { userId: uid, read: false };
        const unreadCount = await Notification.countDocuments(unreadCountQuery);

        // Serialize notifications using safeSerialize to handle all ObjectIds recursively
        const serializedNotifications = safeSerialize(notifications.map(n => ({
            ...n,
            _id: String(n._id),
            createdAt: n.createdAt ? (n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt)) : null,
            // Serialize metadata - safeSerialize will handle nested ObjectIds
            metadata: n.metadata ? safeSerialize(n.metadata) : undefined,
        })));

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
        const isAdmin = user.role === 'admin';

        // Update notification
        // Admin có thể đánh dấu đọc bất kỳ notification nào, user thường chỉ có thể đánh dấu của mình
        const query = isAdmin 
            ? { _id: notificationId }
            : { _id: notificationId, userId: uid };
            
        const result = await Notification.findOneAndUpdate(
            query,
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
        const isAdmin = user.role === 'admin';

        // Update all unread notifications
        // Admin đánh dấu tất cả, user thường chỉ đánh dấu của mình
        const query = isAdmin 
            ? { read: false }
            : { userId: uid, read: false };
            
        const result = await Notification.updateMany(
            query,
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
