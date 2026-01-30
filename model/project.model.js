// @/model/project.model.js
/**
 * Tác dụng file: Định nghĩa Mongoose Model cho Project (Dự án).
 * Quản lý dự án thuộc Team, membership (thành viên), vai trò, timeline, và cấu trúc Drive folder theo tháng.
 * Mỗi project có thể có 12 folder Drive tương ứng với 12 tháng trong năm để tổ chức tài liệu.
 */

import mongoose from 'mongoose';
import { PROJECT_ROLE, PRIORITY } from '@/model/common/enums.js';
import { connectDB } from '@/lib/db.js';
import { normalizeText } from '@/lib/text-normalize.js';

/**
 * @typedef {Object} ProjectMembership
 * @property {string} userId - External User ID
 * @property {string} role - Vai trò trong dự án (PROJECT_ROLE enum)
 * @property {Date} createdAt - Thời điểm thêm vào dự án
 * @property {Date} updatedAt - Thời điểm cập nhật membership
 */
const ProjectMembershipSchema = new mongoose.Schema(
    {
        // External User ID
        userId: { 
            type: String, 
            required: true, 
            index: true 
        },
        // Vai trò trong dự án
        role: { 
            type: String, 
            enum: Object.values(PROJECT_ROLE), 
            required: true,
            default: PROJECT_ROLE.MEMBER
        },
    },
    { 
        _id: false, // Sub-document không cần ID riêng
        timestamps: true 
    }
);

/**
 * @typedef {Object} MonthlyDriveFolder
 * @property {number} year - Năm (YYYY)
 * @property {number} month - Tháng (1-12)
 * @property {string} folderId - Google Drive Folder ID
 * @property {string} folderName - Tên folder (ví dụ: "2025-10")
 */
const MonthlyDriveFolderSchema = new mongoose.Schema(
    {
        // Năm
        year: { 
            type: Number, 
            required: true,
            min: 2000,
            max: 2100
        },
        // Tháng (1 = January, 12 = December)
        month: { 
            type: Number, 
            required: true, 
            min: 1, 
            max: 12 
        },
        // Google Drive Folder ID
        folderId: { 
            type: String, 
            required: true 
        },
        // Tên folder hiển thị (ví dụ: "2025-10")
        folderName: { 
            type: String,
            default: ''
        },
    },
    { 
        _id: false // Sub-document không cần ID riêng
    }
);

/**
 * Schema chính cho Project.
 * Lưu trữ thông tin dự án, timeline, thành viên, cấu hình, và liên kết Drive folders.
 */
const ProjectSchema = new mongoose.Schema(
    {
        // Tên dự án (bắt buộc)
        name: { 
            type: String, 
            required: true, 
            trim: true, 
            index: true 
        },
        
        // Tên đã được normalize cho search (tự động tạo)
        name_normalized: {
            type: String,
            index: true
        },
        
        // Mô tả chi tiết dự án
        description: { 
            type: String,
            default: ''
        },

        // ==================== TEAM & MEMBERSHIP ====================
        
        // Team sở hữu dự án (tùy chọn - dự án có thể độc lập)
        team: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Team', 
            index: true 
        },
        
        // Danh sách thành viên và vai trò
        members: { 
            type: [ProjectMembershipSchema], 
            default: [] 
        },

        // ==================== STATUS & WORKFLOW ====================
        
        // Danh sách trạng thái tùy chỉnh cho tasks trong project
        statuses: { 
            type: [String], 
            default: ['todo', 'in-progress', 'review', 'done']
        },
        
        // Tags/nhãn cho dự án
        tags: { 
            type: [String], 
            default: [], 
            index: true 
        },
        
        // ==================== TIMELINE ====================
        
        // Ngày bắt đầu dự án
        startDate: { 
            type: Date,
            index: true
        },
        
        // Ngày kết thúc dự án
        dueDate: { 
            type: Date,
            index: true
        },
        
        // Độ ưu tiên dự án
        priority: { 
            type: String, 
            enum: Object.values(PRIORITY),
            default: PRIORITY.MEDIUM,
            index: true
        },
        
        // Trạng thái hoạt động (soft-delete)
        isActive: { 
            type: Boolean, 
            default: true,
            index: true
        },

        // ==================== GOOGLE DRIVE INTEGRATION ====================
        
        // Mảng lưu 12 folder Drive tương ứng 12 tháng trong năm
        // Khi tạo project, cần tạo 12 folder và lưu metadata vào đây
        monthlyDriveFolders: { 
            type: [MonthlyDriveFolderSchema], 
            default: [] 
        },

        // Folder gốc trên Drive (dùng làm fallback nếu không tìm thấy folder tháng)
        driveFolderId: {
            type: String,
            index: true,
            default: null,
        },
        driveFolderName: {
            type: String,
            default: '',
        },
        // Alias rõ nghĩa cho folder gốc (giữ song song để tránh nhầm lẫn)
        rootDriveFolderId: {
            type: String,
            index: true,
            default: null,
        },
        rootDriveFolderName: {
            type: String,
            default: '',
        },

        // ==================== CONFIGURATION ====================
        
        // Platforms được phép sử dụng trong project
        platforms: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Platform', 
            index: true 
        }],
        
        // Work types được phép sử dụng trong project
        workTypes: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'WorkType', 
            index: true 
        }],

        // ==================== STATISTICS ====================
        
        // Số lượng tài sản/assets trong dự án
        assetsCount: { 
            type: Number, 
            default: 0,
            min: 0
        },

        // ==================== CUSTOM METADATA ====================
        
        // Custom fields tùy chỉnh theo nhu cầu
        custom: { 
            type: Map, 
            of: mongoose.Schema.Types.Mixed, 
            default: () => new Map()
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
 * Index hợp chất để tối ưu truy vấn project theo team và trạng thái.
 * Ứng dụng: Lấy danh sách project hoạt động trong một team.
 */
ProjectSchema.index({ team: 1, isActive: 1 });

/**
 * Index hợp chất cho Drive folders theo năm và tháng.
 * Ứng dụng: Tìm folder Drive của project cho một tháng cụ thể.
 */
ProjectSchema.index({ 'monthlyDriveFolders.year': 1, 'monthlyDriveFolders.month': 1 });

/**
 * Index hợp chất để tối ưu truy vấn theo userId của member.
 * Ứng dụng: Lấy tất cả project mà một user tham gia.
 */
ProjectSchema.index({ 'members.userId': 1, isActive: 1 });

/**
 * Index hợp chất cho timeline queries.
 * Ứng dụng: Lấy project theo deadline, roadmap view.
 */
ProjectSchema.index({ isActive: 1, dueDate: 1 });

/**
 * Index hợp chất cho priority filtering.
 * Ứng dụng: Lấy project theo độ ưu tiên và trạng thái.
 */
ProjectSchema.index({ priority: 1, isActive: 1 });

/**
 * Index hợp chất cho search tối ưu (QUAN TRỌNG).
 * Ứng dụng: Search project theo name_normalized, isActive, và members.
 */
ProjectSchema.index({ name_normalized: 1, isActive: 1, 'members.userId': 1 });

// ==================== VIRTUALS ====================

/**
 * Virtual field: Số lượng thành viên trong dự án.
 * @returns {number} Số lượng thành viên
 */
ProjectSchema.virtual('memberCount').get(function () {
    return this.members?.length || 0;
});

/**
 * Virtual field: Kiểm tra dự án có quá hạn hay không.
 * @returns {boolean} True nếu dueDate đã qua và chưa hoàn thành
 */
ProjectSchema.virtual('isOverdue').get(function () {
    if (!this.dueDate || !this.isActive) return false;
    return new Date(this.dueDate) < new Date();
});

/**
 * Virtual field: Số ngày còn lại đến deadline.
 * @returns {number|null} Số ngày còn lại (âm nếu quá hạn), null nếu không có dueDate
 */
ProjectSchema.virtual('daysRemaining').get(function () {
    if (!this.dueDate) return null;
    const now = new Date();
    const due = new Date(this.dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

/**
 * Virtual field: Kiểm tra project có Drive folders hay không.
 * @returns {boolean} True nếu có ít nhất 1 folder
 */
ProjectSchema.virtual('hasDriveFolders').get(function () {
    return this.monthlyDriveFolders && this.monthlyDriveFolders.length > 0;
});

// ==================== INSTANCE METHODS ====================

/**
 * Kiểm tra user có phải thành viên của project hay không.
 * @param {string} userId - External User ID
 * @returns {boolean} True nếu là thành viên
 */
ProjectSchema.methods.isMember = function (userId) {
    if (!userId || !this.members) return false;
    return this.members.some((m) => String(m.userId) === String(userId));
};

/**
 * Kiểm tra user có quyền quản lý project hay không.
 * @param {string} userId - External User ID
 * @returns {boolean} True nếu là owner hoặc manager
 */
ProjectSchema.methods.canManage = function (userId) {
    if (!userId || !this.members) return false;
    return this.members.some(
        (m) => String(m.userId) === String(userId) && 
               (m.role === PROJECT_ROLE.OWNER || m.role === PROJECT_ROLE.MANAGER)
    );
};

/**
 * Lấy vai trò của user trong project.
 * @param {string} userId - External User ID
 * @returns {string|null} Role hoặc null nếu không phải thành viên
 */
ProjectSchema.methods.getMemberRole = function (userId) {
    if (!userId || !this.members) return null;
    const member = this.members.find((m) => String(m.userId) === String(userId));
    return member?.role || null;
};

/**
 * Lấy Drive folder ID cho một tháng cụ thể.
 * @param {number} year - Năm (YYYY)
 * @param {number} month - Tháng (1-12)
 * @returns {string|null} Folder ID hoặc null nếu không tìm thấy
 */
ProjectSchema.methods.getDriveFolderForMonth = function (year, month) {
    if (!this.monthlyDriveFolders) return null;
    const folder = this.monthlyDriveFolders.find(
        (f) => f.year === year && f.month === month
    );
    return folder?.folderId || null;
};

/**
 * Thêm hoặc cập nhật Drive folder cho một tháng.
 * @param {number} year - Năm
 * @param {number} month - Tháng (1-12)
 * @param {string} folderId - Google Drive Folder ID
 * @param {string} folderName - Tên folder
 * @returns {Promise<Project>} Project sau khi cập nhật
 */
ProjectSchema.methods.setDriveFolderForMonth = async function (year, month, folderId, folderName) {
    await connectDB();
    
    if (!this.monthlyDriveFolders) {
        this.monthlyDriveFolders = [];
    }
    
    const existingIndex = this.monthlyDriveFolders.findIndex(
        (f) => f.year === year && f.month === month
    );
    
    if (existingIndex >= 0) {
        this.monthlyDriveFolders[existingIndex] = { year, month, folderId, folderName };
    } else {
        this.monthlyDriveFolders.push({ year, month, folderId, folderName });
    }
    
    return await this.save();
};

/**
 * Thêm thành viên vào project.
 * @param {string} userId - External User ID
 * @param {string} role - Vai trò (mặc định: MEMBER)
 * @returns {Promise<Project>} Project sau khi cập nhật
 * @throws {Error} Nếu user đã là thành viên
 */
ProjectSchema.methods.addMember = async function (userId, role = PROJECT_ROLE.MEMBER) {
    await connectDB();
    
    if (this.isMember(userId)) {
        throw new Error(`User ${userId} is already a member of this project`);
    }
    
    this.members.push({ userId, role });
    return await this.save();
};

/**
 * Xóa thành viên khỏi project.
 * @param {string} userId - External User ID
 * @returns {Promise<Project>} Project sau khi cập nhật
 * @throws {Error} Nếu user không phải thành viên
 */
ProjectSchema.methods.removeMember = async function (userId) {
    await connectDB();
    
    if (!this.isMember(userId)) {
        throw new Error(`User ${userId} is not a member of this project`);
    }
    
    this.members = this.members.filter((m) => String(m.userId) !== String(userId));
    return await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Tìm tất cả project của một team.
 * @param {string} teamId - Team ID
 * @param {boolean} activeOnly - Chỉ lấy project hoạt động (mặc định: true)
 * @returns {Promise<Project[]>} Danh sách project
 */
ProjectSchema.statics.findByTeam = async function (teamId, activeOnly = true) {
    await connectDB();
    
    const query = { team: teamId };
    if (activeOnly) {
        query.isActive = true;
    }
    
    return await this.find(query).sort({ createdAt: -1 }).lean().exec();
};

/**
 * Tìm tất cả project mà một user tham gia.
 * @param {string} userId - External User ID
 * @param {boolean} activeOnly - Chỉ lấy project hoạt động (mặc định: true)
 * @returns {Promise<Project[]>} Danh sách project
 */
ProjectSchema.statics.findByMember = async function (userId, activeOnly = true) {
    await connectDB();
    
    const query = { 'members.userId': userId };
    if (activeOnly) {
        query.isActive = true;
    }
    
    return await this.find(query).sort({ createdAt: -1 }).lean().exec();
};

/**
 * Tạo project mới với owner.
 * @param {Object} projectData - Dữ liệu project
 * @param {string} ownerId - External User ID của owner
 * @returns {Promise<Project>} Project mới
 * @throws {Error} Nếu thiếu thông tin bắt buộc
 */
ProjectSchema.statics.createWithOwner = async function (projectData, ownerId) {
    await connectDB();
    
    if (!projectData.name) {
        throw new Error('Project name is required');
    }
    if (!ownerId) {
        throw new Error('Owner ID is required');
    }
    
    const project = new this({
        ...projectData,
        members: [{ userId: ownerId, role: PROJECT_ROLE.OWNER }],
        isActive: true
    });
    
    return await project.save();
};

// ==================== MIDDLEWARE (HOOKS) ====================

/**
 * Pre-save middleware: Đảm bảo project luôn có ít nhất một owner.
 */
ProjectSchema.pre('save', function (next) {
    if (this.members && this.members.length > 0) {
        const hasOwner = this.members.some((m) => m.role === PROJECT_ROLE.OWNER);
        if (!hasOwner) {
            return next(new Error('Project must have at least one owner'));
        }
    }
    next();
});

/**
 * Pre-save middleware: Đảm bảo không có duplicate members.
 */
ProjectSchema.pre('save', function (next) {
    if (this.members && this.members.length > 0) {
        const userIds = this.members.map((m) => String(m.userId));
        const uniqueUserIds = [...new Set(userIds)];
        
        if (userIds.length !== uniqueUserIds.length) {
            return next(new Error('Duplicate members detected in project'));
        }
    }
    next();
});

/**
 * Pre-save middleware: Tự động normalize name khi lưu.
 */
ProjectSchema.pre('save', function (next) {
    if (this.isModified('name') && this.name) {
        this.name_normalized = normalizeText(this.name);
    }
    next();
});

// ==================== MODEL EXPORT ====================

/**
 * Xóa model cũ khỏi cache để tránh lỗi HMR trong Next.js development.
 */
if (mongoose.models.Project) {
    delete mongoose.models.Project;
    delete mongoose.connection.models.Project;
}

/**
 * Export Project Model.
 * Model này quản lý thông tin dự án, thành viên, timeline, và cấu trúc Drive folders.
 */
export default mongoose.model('Project', ProjectSchema);