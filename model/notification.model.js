// model/notification.model.js
/**
 * Tác dụng file: Định nghĩa Mongoose Model cho Notification - hệ thống thông báo trong ứng dụng.
 * 
 * Mục đích:
 * - Lưu trữ notifications cho từng user (in-app notifications)
 * - Hỗ trợ đánh dấu đã đọc/chưa đọc
 * - Tracking các events: task assigned, approval, comments, etc.
 * - Metadata cho deep linking đến task/project/comment
 * 
 * Indexes:
 * - userId: Để query notifications của một user
 * - read: Để filter unread notifications
 * - createdAt: Để sort theo thứ tự mới nhất
 * - Compound index (userId + read + createdAt): Optimize query chính
 */

import mongoose from 'mongoose';

/**
 * Notification Schema
 * 
 * @property {string} userId - External user ID (từ hệ thống auth)
 * @property {string} type - Loại notification (enum)
 * @property {string} message - Nội dung thông báo hiển thị cho user
 * @property {object} metadata - Dữ liệu bổ sung để deep linking và context
 * @property {boolean} read - Trạng thái đã đọc
 * @property {Date} createdAt - Thời gian tạo notification
 */
const NotificationSchema = new mongoose.Schema({
    /** External User ID của người nhận thông báo */
    userId: { 
        type: String, 
        required: true, 
        index: true,
    },

    /** Loại thông báo - dùng để phân biệt và render icon/action khác nhau */
    type: { 
        type: String, 
        required: true,
        enum: [
            'task.assigned',            // Được giao task mới
            'task.completed',           // Task được đánh dấu hoàn thành
            'task.approval.approved',   // Task được duyệt (tạo hoặc hoàn thành)
            'task.approval.rejected',   // Task bị từ chối
            'comment.mention',          // Được mention trong comment
            'project.member.added',     // Được thêm vào project
            'subtask.assigned',         // Được giao subtask
            'task.status.changed',      // Trạng thái task thay đổi
            
            // [NEW] Added types
            'task.created',             // Task mới được tạo (cho PM)
            'subtask.completed',        // Subtask hoàn thành
            'attachment.added',         // File đính kèm mới
            'team.member.added',        // Thêm thành viên vào team
            'team.member.removed',      // Xóa thành viên khỏi team
            'team.member.updated',      // Cập nhật role thành viên team
            'project.member.removed',   // Xóa thành viên khỏi project
            'project.member.updated',   // Cập nhật role thành viên project
        ],
    },

    /** Nội dung thông báo (đã format sẵn, ready to display) */
    message: { 
        type: String, 
        required: true,
    },

    /** Metadata để deep linking và hiển thị context */
    metadata: {
        _id: false,
        /** ID của task liên quan (nếu có) */
        taskId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Task',
        },
        /** ID của project liên quan (nếu có) */
        projectId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Project',
        },
        /** ID của team liên quan (nếu có) */
        teamId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Team',
        },
        /** ID của comment liên quan (nếu có) */
        commentId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Comment',
        },
        /** External User ID của người thực hiện action (actor) */
        actorId: { 
            type: String,
        },
    },

    /** Trạng thái đã đọc (false = unread, true = read) */
    read: { 
        type: Boolean, 
        default: false, 
        index: true,
    },

    /** Timestamp tạo notification */
    createdAt: { 
        type: Date, 
        default: Date.now, 
        index: true,
    },
}, {
    collection: 'notifications',
    timestamps: false, // Dùng createdAt custom thay vì timestamps mặc định
});

/**
 * Compound Index để optimize query chính:
 * - Query notifications của một user
 * - Filter theo trạng thái read/unread
 * - Sort theo thời gian mới nhất
 * 
 * Pattern query: Notification.find({ userId, read: false }).sort({ createdAt: -1 })
 */
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

/**
 * Static method: Tạo notification mới
 * Helper để tạo notification với validation
 */
NotificationSchema.statics.createNotification = async function(data) {
    const notification = new this(data);
    await notification.save();
    return notification;
};

/**
 * Static method: Đánh dấu tất cả notifications của user là đã đọc
 */
NotificationSchema.statics.markAllAsReadForUser = async function(userId) {
    return this.updateMany(
        { userId, read: false },
        { read: true }
    );
};

/**
 * Static method: Lấy số lượng unread notifications
 */
NotificationSchema.statics.getUnreadCount = async function(userId) {
    return this.countDocuments({ userId, read: false });
};

/**
 * Static method: Xóa notifications cũ (cleanup job)
 * @param {number} daysOld - Xóa notifications cũ hơn X ngày
 */
NotificationSchema.statics.cleanupOldNotifications = async function(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await this.deleteMany({
        createdAt: { $lt: cutoffDate },
        read: true, // Chỉ xóa những notification đã đọc
    });
    
    return result.deletedCount;
};

/**
 * Export model với pattern phòng tránh "OverwriteModelError" trong Next.js hot reload
 */
// [FIX] Delete existing model in development to ensure schema updates (like new enums) are applied immediately
if (process.env.NODE_ENV !== 'production' && mongoose.models.Notification) {
    delete mongoose.models.Notification;
}

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
