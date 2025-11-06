// @/model/team.model.js
/**
 * Tác dụng file: Định nghĩa Mongoose Model cho Team (Nhóm làm việc).
 * Quản lý thông tin nhóm, membership (thành viên), vai trò, và liên kết với Google Drive.
 */

import mongoose from 'mongoose';
import { TEAM_ROLE } from '@/model/common/enums.js';
import { connectDB } from '@/lib/db.js';

/**
 * @typedef {Object} TeamMembership
 * @property {string} userId - External User ID (từ Auth Provider)
 * @property {string} role - Vai trò của thành viên trong nhóm (TEAM_ROLE enum)
 * @property {Date} createdAt - Thời điểm thành viên được thêm vào nhóm
 * @property {Date} updatedAt - Thời điểm cập nhật thông tin membership cuối cùng
 */
const TeamMembershipSchema = new mongoose.Schema(
    {
        // External User ID từ Auth Provider (Next-Auth, OAuth, etc.)
        userId: { 
            type: String, 
            required: true, 
            index: true 
        },
        // Vai trò của thành viên trong nhóm
        role: { 
            type: String, 
            enum: Object.values(TEAM_ROLE), 
            required: true,
            default: TEAM_ROLE.MEMBER 
        },
    },
    { 
        _id: false, // Sub-document không cần ID riêng
        timestamps: true 
    }
);

/**
 * Schema chính cho Team.
 * Lưu trữ thông tin nhóm làm việc, danh sách thành viên, và metadata liên quan đến Google Drive.
 */
const TeamSchema = new mongoose.Schema(
    {
        // Tên nhóm (bắt buộc, được trim whitespace, có index cho tìm kiếm)
        name: { 
            type: String, 
            required: true, 
            trim: true, 
            index: true 
        },
        // Mô tả chi tiết về nhóm
        description: { 
            type: String, 
            default: '' 
        },
        // Danh sách thành viên và vai trò của họ
        members: { 
            type: [TeamMembershipSchema], 
            default: [] 
        },
        // Trạng thái hoạt động của nhóm (để soft-disable)
        isActive: { 
            type: Boolean, 
            default: true, 
            index: true 
        },
        // Google Drive Folder ID cho nhóm (để lưu tài liệu chung)
        driveFolderId: { 
            type: String, 
            index: true, 
            sparse: true // Chỉ index khi có giá trị
        },
        // Tên folder trên Google Drive
        driveFolderName: { 
            type: String 
        },
        // Parent Folder ID trên Google Drive (thường là root hoặc folder tổ chức)
        driveParentId: { 
            type: String 
        },
    },
    {
        timestamps: true, // Tự động thêm createdAt và updatedAt
        toJSON: { 
            transform: (_doc, ret) => { 
                delete ret.__v; // Loại bỏ version key khi serialize
            } 
        }
    }
);

// ==================== INDEXES ====================

/**
 * Index hợp chất để tối ưu truy vấn tìm team theo trạng thái và thời gian tạo.
 * Ứng dụng: Lấy danh sách team hoạt động, sắp xếp theo thời gian tạo mới nhất.
 */
TeamSchema.index({ isActive: 1, createdAt: -1 });

/**
 * Index hợp chất để tối ưu truy vấn tìm team theo userId của thành viên.
 * Ứng dụng: Lấy tất cả team mà một user là thành viên.
 */
TeamSchema.index({ 'members.userId': 1, isActive: 1 });

/**
 * Index hợp chất để tối ưu truy vấn tìm team theo role của thành viên.
 * Ứng dụng: Lấy tất cả team mà một user là manager/owner.
 */
TeamSchema.index({ 'members.userId': 1, 'members.role': 1 });

// ==================== VIRTUALS ====================

/**
 * Virtual field: Số lượng thành viên trong nhóm.
 * @returns {number} Số lượng thành viên
 */
TeamSchema.virtual('memberCount').get(function () {
    return this.members?.length || 0;
});

/**
 * Virtual field: Kiểm tra xem nhóm có Google Drive folder hay không.
 * @returns {boolean} True nếu có driveFolderId
 */
TeamSchema.virtual('hasDriveFolder').get(function () {
    return !!this.driveFolderId;
});

// ==================== INSTANCE METHODS ====================

/**
 * Kiểm tra xem một user có phải là thành viên của team hay không.
 * @param {string} userId - External User ID cần kiểm tra
 * @returns {boolean} True nếu user là thành viên
 */
TeamSchema.methods.isMember = function (userId) {
    if (!userId || !this.members) return false;
    return this.members.some((m) => String(m.userId) === String(userId));
};

/**
 * Kiểm tra xem một user có vai trò quản lý (Manager) trong team hay không.
 * @param {string} userId - External User ID cần kiểm tra
 * @returns {boolean} True nếu user là manager
 */
TeamSchema.methods.isManager = function (userId) {
    if (!userId || !this.members) return false;
    return this.members.some(
        (m) => String(m.userId) === String(userId) && m.role === TEAM_ROLE.MANAGER
    );
};

/**
 * Lấy vai trò của một user trong team.
 * @param {string} userId - External User ID
 * @returns {string|null} Role của user, hoặc null nếu không phải thành viên
 */
TeamSchema.methods.getMemberRole = function (userId) {
    if (!userId || !this.members) return null;
    const member = this.members.find((m) => String(m.userId) === String(userId));
    return member?.role || null;
};

/**
 * Thêm một thành viên mới vào team.
 * @param {string} userId - External User ID của thành viên mới
 * @param {string} role - Vai trò của thành viên (mặc định: MEMBER)
 * @returns {Promise<Team>} Team document sau khi cập nhật
 * @throws {Error} Nếu user đã là thành viên
 */
TeamSchema.methods.addMember = async function (userId, role = TEAM_ROLE.MEMBER) {
    await connectDB();
    
    if (this.isMember(userId)) {
        throw new Error(`User ${userId} is already a member of this team`);
    }
    
    this.members.push({ userId, role });
    return await this.save();
};

/**
 * Xóa một thành viên khỏi team.
 * @param {string} userId - External User ID của thành viên cần xóa
 * @returns {Promise<Team>} Team document sau khi cập nhật
 * @throws {Error} Nếu user không phải thành viên
 */
TeamSchema.methods.removeMember = async function (userId) {
    await connectDB();
    
    if (!this.isMember(userId)) {
        throw new Error(`User ${userId} is not a member of this team`);
    }
    
    this.members = this.members.filter((m) => String(m.userId) !== String(userId));
    return await this.save();
};

/**
 * Cập nhật vai trò của một thành viên.
 * @param {string} userId - External User ID của thành viên
 * @param {string} newRole - Vai trò mới
 * @returns {Promise<Team>} Team document sau khi cập nhật
 * @throws {Error} Nếu user không phải thành viên hoặc role không hợp lệ
 */
TeamSchema.methods.updateMemberRole = async function (userId, newRole) {
    await connectDB();
    
    if (!Object.values(TEAM_ROLE).includes(newRole)) {
        throw new Error(`Invalid role: ${newRole}`);
    }
    
    const member = this.members.find((m) => String(m.userId) === String(userId));
    if (!member) {
        throw new Error(`User ${userId} is not a member of this team`);
    }
    
    member.role = newRole;
    return await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Tìm tất cả team mà một user là thành viên.
 * @param {string} userId - External User ID
 * @param {boolean} activeOnly - Chỉ lấy team đang hoạt động (mặc định: true)
 * @returns {Promise<Team[]>} Danh sách team
 */
TeamSchema.statics.findByMember = async function (userId, activeOnly = true) {
    await connectDB();
    
    const query = { 'members.userId': userId };
    if (activeOnly) {
        query.isActive = true;
    }
    
    return await this.find(query).sort({ createdAt: -1 }).lean().exec();
};

/**
 * Tìm tất cả team mà một user có vai trò quản lý.
 * @param {string} userId - External User ID
 * @param {boolean} activeOnly - Chỉ lấy team đang hoạt động (mặc định: true)
 * @returns {Promise<Team[]>} Danh sách team
 */
TeamSchema.statics.findByManager = async function (userId, activeOnly = true) {
    await connectDB();
    
    const query = {
        'members.userId': userId,
        'members.role': TEAM_ROLE.MANAGER // Only MANAGER role exists in TEAM_ROLE
    };
    if (activeOnly) {
        query.isActive = true;
    }
    
    return await this.find(query).sort({ createdAt: -1 }).lean().exec();
};

/**
 * Tạo một team mới với manager ban đầu.
 * @param {Object} teamData - Dữ liệu team (name, description, etc.)
 * @param {string} managerId - External User ID của manager
 * @returns {Promise<Team>} Team document mới được tạo
 * @throws {Error} Nếu thiếu thông tin bắt buộc
 */
TeamSchema.statics.createWithOwner = async function (teamData, managerId) {
    await connectDB();
    
    if (!teamData.name) {
        throw new Error('Team name is required');
    }
    if (!managerId) {
        throw new Error('Manager ID is required');
    }
    
    const team = new this({
        ...teamData,
        members: [{ userId: managerId, role: TEAM_ROLE.MANAGER }],
        isActive: true
    });
    
    return await team.save();
};

// ==================== MIDDLEWARE (HOOKS) ====================

/**
 * Pre-save middleware: Đảm bảo luôn có ít nhất một manager trong team.
 * Note: TEAM_ROLE chỉ có MANAGER và MEMBER (không có OWNER)
 */
TeamSchema.pre('save', function (next) {
    if (this.members && this.members.length > 0) {
        const hasManager = this.members.some((m) => m.role === TEAM_ROLE.MANAGER);
        if (!hasManager) {
            return next(new Error('Team must have at least one manager'));
        }
    }
    next();
});

/**
 * Pre-save middleware: Đảm bảo không có duplicate members (cùng userId).
 */
TeamSchema.pre('save', function (next) {
    if (this.members && this.members.length > 0) {
        const userIds = this.members.map((m) => String(m.userId));
        const uniqueUserIds = [...new Set(userIds)];
        
        if (userIds.length !== uniqueUserIds.length) {
            return next(new Error('Duplicate members detected in team'));
        }
    }
    next();
});

// ==================== MODEL EXPORT ====================

/**
 * Xóa model cũ khỏi cache để tránh lỗi HMR trong Next.js development.
 * Đảm bảo model luôn được định nghĩa lại mỗi khi hot-reload.
 */
if (mongoose.models.Team) {
    delete mongoose.models.Team;
}

/**
 * Export Team Model.
 * Model này quản lý thông tin nhóm làm việc, thành viên, vai trò, và liên kết Google Drive.
 */
export default mongoose.model('Team', TeamSchema);
