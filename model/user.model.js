// model/appUser.model.js
// MỤC ĐÍCH: Hồ sơ NGƯỜI DÙNG RIÊNG của app quản lý công việc.
// - Ràng buộc với người dùng ngoài qua externalUserId (String).
// - Không lưu dữ liệu cá nhân trùng với hệ thống khác (email/tên/avatar…).
// - SỬA LỖI: MongoDB không cho key chứa '.' trong Map → mặc định & khi lưu sẽ ENCODE '.' -> '__'.

import mongoose from 'mongoose';

// Encode key để lưu trong Mongo Map (thay '.' bằng '__')
function encodeKey(k = '') {
    return String(k).replaceAll('.', '__');
}

const AppUserSchema = new mongoose.Schema(
    {
        externalUserId: { type: String, required: true, unique: true, index: true }, // ID từ Auth/DB ngoài

        // Thuộc tính riêng của app (không lặp info cá nhân):
        jobTitle: { type: String, trim: true },
        capacityHoursPerWeek: { type: Number, default: 40 }, // năng lực tải công việc
        color: { type: String, trim: true }, // màu hiển thị ui

        // Map KHÔNG chấp nhận key có dấu chấm — dùng key đã ENCODE '.' -> '__'
        preferences: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: () =>
                new Map([
                    [encodeKey('ui.compact'), false],
                    [encodeKey('notify.email'), true],
                    [encodeKey('notify.inapp'), true],
                    [encodeKey('kanban.groupBy'), 'status'],
                ]),
        },

        isEnabled: { type: Boolean, default: true }, // bật/tắt tài khoản trong app
    },
    {
        timestamps: true,
        toJSON: { transform: (_d, r) => { delete r.__v; } },
    }
);

// Sanitize keys trước khi validate/save để tránh vô tình đẩy key có '.'
function sanitizePrefKeys(doc) {
    if (!doc?.preferences || !(doc.preferences instanceof Map)) return;
    let changed = false;
    const next = new Map();
    for (const [k, v] of doc.preferences.entries()) {
        const safeKey = k.includes('.') ? encodeKey(k) : k;
        if (safeKey !== k) changed = true;
        next.set(safeKey, v);
    }
    if (changed) {
        doc.preferences = next;
    }
}

AppUserSchema.pre('validate', function () {
    sanitizePrefKeys(this);
});
AppUserSchema.pre('save', function () {
    sanitizePrefKeys(this);
});

// Helper: Tạo rỗng nếu chưa có (không ghi role/quyền). Trả về object (lean) giống hành vi cũ.
AppUserSchema.statics.ensureForExternal = async function (externalUserId) {
    let doc = await this.findOne({ externalUserId }).lean();
    if (doc) return doc;
    const created = await this.create({ externalUserId });
    return created.toObject();
};

export default mongoose.models.AppUser || mongoose.model('AppUser', AppUserSchema);
