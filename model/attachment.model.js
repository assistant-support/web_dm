// /model/common/attachment.model.js
// Mục đích: Lưu metadata file Google Drive, gắn vào Project hoặc Task.
// - Hỗ trợ phân loại kind (image/video/doc/other) để lọc nhanh.
// - Lưu folder hiện tại (driveFolderId) để đồng bộ rename/move.
// - Cho phép đính kèm trực tiếp vào Project (tài liệu chung) hoặc vào Task.
// - Có cơ chế soft-delete (deletedAt) để khôi phục/lịch sử.
// - Post-save hook: tăng counters cho Project/Task khi tạo mới.
//
// LƯU Ý:
// - Repo (data/attachment/processors/repo.js) xử lý counters khi move/delete.
//   Ở đây chỉ tăng khi tạo mới (save). Cập nhật bằng findByIdAndUpdate sẽ KHÔNG kích hoạt hook này.

import mongoose from 'mongoose';
import { STORAGE_PROVIDER, FILE_KIND } from '@/model/common/enums.js';

const AttachmentSchema = new mongoose.Schema({
    // Gắn vào Project/Task (ít nhất một trong hai)
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', index: true },

    // Tác giả (external user id theo Auth 2.0)
    author: { type: String, required: true, index: true },

    // Nhà cung cấp lưu trữ
    storage: {
        type: String,
        enum: Object.values(STORAGE_PROVIDER),
        default: STORAGE_PROVIDER.DRIVE,
    },

    // Google Drive metadata
    driveFileId: { type: String, index: true },
    driveFolderId: { type: String, index: true }, // thư mục hiện tại (project/task)
    driveName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    webViewLink: { type: String },
    webContentLink: { type: String },

    // Phân loại & nhãn
    kind: { type: String, enum: Object.values(FILE_KIND), default: FILE_KIND.OTHER },
    label: { type: String },

    // (tuỳ chọn) tham chiếu danh mục để lọc nhanh
    workType: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkType', index: true },
    platforms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Platform', index: true }],

    // Soft delete
    deletedAt: { type: Date, default: null, index: true },
}, {
    timestamps: true,
    toJSON: { transform: (_d, r) => { delete r.__v; } },
});

// Yêu cầu: phải có ít nhất project hoặc task
AttachmentSchema.pre('validate', function (next) {
    if (!this.project && !this.task) {
        next(new Error('Attachment must belong to a project or a task.'));
    } else {
        next();
    }
});

// Indexes phục vụ list/sort/filter
AttachmentSchema.index({ createdAt: -1 });
AttachmentSchema.index({ project: 1, task: 1, deletedAt: 1, createdAt: -1 });

// Tăng counters sau khi tạo mới
AttachmentSchema.post('save', async function (doc, next) {
    try {
        if (doc.isNew) {
            if (doc.task) {
                await mongoose.model('Task').findByIdAndUpdate(
                    doc.task,
                    { $inc: { attachmentsCount: 1 } },
                    { lean: true }
                );
            } else if (doc.project) {
                await mongoose.model('Project').findByIdAndUpdate(
                    doc.project,
                    { $inc: { assetsCount: 1 } },
                    { lean: true }
                );
            }
        }
    } catch (_e) {
        // nuốt lỗi để không chặn luồng
    }
    next();
});

export default mongoose.models.Attachment || mongoose.model('Attachment', AttachmentSchema);
