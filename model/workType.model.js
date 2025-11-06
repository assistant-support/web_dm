// @/model/workType.model.js
/**
 * Tác dụng file: Định nghĩa Mongoose Model cho WorkType (Loại công việc).
 * Quản lý các loại công việc mẫu (design_banner, video_edit, ...) với cấu hình mặc định.
 * Mỗi WorkType có thể gắn với Platforms, có defaultPoints, defaultChecklist, và cấu hình folder.
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db.js';

/**
 * @typedef {Object} DefaultChecklistItem
 * @property {string} content - Nội dung mục checklist mặc định
 */
const DefaultChecklistItemSchema = new mongoose.Schema({
    content: { 
        type: String, 
        required: true,
        trim: true
    },
}, { _id: false });

/**
 * Schema chính cho WorkType.
 * Lưu trữ cấu hình mẫu cho các loại công việc.
 */
const WorkTypeSchema = new mongoose.Schema({
    // Tên hiển thị loại công việc
    name: { 
        type: String, 
        required: true, 
        trim: true, 
        index: true 
    },
    
    // Mã định danh duy nhất (slug)
    code: { 
        type: String, 
        required: true, 
        trim: true, 
        unique: true,
        lowercase: true,
        index: true
    },
    
    // Mô tả loại công việc
    description: { 
        type: String,
        default: ''
    },

    // ==================== CONFIGURATION ====================
    
    // Platforms áp dụng (nếu chỉ định)
    platforms: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Platform', 
        index: true 
    }],

    // ==================== DEFAULTS ====================
    
    // Điểm mặc định khi tạo task với WorkType này
    defaultPoints: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    
    // Checklist mặc định (auto-populate khi tạo task)
    defaultChecklist: { 
        type: [DefaultChecklistItemSchema], 
        default: [] 
    },
    
    // Có tạo Drive folder mặc định cho task hay không
    defaultCreateFolder: { 
        type: Boolean, 
        default: false 
    },

    // ==================== STATUS & ORDERING ====================
    
    // Trạng thái hoạt động (soft-delete)
    isActive: { 
        type: Boolean, 
        default: true,
        index: true
    },
    
    // Thứ tự hiển thị trong UI
    order: { 
        type: Number, 
        default: 0,
        index: true
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
 * Index hợp chất để tối ưu truy vấn WorkType hoạt động theo thứ tự.
 * Ứng dụng: Lấy danh sách WorkType hiển thị trong dropdown.
 */
WorkTypeSchema.index({ isActive: 1, order: 1 });

// ==================== VIRTUALS ====================

/**
 * Virtual field: Kiểm tra WorkType có checklist mặc định hay không.
 * @returns {boolean} True nếu có ít nhất 1 checklist item
 */
WorkTypeSchema.virtual('hasDefaultChecklist').get(function () {
    return this.defaultChecklist && this.defaultChecklist.length > 0;
});

/**
 * Virtual field: Kiểm tra WorkType có gắn với Platform cụ thể hay không.
 * @returns {boolean} True nếu có ít nhất 1 platform
 */
WorkTypeSchema.virtual('hasPlatforms').get(function () {
    return this.platforms && this.platforms.length > 0;
});

// ==================== STATICS ====================

/**
 * Static: Tìm tất cả WorkType hoạt động.
 * @param {object} options - Tùy chọn
 * @param {boolean} [options.sortByOrder=true] - Sắp xếp theo order field
 * @returns {Promise<WorkType[]>} Danh sách WorkType
 */
WorkTypeSchema.statics.findActive = async function (options = {}) {
    await connectDB();
    
    const { sortByOrder = true } = options;
    
    const query = this.find({ isActive: true });
    
    if (sortByOrder) {
        query.sort({ order: 1, name: 1 });
    }
    
    return await query.lean().exec();
};

/**
 * Static: Tìm WorkType theo code.
 * @param {string} code - WorkType code (unique)
 * @returns {Promise<WorkType|null>} WorkType hoặc null
 */
WorkTypeSchema.statics.findByCode = async function (code) {
    await connectDB();
    
    return await this.findOne({ code }).lean().exec();
};

/**
 * Static: Tạo WorkType mới với validation.
 * @param {object} data - Dữ liệu WorkType
 * @param {string} data.name - Tên (bắt buộc)
 * @param {string} data.code - Mã (bắt buộc, unique)
 * @returns {Promise<WorkType>} WorkType đã tạo
 * @throws {Error} Nếu thiếu thông tin bắt buộc hoặc code đã tồn tại
 */
WorkTypeSchema.statics.createWorkType = async function (data) {
    await connectDB();
    
    if (!data.name) {
        throw new Error('WorkType name is required');
    }
    if (!data.code) {
        throw new Error('WorkType code is required');
    }
    
    const existing = await this.findOne({ code: data.code });
    if (existing) {
        throw new Error(`WorkType with code "${data.code}" already exists`);
    }
    
    return await this.create(data);
};

// ==================== METHODS ====================

/**
 * Method: Thêm checklist item mặc định.
 * @param {string} content - Nội dung checklist item
 * @returns {Promise<WorkType>} WorkType đã cập nhật
 */
WorkTypeSchema.methods.addChecklistItem = async function (content) {
    await connectDB();
    
    if (!content || !content.trim()) {
        throw new Error('Checklist item content is required');
    }
    
    this.defaultChecklist.push({ content: content.trim() });
    return await this.save();
};

/**
 * Method: Xóa checklist item theo index.
 * @param {number} index - Index của item cần xóa
 * @returns {Promise<WorkType>} WorkType đã cập nhật
 * @throws {Error} Nếu index không hợp lệ
 */
WorkTypeSchema.methods.removeChecklistItem = async function (index) {
    await connectDB();
    
    if (index < 0 || index >= this.defaultChecklist.length) {
        throw new Error('Invalid checklist item index');
    }
    
    this.defaultChecklist.splice(index, 1);
    return await this.save();
};

/**
 * Method: Deactivate WorkType (soft delete).
 * @returns {Promise<WorkType>} WorkType đã cập nhật
 */
WorkTypeSchema.methods.deactivate = async function () {
    await connectDB();
    
    this.isActive = false;
    return await this.save();
};

/**
 * Method: Activate WorkType.
 * @returns {Promise<WorkType>} WorkType đã cập nhật
 */
WorkTypeSchema.methods.activate = async function () {
    await connectDB();
    
    this.isActive = true;
    return await this.save();
};

// ==================== MIDDLEWARE ====================

/**
 * Pre-save middleware: Normalize code to lowercase.
 */
WorkTypeSchema.pre('save', function (next) {
    if (this.isModified('code')) {
        this.code = this.code.toLowerCase().trim();
    }
    next();
});

// ==================== MODEL EXPORT ====================

/**
 * Xóa model cũ khỏi cache để tránh lỗi HMR trong Next.js development.
 */
if (mongoose.models.WorkType) {
    delete mongoose.models.WorkType;
    delete mongoose.connection.models.WorkType;
}

/**
 * Export WorkType Model.
 * Model này quản lý các loại công việc mẫu với cấu hình mặc định.
 */
export default mongoose.model('WorkType', WorkTypeSchema);
