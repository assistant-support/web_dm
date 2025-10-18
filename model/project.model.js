// cấu trúc thư mục hiện tại: /model/project.model.js
// Tác dụng file: Định nghĩa Mongoose Model Project (thuộc Team, có membership).
// - Khi tạo Project thực tế app sẽ tạo thư mục Drive và lưu metadata ở đây.

import mongoose from 'mongoose';
import { PROJECT_ROLE, PRIORITY } from '@/model/common/enums.js';

const ProjectMembershipSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, // external user id
    role: { type: String, enum: Object.values(PROJECT_ROLE), required: true },
}, { _id: false, timestamps: true });

const ProjectSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, trim: true, index: { unique: false, sparse: true } },
    description: String,

    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    members: { type: [ProjectMembershipSchema], default: [] },

    // ---- Trạng thái/nhãn & cấu hình
    statuses: { type: [String], default: [] },
    tags: { type: [String], default: [], index: true },
    startDate: Date,
    dueDate: Date,
    priority: { type: String, enum: Object.values(PRIORITY) },
    isActive: { type: Boolean, default: true },

    // ---- Drive: tạo folder khi tạo project
    driveFolderId: { type: String, required: true, index: true },
    driveFolderName: { type: String }, // để hiển thị
    driveParentId: { type: String }, // thư mục cha (ví dụ: 1 folder root của công ty)

    // ---- Giới hạn/cấu hình danh mục
    platforms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Platform', index: true }],
    workTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WorkType', index: true }],

    // ---- Báo cáo/tài liệu cấp dự án
    assetsCount: { type: Number, default: 0 }, // số file đính kèm trực tiếp vào project (không qua task)

    custom: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
}, {
    timestamps: true,
    toJSON: { transform: (_d, r) => { delete r.__v; } }
});

// Lọc nhanh theo team & hoạt động
ProjectSchema.index({ team: 1, isActive: 1 });
// Tìm các project chứa user
ProjectSchema.index({ 'members.userId': 1 });

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
