// @/model/platform.model.js
/**
 * Tác dụng file: Định nghĩa Mongoose Model cho Platform (Nền tảng).
 * Quản lý danh mục nền tảng phân phối nội dung (Facebook, TikTok, YouTube, Web, App, ...).
 * Sử dụng làm reference trong Project, Task, WorkType, Attachment để phân loại.
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db.js';

/**
 * Schema chính cho Platform.
 * Lưu trữ thông tin nền tảng với code unique.
 */
const PlatformSchema = new mongoose.Schema({
    // Tên hiển thị nền tảng
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
    
    // Mô tả nền tảng
    description: { 
        type: String,
        default: ''
    },

    // ==================== UI CONFIGURATION ====================
    
    // Màu sắc hiển thị (hex code)
    color: { 
        type: String,
        match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    },
    
    // Icon/logo (URL hoặc icon name)
    icon: { 
        type: String 
    },
    
    // Thứ tự hiển thị trong UI
    order: { 
        type: Number, 
        default: 0,
        index: true
    },

    // ==================== STATUS ====================
    
    // Trạng thái hoạt động (soft-delete)
    isActive: { 
        type: Boolean, 
        default: true,
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
 * Index hợp chất để tối ưu truy vấn Platform hoạt động theo thứ tự.
 * Ứng dụng: Lấy danh sách Platform hiển thị trong dropdown.
 */
PlatformSchema.index({ isActive: 1, order: 1 });

// ==================== VIRTUALS ====================

/**
 * Virtual field: Kiểm tra Platform có cấu hình UI đầy đủ hay không.
 * @returns {boolean} True nếu có cả color và icon
 */
PlatformSchema.virtual('hasFullUIConfig').get(function () {
    return !!this.color && !!this.icon;
});

// ==================== STATICS ====================

/**
 * Static: Tìm tất cả Platform hoạt động.
 * @param {object} options - Tùy chọn
 * @param {boolean} [options.sortByOrder=true] - Sắp xếp theo order field
 * @returns {Promise<Platform[]>} Danh sách Platform
 */
PlatformSchema.statics.findActive = async function (options = {}) {
    await connectDB();
    
    const { sortByOrder = true } = options;
    
    const query = this.find({ isActive: true });
    
    if (sortByOrder) {
        query.sort({ order: 1, name: 1 });
    }
    
    return await query.lean().exec();
};

/**
 * Static: Tìm Platform theo code.
 * @param {string} code - Platform code (unique)
 * @returns {Promise<Platform|null>} Platform hoặc null
 */
PlatformSchema.statics.findByCode = async function (code) {
    await connectDB();
    
    return await this.findOne({ code }).lean().exec();
};

/**
 * Static: Tạo Platform mới với validation.
 * @param {object} data - Dữ liệu Platform
 * @param {string} data.name - Tên (bắt buộc)
 * @param {string} data.code - Mã (bắt buộc, unique)
 * @returns {Promise<Platform>} Platform đã tạo
 * @throws {Error} Nếu thiếu thông tin bắt buộc hoặc code đã tồn tại
 */
PlatformSchema.statics.createPlatform = async function (data) {
    await connectDB();
    
    if (!data.name) {
        throw new Error('Platform name is required');
    }
    if (!data.code) {
        throw new Error('Platform code is required');
    }
    
    const existing = await this.findOne({ code: data.code });
    if (existing) {
        throw new Error(`Platform with code "${data.code}" already exists`);
    }
    
    return await this.create(data);
};

// ==================== METHODS ====================

/**
 * Method: Deactivate Platform (soft delete).
 * @returns {Promise<Platform>} Platform đã cập nhật
 */
PlatformSchema.methods.deactivate = async function () {
    await connectDB();
    
    this.isActive = false;
    return await this.save();
};

/**
 * Method: Activate Platform.
 * @returns {Promise<Platform>} Platform đã cập nhật
 */
PlatformSchema.methods.activate = async function () {
    await connectDB();
    
    this.isActive = true;
    return await this.save();
};

/**
 * Method: Cập nhật cấu hình UI (color, icon).
 * @param {string} color - Hex color code (VD: '#FF5733')
 * @param {string} icon - Icon identifier
 * @returns {Promise<Platform>} Platform đã cập nhật
 */
PlatformSchema.methods.updateUIConfig = async function (color, icon) {
    await connectDB();
    
    if (color) this.color = color;
    if (icon) this.icon = icon;
    
    return await this.save();
};

// ==================== MIDDLEWARE ====================

/**
 * Pre-save middleware: Normalize code to lowercase.
 */
PlatformSchema.pre('save', function (next) {
    if (this.isModified('code')) {
        this.code = this.code.toLowerCase().trim();
    }
    next();
});

/**
 * Pre-save middleware: Validate color format if provided.
 */
PlatformSchema.pre('save', function (next) {
    if (this.color && !this.color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
        return next(new Error('Invalid color format. Must be hex code (e.g., #FF5733)'));
    }
    next();
});

// ==================== MODEL EXPORT ====================

/**
 * Xóa model cũ khỏi cache để tránh lỗi HMR trong Next.js development.
 */
if (mongoose.models.Platform) {
    delete mongoose.models.Platform;
    delete mongoose.connection.models.Platform;
}

/**
 * Export Platform Model.
 * Model này quản lý danh mục nền tảng phân phối nội dung.
 */
export default mongoose.model('Platform', PlatformSchema);
