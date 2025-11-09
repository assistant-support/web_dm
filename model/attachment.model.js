// @/model/attachment.model.js
/**
 * Tác dụng file: Định nghĩa Mongoose Model cho Attachment (File đính kèm).
 * Quản lý metadata file từ Google Drive, gắn vào Project hoặc Task.
 * Hỗ trợ soft-delete, phân loại file kind, và tự động tăng counters.
 * 
 * Tính năng:
 * - Lưu metadata Drive: fileId, folderId, name, mimeType, size, links
 * - Phân loại: kind (image/video/doc/other), workType, platforms
 * - Soft delete với deletedAt
 * - Auto-increment: attachmentsCount (Task), assetsCount (Project)
 */

import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { STORAGE_PROVIDER, FILE_KIND } from '@/model/common/enums.js';
import { connectDB } from '@/lib/db.js';

/**
 * Schema chính cho Attachment.
 * Lưu trữ metadata file từ Drive, gắn vào Project/Task.
 */
const AttachmentSchema = new mongoose.Schema({
    // ==================== OWNERSHIP ====================
    
    // Gắn vào Project (tài liệu chung)
    project: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project', 
        index: true 
    },
    
    // Gắn vào Task (file task cụ thể)
    task: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Task', 
        index: true 
    },

    // Tác giả upload (external user ID)
    author: { 
        type: String, 
        required: true, 
        index: true 
    },

    // ==================== STORAGE ====================
    
    // Nhà cung cấp lưu trữ (hiện tại chỉ Drive)
    storage: {
        type: String,
        enum: Object.values(STORAGE_PROVIDER),
        default: STORAGE_PROVIDER.DRIVE,
    },

    // ==================== GOOGLE DRIVE METADATA ====================
    
    // Google Drive File ID (bắt buộc)
    driveFileId: { 
        type: String, 
        required: true,
        index: true 
    },
    
    // Folder hiện tại chứa file
    driveFolderId: { 
        type: String, 
        index: true 
    },
    
    // Tên file hiển thị
    driveName: { 
        type: String,
        required: true
    },
    
    // MIME type (VD: 'image/png', 'video/mp4')
    mimeType: { 
        type: String,
        index: true
    },
    
    // Kích thước file (bytes)
    size: { 
        type: Number,
        min: 0
    },
    
    // Link xem file trên Drive
    webViewLink: { 
        type: String 
    },
    
    // Link tải file
    webContentLink: { 
        type: String 
    },

    // ==================== CLASSIFICATION ====================
    
    // Phân loại file (image/video/doc/other)
    kind: { 
        type: String, 
        enum: Object.values(FILE_KIND), 
        default: FILE_KIND.OTHER,
        index: true
    },
    
    // Nhãn tùy chỉnh
    label: { 
        type: String 
    },

    // ==================== REFERENCES ====================
    
    // WorkType reference (tùy chọn)
    workType: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'WorkType', 
        index: true 
    },
    
    // Platforms reference (tùy chọn)
    platforms: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Platform', 
        index: true 
    }],

    // ==================== AUDIT & ACCESS ====================

    // Người chỉnh sửa gần nhất
    lastModifiedBy: {
        type: String,
        index: true,
        default: null,
    },

    // Người xóa (soft delete)
    deletedBy: {
        type: String,
        index: true,
        default: null,
    },

    // Token truy cập công khai (ẩn driveFileId)
    publicToken: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => randomUUID(),
    },

    // ==================== SOFT DELETE ====================
    
    // Thời điểm xóa mềm
    deletedAt: { 
        type: Date, 
        default: null, 
        index: true 
    },
}, {
    timestamps: true, // createdAt, updatedAt
    toJSON: { 
        transform: (_doc, ret) => { 
            delete ret.__v; 
        } 
    },
});

// ==================== INDEXES ====================

/**
 * Index hợp chất để tối ưu truy vấn attachment theo project/task.
 * Ứng dụng: Lấy file của project/task, loại bỏ file đã xóa.
 */
AttachmentSchema.index({ project: 1, task: 1, deletedAt: 1, createdAt: -1 });

/**
 * Index để tối ưu truy vấn theo thời gian tạo.
 * Ứng dụng: List view sắp xếp theo mới nhất.
 */
AttachmentSchema.index({ createdAt: -1 });

/**
 * Index để tối ưu truy vấn file chưa xóa.
 * Ứng dụng: Lọc file active (deletedAt = null).
 */
AttachmentSchema.index({ deletedAt: 1 }, { 
    partialFilterExpression: { deletedAt: { $eq: null } } 
});

/**
 * Index để tối ưu truy vấn theo kind.
 * Ứng dụng: Lọc file theo loại (image, video, doc).
 */
AttachmentSchema.index({ kind: 1, deletedAt: 1 });
AttachmentSchema.index({ publicToken: 1 });

// ==================== VIRTUALS ====================

/**
 * Virtual field: Kiểm tra file đã bị xóa hay chưa.
 * @returns {boolean} True nếu deletedAt có giá trị
 */
AttachmentSchema.virtual('isDeleted').get(function () {
    return !!this.deletedAt;
});

/**
 * Virtual field: Kiểm tra file có phân loại platforms hay không.
 * @returns {boolean} True nếu có ít nhất 1 platform
 */
AttachmentSchema.virtual('hasPlatforms').get(function () {
    return this.platforms && this.platforms.length > 0;
});

/**
 * Virtual field: File extension từ driveName.
 * @returns {string} Extension (VD: 'png', 'mp4') hoặc ''
 */
AttachmentSchema.virtual('extension').get(function () {
    if (!this.driveName) return '';
    const parts = this.driveName.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
});

// ==================== STATICS ====================

/**
 * Static: Tìm tất cả attachment của một project.
 * @param {string|mongoose.Types.ObjectId} projectId - Project ID
 * @param {boolean} includeDeleted - Có bao gồm file đã xóa không (mặc định: false)
 * @returns {Promise<Attachment[]>} Danh sách attachment
 */
AttachmentSchema.statics.findByProject = async function (projectId, includeDeleted = false) {
    await connectDB();
    
    const query = { project: projectId };
    if (!includeDeleted) {
        query.deletedAt = null;
    }
    
    return await this.find(query).sort({ createdAt: -1 }).lean().exec();
};

/**
 * Static: Tìm tất cả attachment của một task.
 * @param {string|mongoose.Types.ObjectId} taskId - Task ID
 * @param {boolean} includeDeleted - Có bao gồm file đã xóa không (mặc định: false)
 * @returns {Promise<Attachment[]>} Danh sách attachment
 */
AttachmentSchema.statics.findByTask = async function (taskId, includeDeleted = false) {
    await connectDB();
    
    const query = { task: taskId };
    if (!includeDeleted) {
        query.deletedAt = null;
    }
    
    return await this.find(query).sort({ createdAt: -1 }).lean().exec();
};

/**
 * Static: Tìm attachment theo Drive File ID.
 * @param {string} driveFileId - Google Drive File ID
 * @returns {Promise<Attachment|null>} Attachment hoặc null
 */
AttachmentSchema.statics.findByDriveFileId = async function (driveFileId) {
    await connectDB();
    
    return await this.findOne({ driveFileId }).lean().exec();
};

/**
 * Static: Tạo attachment mới với auto-increment counter.
 * @param {object} data - Dữ liệu attachment
 * @returns {Promise<Attachment>} Attachment đã tạo
 * @throws {Error} Nếu thiếu thông tin bắt buộc hoặc không có project/task
 */
AttachmentSchema.statics.createAttachment = async function (data) {
    await connectDB();
    
    if (!data.project && !data.task) {
        throw new Error('Attachment must belong to a project or task');
    }
    if (!data.driveFileId) {
        throw new Error('Drive File ID is required');
    }
    if (!data.author) {
        throw new Error('Author is required');
    }
    
    const attachment = await this.create(data);
    
    // Tăng counter
    try {
        if (attachment.task) {
            await mongoose.model('Task').findByIdAndUpdate(
                attachment.task,
                { $inc: { attachmentsCount: 1 } },
                { lean: true }
            );
        } else if (attachment.project) {
            await mongoose.model('Project').findByIdAndUpdate(
                attachment.project,
                { $inc: { assetsCount: 1 } },
                { lean: true }
            );
        }
    } catch (err) {
        console.error('Failed to increment attachment counter:', err);
    }
    
    return attachment;
};

// ==================== METHODS ====================

/**
 * Method: Soft delete attachment.
 * @returns {Promise<Attachment>} Attachment đã cập nhật
 */
AttachmentSchema.methods.softDelete = async function () {
    await connectDB();
    
    if (this.deletedAt) {
        throw new Error('Attachment already deleted');
    }
    
    this.deletedAt = new Date();
    
    // Giảm counter
    try {
        if (this.task) {
            await mongoose.model('Task').findByIdAndUpdate(
                this.task,
                { $inc: { attachmentsCount: -1 } },
                { lean: true }
            );
        } else if (this.project) {
            await mongoose.model('Project').findByIdAndUpdate(
                this.project,
                { $inc: { assetsCount: -1 } },
                { lean: true }
            );
        }
    } catch (err) {
        console.error('Failed to decrement attachment counter:', err);
    }
    
    return await this.save();
};

/**
 * Method: Khôi phục attachment đã xóa.
 * @returns {Promise<Attachment>} Attachment đã cập nhật
 */
AttachmentSchema.methods.restore = async function () {
    await connectDB();
    
    if (!this.deletedAt) {
        throw new Error('Attachment is not deleted');
    }
    
    this.deletedAt = null;
    
    // Tăng counter
    try {
        if (this.task) {
            await mongoose.model('Task').findByIdAndUpdate(
                this.task,
                { $inc: { attachmentsCount: 1 } },
                { lean: true }
            );
        } else if (this.project) {
            await mongoose.model('Project').findByIdAndUpdate(
                this.project,
                { $inc: { assetsCount: 1 } },
                { lean: true }
            );
        }
    } catch (err) {
        console.error('Failed to increment attachment counter:', err);
    }
    
    return await this.save();
};

/**
 * Method: Cập nhật Drive folder ID.
 * @param {string} newFolderId - New Drive Folder ID
 * @returns {Promise<Attachment>} Attachment đã cập nhật
 */
AttachmentSchema.methods.moveToFolder = async function (newFolderId) {
    await connectDB();
    
    this.driveFolderId = newFolderId;
    return await this.save();
};

// ==================== MIDDLEWARE ====================

/**
 * Pre-validate middleware: Đảm bảo có ít nhất project hoặc task.
 */
AttachmentSchema.pre('validate', function (next) {
    if (!this.project && !this.task) {
        return next(new Error('Attachment must belong to a project or a task'));
    }
    next();
});

/**
 * Pre-save middleware: Tự động xác định kind từ mimeType nếu chưa có.
 */
AttachmentSchema.pre('save', function (next) {
    if (this.isNew && this.mimeType && !this.kind) {
        if (this.mimeType.startsWith('image/')) {
            this.kind = FILE_KIND.IMAGE;
        } else if (this.mimeType.startsWith('video/')) {
            this.kind = FILE_KIND.VIDEO;
        } else if (this.mimeType.includes('document') || this.mimeType.includes('pdf')) {
            this.kind = FILE_KIND.DOC;
        } else {
            this.kind = FILE_KIND.OTHER;
        }
    }
    next();
});

// ==================== MODEL EXPORT ====================

/**
 * Xóa model cũ khỏi cache để tránh lỗi HMR trong Next.js development.
 */
if (mongoose.models.Attachment) {
    delete mongoose.models.Attachment;
    delete mongoose.connection.models.Attachment;
}

/**
 * Export Attachment Model.
 * Model này quản lý metadata file từ Drive, gắn vào Project/Task với soft-delete support.
 */
export default mongoose.model('Attachment', AttachmentSchema);
