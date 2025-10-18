// model/common/attachment.model.js
// Mục đích: Lưu metadata file Google Drive, có thể gắn vào Project hoặc Task.
// - kind: image/video/doc/other để lọc nhanh
// - driveFolderId để biết file nằm ở đâu
// - Cho phép đính kèm trực tiếp vào Project (tài liệu chung) hoặc vào Task.

import mongoose from 'mongoose';
import { STORAGE_PROVIDER, FILE_KIND } from './enums.js';

const AttachmentSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', index: true },

    author: { type: String, required: true, index: true }, // external user id
    storage: { type: String, enum: Object.values(STORAGE_PROVIDER), default: STORAGE_PROVIDER.DRIVE },

    // Drive metadata
    driveFileId: { type: String, index: true },
    driveFolderId: { type: String, index: true }, // để biết file đang ở folder nào (project hay task)
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
}, {
    timestamps: true,
    toJSON: { transform: (_d, r) => { delete r.__v; } }
});

// Yêu cầu: phải có ít nhất project hoặc task
AttachmentSchema.pre('validate', function (next) {
    if (!this.project && !this.task) {
        next(new Error('Attachment must belong to a project or a task.'));
    } else {
        next();
    }
});

AttachmentSchema.index({ createdAt: -1 });

AttachmentSchema.post('save', async function (doc, next) {
    try {
        if (doc.task) {
            await mongoose.model('Task').findByIdAndUpdate(doc.task, { $inc: { attachmentsCount: 1 } }, { lean: true });
        }
        if (doc.project) {
            await mongoose.model('Project').findByIdAndUpdate(doc.project, { $inc: { assetsCount: 1 } }, { lean: true });
        }
    } catch (_) { }
    next();
});

export default mongoose.models.Attachment || mongoose.model('Attachment', AttachmentSchema);
