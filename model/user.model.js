// @/model/user.model.js
/**
 * Tác dụng file: Định nghĩa Mongoose Model cho User (Người dùng).
 * Quản lý hồ sơ người dùng riêng của app, liên kết với Auth Provider qua externalUserId.
 * Lưu trữ preferences, thông tin cached từ OAuth, và metadata người dùng.
 * 
 * LƯU Ý: MongoDB Map không chấp nhận key có dấu chấm '.' 
 * → Encode '.' thành '__' khi lưu preferences (ví dụ: 'ui.compact' -> 'ui__compact')
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db.js';

/**
 * Encode key để an toàn với MongoDB Map.
 * MongoDB không cho phép key chứa dấu chấm '.' trong Map.
 * @param {string} key - Key cần encode
 * @returns {string} Key đã được encode (thay '.' bằng '__')
 */
function encodeKey(key = '') {
    return String(key).replaceAll('.', '__');
}

/**
 * Decode key từ MongoDB Map về dạng gốc.
 * @param {string} key - Key đã encode
 * @returns {string} Key gốc (thay '__' bằng '.')
 */
function decodeKey(key = '') {
    return String(key).replaceAll('__', '.');
}

/**
 * Schema chính cho User (AppUser).
 * Lưu trữ thông tin người dùng của ứng dụng, liên kết với Auth Provider.
 */
const AppUserSchema = new mongoose.Schema(
    {
        // External User ID từ Auth Provider (Next-Auth, OAuth, Zalo, etc.) - UNIQUE
        externalUserId: { 
            type: String, 
            required: true, 
            unique: true, 
            index: true 
        },
        
        // OAuth 2.0 Subject ID (sub claim) - UNIQUE khi có
        oauthSub: { 
            type: String, 
            unique: true, 
            sparse: true, // Chỉ index khi có giá trị
            index: true 
        },

        // ==================== CACHED OAUTH INFO ====================
        // Thông tin từ OAuth được cache để tăng performance, tránh gọi API nhiều lần
        
        email: { 
            type: String, 
            trim: true,
            lowercase: true,
            index: true,
            sparse: true
        },
        
        name: { 
            type: String, 
            trim: true,
            default: ''
        },
        
        firstName: { 
            type: String, 
            trim: true,
            default: ''
        },
        
        lastName: { 
            type: String, 
            trim: true,
            default: ''
        },
        
        avatar: { 
            type: String, 
            trim: true,
            default: ''
        },

        // ==================== APP-SPECIFIC FIELDS ====================
        
        // Vai trò trong hệ thống
        role: { 
            type: String, 
            enum: ['admin', 'manager', 'member'], 
            default: 'member',
            index: true
        },
        
        // Trạng thái hoạt động (soft-delete/disable)
        isActive: { 
            type: Boolean, 
            default: true,
            index: true
        },
        
        // Chức danh công việc
        jobTitle: { 
            type: String, 
            trim: true,
            default: ''
        },
        
        // Năng lực tải công việc (giờ/tuần)
        capacityHoursPerWeek: { 
            type: Number, 
            default: 40,
            min: 0,
            max: 168 // Max 24h x 7 days
        },
        
        // Màu hiển thị cho user trong UI (avatar, labels, etc.)
        color: { 
            type: String, 
            trim: true,
            default: '#3B82F6' // Blue-500
        },
        
        // UID tùy chỉnh (có thể dùng cho integrations)
        uid: {
            type: String,
            trim: true,
            sparse: true,
            index: true
        },
        
        // ==================== ZALO INTEGRATION ====================
        
        // Tên Zalo (từ Zalo OAuth)
        zaloname: {
            type: String,
            trim: true,
            default: ''
        },
        
        // Avatar URL từ Zalo
        zaloavt: {
            type: String,
            trim: true,
            default: ''
        },
        
        // ==================== USER PREFERENCES ====================
        // Map lưu trữ preferences của user (key-value pairs)
        // LƯU Ý: Key PHẢI được encode trước khi lưu (thay '.' bằng '__')
        preferences: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: () =>
                new Map([
                    [encodeKey('ui.compact'), false],
                    [encodeKey('notify.email'), true],
                    [encodeKey('notify.inapp'), true],
                    [encodeKey('kanban.groupBy'), 'status'],
                ]),
        },

        // Bật/tắt tài khoản trong app (giống isActive nhưng semantic khác)
        isEnabled: { 
            type: Boolean, 
            default: true,
            index: true
        },
    },
    {
        timestamps: true, // Tự động thêm createdAt và updatedAt
        toJSON: { 
            transform: (_doc, ret) => { 
                delete ret.__v; // Loại bỏ version key
            } 
        }
    }
);

// ==================== INDEXES ====================

/**
 * Index hợp chất để tối ưu truy vấn tìm user theo role và trạng thái.
 * Ứng dụng: Lấy danh sách admin/manager đang hoạt động.
 */
AppUserSchema.index({ role: 1, isActive: 1 });

/**
 * Index hợp chất để tối ưu truy vấn tìm user theo email và trạng thái.
 * Ứng dụng: Login, forgot password, etc.
 */
AppUserSchema.index({ email: 1, isActive: 1 });

// ==================== VIRTUALS ====================

/**
 * Virtual field: Full name của user.
 * @returns {string} Full name (firstName + lastName) hoặc name
 */
AppUserSchema.virtual('fullName').get(function () {
    if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.lastName}`.trim();
    }
    return this.name || this.email || 'Unknown User';
});

/**
 * Virtual field: Display name ưu tiên (Zalo name > Full name > Email).
 * @returns {string} Display name
 */
AppUserSchema.virtual('displayName').get(function () {
    return this.zaloname || this.fullName || this.email || 'Unknown User';
});

/**
 * Virtual field: Kiểm tra user có quyền admin hay không.
 * @returns {boolean} True nếu user là admin
 */
AppUserSchema.virtual('isAdmin').get(function () {
    return this.role === 'admin';
});

/**
 * Virtual field: Kiểm tra user có quyền quản lý hay không.
 * @returns {boolean} True nếu user là admin hoặc manager
 */
AppUserSchema.virtual('canManage').get(function () {
    return this.role === 'admin' || this.role === 'manager';
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Sanitize preference keys trước khi lưu để đảm bảo không có key chứa dấu chấm.
 * @param {Document} doc - Document cần sanitize
 */
function sanitizePrefKeys(doc) {
    if (!doc?.preferences || !(doc.preferences instanceof Map)) return;
    
    let changed = false;
    const nextMap = new Map();
    
    for (const [key, value] of doc.preferences.entries()) {
        const safeKey = key.includes('.') ? encodeKey(key) : key;
        if (safeKey !== key) changed = true;
        nextMap.set(safeKey, value);
    }
    
    if (changed) {
        doc.preferences = nextMap;
    }
}

// ==================== MIDDLEWARE (HOOKS) ====================

/**
 * Pre-validate middleware: Sanitize preference keys trước khi validate.
 */
AppUserSchema.pre('validate', function () {
    sanitizePrefKeys(this);
});

/**
 * Pre-save middleware: Sanitize preference keys trước khi save.
 */
AppUserSchema.pre('save', function () {
    sanitizePrefKeys(this);
});

// ==================== INSTANCE METHODS ====================

/**
 * Lấy giá trị preference theo key (tự động decode key).
 * @param {string} key - Key cần lấy (có thể có dấu chấm, sẽ tự động encode)
 * @param {*} defaultValue - Giá trị mặc định nếu không tìm thấy
 * @returns {*} Giá trị preference
 */
AppUserSchema.methods.getPreference = function (key, defaultValue = null) {
    const encodedKey = encodeKey(key);
    return this.preferences?.get(encodedKey) ?? defaultValue;
};

/**
 * Set giá trị preference theo key (tự động encode key).
 * @param {string} key - Key cần set (có thể có dấu chấm, sẽ tự động encode)
 * @param {*} value - Giá trị cần set
 * @returns {Promise<User>} User document sau khi cập nhật
 */
AppUserSchema.methods.setPreference = async function (key, value) {
    await connectDB();
    
    if (!this.preferences) {
        this.preferences = new Map();
    }
    
    const encodedKey = encodeKey(key);
    this.preferences.set(encodedKey, value);
    
    return await this.save();
};

/**
 * Xóa một preference theo key.
 * @param {string} key - Key cần xóa
 * @returns {Promise<User>} User document sau khi cập nhật
 */
AppUserSchema.methods.deletePreference = async function (key) {
    await connectDB();
    
    if (!this.preferences) return this;
    
    const encodedKey = encodeKey(key);
    this.preferences.delete(encodedKey);
    
    return await this.save();
};

/**
 * Cập nhật thông tin cached từ OAuth Provider.
 * @param {Object} oauthData - Dữ liệu từ OAuth (email, name, avatar, etc.)
 * @returns {Promise<User>} User document sau khi cập nhật
 */
AppUserSchema.methods.updateFromOAuth = async function (oauthData) {
    await connectDB();
    
    if (oauthData.email) this.email = oauthData.email;
    if (oauthData.name) this.name = oauthData.name;
    if (oauthData.firstName) this.firstName = oauthData.firstName;
    if (oauthData.lastName) this.lastName = oauthData.lastName;
    if (oauthData.avatar || oauthData.picture) {
        this.avatar = oauthData.avatar || oauthData.picture;
    }
    
    return await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Tìm hoặc tạo user theo externalUserId.
 * Helper để đảm bảo user luôn tồn tại trong DB khi login.
 * @param {string} externalUserId - External User ID từ Auth Provider
 * @param {Object} initialData - Dữ liệu khởi tạo nếu cần tạo mới (optional)
 * @returns {Promise<Object>} User object (lean)
 */
AppUserSchema.statics.ensureForExternal = async function (externalUserId, initialData = {}) {
    await connectDB();
    
    let doc = await this.findOne({ externalUserId }).lean();
    if (doc) return doc;
    
    const created = await this.create({ 
        externalUserId,
        ...initialData 
    });
    
    return created.toObject();
};

/**
 * Tìm user theo email (case-insensitive).
 * @param {string} email - Email cần tìm
 * @returns {Promise<User|null>} User document hoặc null
 */
AppUserSchema.statics.findByEmail = async function (email) {
    await connectDB();
    
    return await this.findOne({ 
        email: email.toLowerCase().trim() 
    }).exec();
};

/**
 * Tìm tất cả user theo role.
 * @param {string} role - Role cần tìm ('admin', 'manager', 'member')
 * @param {boolean} activeOnly - Chỉ lấy user đang hoạt động (mặc định: true)
 * @returns {Promise<User[]>} Danh sách user
 */
AppUserSchema.statics.findByRole = async function (role, activeOnly = true) {
    await connectDB();
    
    const query = { role };
    if (activeOnly) {
        query.isActive = true;
    }
    
    return await this.find(query).sort({ name: 1 }).lean().exec();
};

/**
 * Lấy danh sách tất cả admin đang hoạt động.
 * @returns {Promise<User[]>} Danh sách admin
 */
AppUserSchema.statics.findAdmins = async function () {
    return await this.findByRole('admin', true);
};

/**
 * Lấy danh sách tất cả manager đang hoạt động.
 * @returns {Promise<User[]>} Danh sách manager
 */
AppUserSchema.statics.findManagers = async function () {
    return await this.findByRole('manager', true);
};

// ==================== MODEL EXPORT ====================

/**
 * Xóa model cũ khỏi cache để tránh lỗi HMR trong Next.js development.
 */
if (mongoose.models.AppUser) {
    delete mongoose.models.AppUser;
}

/**
 * Export User Model (AppUser).
 * Model này quản lý hồ sơ người dùng của ứng dụng.
 */
export default mongoose.model('AppUser', AppUserSchema);
