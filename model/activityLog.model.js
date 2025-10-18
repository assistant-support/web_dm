// cấu trúc thư mục hiện tại: /model/activityLog.model.js
// Tác dụng file: Lưu nhật ký hoạt động (ActivityLog) phục vụ audit & feed sự kiện UI.

import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
    actor: { type: String, required: true, index: true }, // external user id
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', index: true },

    // ví dụ:
    // 'project.created', 'drive.folder.created', 'task.created', 'task.approval.requested',
    // 'task.assignee.confirmed', 'task.completed', 'attachment.added', 'config.platform.created', ...
    type: { type: String, required: true },

    payload: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
}, {
    timestamps: true,
    toJSON: { transform: (_d, r) => { delete r.__v; } }
});

// Chỉ số thường dùng: xem activity theo task, mới nhất trước
ActivityLogSchema.index({ task: 1, createdAt: -1 });

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);
