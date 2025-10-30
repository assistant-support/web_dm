// model/project.model.js
// Tác dụng file: Định nghĩa Mongoose Model Project (thuộc Team, có membership).
// - Drive folder được quản lý theo cấu trúc 12 tháng/năm.

import mongoose from 'mongoose';
import { PROJECT_ROLE, PRIORITY } from '@/model/common/enums.js';

const ProjectMembershipSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, // external user id
    role: { type: String, enum: Object.values(PROJECT_ROLE), required: true },
}, { _id: false, timestamps: true });

// Schema con cho các folder hàng tháng trên Drive
const MonthlyDriveFolderSchema = new mongoose.Schema({
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 }, // 1 = January, 12 = December
    folderId: { type: String, required: true },
    folderName: { type: String }, // Ví dụ: "2025-10"
}, { _id: false });


const ProjectSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, trim: true, index: { unique: false, sparse: true } },
    description: String,

    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true }, // Không required - dự án có thể độc lập
    members: { type: [ProjectMembershipSchema], default: [] },

    // ---- Trạng thái/nhãn & cấu hình
    statuses: { type: [String], default: [] },
    tags: { type: [String], default: [], index: true },
    startDate: Date,
    dueDate: Date,
    priority: { type: String, enum: Object.values(PRIORITY) },
    isActive: { type: Boolean, default: true },

    // ---- Drive: Mảng lưu trữ các folder hàng tháng ----
    // Khi tạo project, cần tạo 12 folder cho năm hiện tại và lưu vào đây.
    monthlyDriveFolders: { type: [MonthlyDriveFolderSchema], default: [] },

    // ---- Giới hạn/cấu hình danh mục
    platforms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Platform', index: true }],
    workTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WorkType', index: true }],

    // ---- Báo cáo/tài liệu cấp dự án
    assetsCount: { type: Number, default: 0 },

    custom: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
}, {
    timestamps: true,
    toJSON: { transform: (_d, r) => { delete r.__v; } }
});

// Lọc nhanh theo team & hoạt động
ProjectSchema.index({ team: 1, isActive: 1 });
ProjectSchema.index({ 'monthlyDriveFolders.year': 1, 'monthlyDriveFolders.month': 1 });


// Force delete cached model to pick up new enum values
if (mongoose.models.Project) {
    delete mongoose.models.Project;
    delete mongoose.connection.models.Project;
}

export default mongoose.model('Project', ProjectSchema);