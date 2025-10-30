import mongoose from 'mongoose';

const DefaultChecklistItem = new mongoose.Schema({
    _id: false,
    content: { type: String, required: true },
}, { _id: false });

const WorkTypeSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, required: true, trim: true, unique: true }, // 'design_banner', 'video_edit', ...
    description: String,

    // Nền tảng áp dụng (tùy chọn)
    platforms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Platform', index: true }],

    // Mặc định khi tạo task
    defaultPoints: { type: Number, default: 0, min: 0 },
    defaultChecklist: { type: [DefaultChecklistItem], default: [] },
    defaultCreateFolder: { type: Boolean, default: false }, // task dạng này thường cần thư mục tài liệu?

    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
}, {
    timestamps: true,
    toJSON: { transform: (_d, r) => { delete r.__v; } }
});

export default mongoose.models.WorkType || mongoose.model('WorkType', WorkTypeSchema);
