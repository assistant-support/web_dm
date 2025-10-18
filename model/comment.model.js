// MỤC ĐÍCH: Nhận xét/bình luận trong quá trình làm Task.
// - Tác giả và mentions dùng externalUserId.
// - Hook post-save tăng bộ đếm commentsCount ở Task.

import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    author: { type: String, required: true, index: true }, // externalUserId
    body: { type: String, required: true },
    mentions: [{ type: String, index: true }],             // externalUserId
}, {
    timestamps: true,
    toJSON: { transform: (_d, r) => { delete r.__v; } }
});

CommentSchema.index({ task: 1, createdAt: -1 });

CommentSchema.post('save', async function (doc, next) {
    try { await mongoose.model('Task').findByIdAndUpdate(doc.task, { $inc: { commentsCount: 1 } }, { lean: true }); } catch (_) { }
    next();
});

export default mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
