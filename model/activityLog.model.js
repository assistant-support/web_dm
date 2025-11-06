// @/model/activityLog.model.js
/**
 * Tác dụng file: Định nghĩa Mongoose Model cho ActivityLog (Nhật ký hoạt động).
 * Lưu trữ audit trail và feed sự kiện UI cho toàn hệ thống.
 * 
 * Tính năng:
 * - Ghi lại mọi hành động quan trọng (tạo, sửa, xóa, duyệt, ...)
 * - Phục vụ audit, timeline view, và notification
 * - Payload linh hoạt để lưu metadata bất kỳ
 * - Index theo actor, project, team, task để query nhanh
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db.js';

/**
 * Schema chính cho ActivityLog.
 * Lưu trữ nhật ký hoạt động của user trong hệ thống.
 */
const ActivityLogSchema = new mongoose.Schema({
    // Người thực hiện hành động (external user ID)
    actor: { 
        type: String, 
        required: true, 
        index: true 
    },
    
    // ==================== CONTEXT REFERENCES ====================
    
    // Project liên quan (tùy chọn)
    project: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project', 
        index: true 
    },
    
    // Team liên quan (tùy chọn)
    team: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Team', 
        index: true 
    },
    
    // Task liên quan (tùy chọn)
    task: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Task', 
        index: true 
    },

    // ==================== ACTION TYPE ====================
    
    /**
     * Loại hành động (string có cấu trúc).
     * Ví dụ:
     * - 'project.created', 'project.updated', 'project.deleted'
     * - 'task.created', 'task.assigned', 'task.completed'
     * - 'task.approval.requested', 'task.approval.approved'
     * - 'drive.folder.created', 'drive.file.uploaded'
     * - 'attachment.added', 'comment.created'
     * - 'team.member.added', 'team.member.removed'
     * - 'config.platform.created', 'config.worktype.updated'
     */
    type: { 
        type: String, 
        required: true,
        index: true
    },

    // ==================== PAYLOAD ====================
    
    /**
     * Payload linh hoạt chứa metadata chi tiết.
     * Ví dụ:
     * - { oldValue: 'todo', newValue: 'in_progress' } cho task.status.updated
     * - { fileName: 'document.pdf', fileSize: 1024 } cho attachment.added
     * - { memberRole: 'manager' } cho team.member.added
     */
    payload: { 
        type: Map, 
        of: mongoose.Schema.Types.Mixed, 
        default: () => new Map()
    },
}, {
    timestamps: true, // createdAt, updatedAt
    toJSON: { 
        transform: (_doc, ret) => { 
            delete ret.__v; 
        } 
    }
});

// ==================== INDEXES ====================

/**
 * Index hợp chất để tối ưu truy vấn activity của một task.
 * Ứng dụng: Timeline view của task.
 */
ActivityLogSchema.index({ task: 1, createdAt: -1 });

/**
 * Index hợp chất để tối ưu truy vấn activity của một project.
 * Ứng dụng: Project activity feed.
 */
ActivityLogSchema.index({ project: 1, createdAt: -1 });

/**
 * Index hợp chất để tối ưu truy vấn activity của một team.
 * Ứng dụng: Team activity feed.
 */
ActivityLogSchema.index({ team: 1, createdAt: -1 });

/**
 * Index hợp chất để tối ưu truy vấn activity của một user.
 * Ứng dụng: User activity history.
 */
ActivityLogSchema.index({ actor: 1, createdAt: -1 });

/**
 * Index để tối ưu truy vấn theo type.
 * Ứng dụng: Filter activity theo loại hành động.
 */
ActivityLogSchema.index({ type: 1, createdAt: -1 });

// ==================== VIRTUALS ====================

/**
 * Virtual field: Kiểm tra log có payload hay không.
 * @returns {boolean} True nếu payload không rỗng
 */
ActivityLogSchema.virtual('hasPayload').get(function () {
    return this.payload && this.payload.size > 0;
});

/**
 * Virtual field: Category của activity (phần trước dấu chấm đầu tiên).
 * Ví dụ: 'project.created' → 'project'
 * @returns {string} Category hoặc type nếu không có dấu chấm
 */
ActivityLogSchema.virtual('category').get(function () {
    if (!this.type) return '';
    const parts = this.type.split('.');
    return parts[0];
});

/**
 * Virtual field: Action của activity (phần sau dấu chấm cuối cùng).
 * Ví dụ: 'task.approval.approved' → 'approved'
 * @returns {string} Action hoặc type nếu không có dấu chấm
 */
ActivityLogSchema.virtual('action').get(function () {
    if (!this.type) return '';
    const parts = this.type.split('.');
    return parts[parts.length - 1];
});

// ==================== STATICS ====================

/**
 * Static: Tìm activity logs theo task.
 * @param {string|mongoose.Types.ObjectId} taskId - Task ID
 * @param {object} options - Tùy chọn
 * @param {number} [options.limit=50] - Giới hạn số lượng
 * @param {number} [options.skip] - Bỏ qua số lượng
 * @returns {Promise<ActivityLog[]>} Danh sách activity logs
 */
ActivityLogSchema.statics.findByTask = async function (taskId, options = {}) {
    await connectDB();
    
    const { limit = 50, skip } = options;
    
    const query = this.find({ task: taskId }).sort({ createdAt: -1 });
    
    if (skip) query.skip(skip);
    if (limit) query.limit(limit);
    
    return await query.lean().exec();
};

/**
 * Static: Tìm activity logs theo project.
 * @param {string|mongoose.Types.ObjectId} projectId - Project ID
 * @param {object} options - Tùy chọn
 * @param {number} [options.limit=50] - Giới hạn số lượng
 * @returns {Promise<ActivityLog[]>} Danh sách activity logs
 */
ActivityLogSchema.statics.findByProject = async function (projectId, options = {}) {
    await connectDB();
    
    const { limit = 50 } = options;
    
    return await this.find({ project: projectId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
};

/**
 * Static: Tìm activity logs theo team.
 * @param {string|mongoose.Types.ObjectId} teamId - Team ID
 * @param {object} options - Tùy chọn
 * @param {number} [options.limit=50] - Giới hạn số lượng
 * @returns {Promise<ActivityLog[]>} Danh sách activity logs
 */
ActivityLogSchema.statics.findByTeam = async function (teamId, options = {}) {
    await connectDB();
    
    const { limit = 50 } = options;
    
    return await this.find({ team: teamId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
};

/**
 * Static: Tìm activity logs theo actor.
 * @param {string} userId - External User ID
 * @param {object} options - Tùy chọn
 * @param {number} [options.limit=50] - Giới hạn số lượng
 * @returns {Promise<ActivityLog[]>} Danh sách activity logs
 */
ActivityLogSchema.statics.findByActor = async function (userId, options = {}) {
    await connectDB();
    
    const { limit = 50 } = options;
    
    return await this.find({ actor: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
};

/**
 * Static: Tìm activity logs theo type pattern.
 * @param {string} typePattern - Type pattern (VD: 'task.', 'project.created')
 * @param {object} options - Tùy chọn
 * @param {number} [options.limit=100] - Giới hạn số lượng
 * @returns {Promise<ActivityLog[]>} Danh sách activity logs
 */
ActivityLogSchema.statics.findByType = async function (typePattern, options = {}) {
    await connectDB();
    
    const { limit = 100 } = options;
    
    return await this.find({ type: new RegExp(`^${typePattern}`) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
};

/**
 * Static: Tạo activity log mới.
 * @param {object} data - Dữ liệu activity log
 * @param {string} data.actor - External User ID (bắt buộc)
 * @param {string} data.type - Activity type (bắt buộc)
 * @returns {Promise<ActivityLog>} Activity log đã tạo
 * @throws {Error} Nếu thiếu thông tin bắt buộc
 */
ActivityLogSchema.statics.createLog = async function (data) {
    await connectDB();
    
    if (!data.actor) {
        throw new Error('Actor is required');
    }
    if (!data.type) {
        throw new Error('Activity type is required');
    }
    
    return await this.create(data);
};

// ==================== METHODS ====================

/**
 * Method: Thêm hoặc cập nhật payload field.
 * @param {string} key - Payload key
 * @param {any} value - Payload value
 * @returns {Promise<ActivityLog>} Activity log đã cập nhật
 */
ActivityLogSchema.methods.setPayload = async function (key, value) {
    await connectDB();
    
    if (!this.payload) {
        this.payload = new Map();
    }
    
    this.payload.set(key, value);
    return await this.save();
};

/**
 * Method: Lấy payload field.
 * @param {string} key - Payload key
 * @returns {any} Payload value hoặc undefined
 */
ActivityLogSchema.methods.getPayload = function (key) {
    if (!this.payload) return undefined;
    return this.payload.get(key);
};

// ==================== MIDDLEWARE ====================

/**
 * Pre-save middleware: Validate type format.
 * Type nên có dạng 'category.action' hoặc 'category.subcategory.action'
 */
ActivityLogSchema.pre('save', function (next) {
    if (this.type && !this.type.includes('.')) {
        console.warn(`ActivityLog type "${this.type}" should follow format: category.action`);
    }
    next();
});

// ==================== MODEL EXPORT ====================

/**
 * Xóa model cũ khỏi cache để tránh lỗi HMR trong Next.js development.
 */
if (mongoose.models.ActivityLog) {
    delete mongoose.models.ActivityLog;
    delete mongoose.connection.models.ActivityLog;
}

/**
 * Export ActivityLog Model.
 * Model này lưu trữ nhật ký hoạt động cho audit trail và activity feed.
 */
export default mongoose.model('ActivityLog', ActivityLogSchema);
