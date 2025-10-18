// model/common/platform.model.js
// Mục đích: Danh mục "Nền tảng" (Facebook, TikTok, YouTube, Web, App, v.v.)
// Quản lý bởi user có scope cấu hình (ví dụ: 'config:manage').

import mongoose from 'mongoose';

const PlatformSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, required: true, trim: true, unique: true }, // ví dụ: 'fb','tiktok','yt','web'
    description: String,
    color: String,         // tuỳ chọn hiển thị
    icon: String,          // tuỳ chọn hiển thị
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
    toJSON: { transform: (_d, r) => { delete r.__v; } }
});

export default mongoose.models.Platform || mongoose.model('Platform', PlatformSchema);
