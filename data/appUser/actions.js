// data/appUser/actions.js
// Tác dụng file: Server actions cho AppUser – whoAmI & cập nhật hồ sơ + danh sách người dùng cho picker.
// - Yêu cầu đăng nhập (runAction requireAuth:true)
// - whoAmI: ensure profile + cache 15s theo externalUserId
// - updatePreferences: ENCODE key ('.' -> '__') trước khi set vào Map để tránh lỗi Mongo
// - setColor / setCapacity: cập nhật nhanh + revalidate inbox
// - listForPicker: trả danh sách AppUser rút gọn để hiển thị chọn thành viên (value/label)

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { getRuntimeCache, setRuntimeCache } from '@/lib/runtime-cache.js';
import { userInbox } from '@/data/_shared/tags.js';
import AppUser from '@/model/user.model.js';
import {
    mergeUserHeaderAndProfile,
    normalizePrefPatch,
    safeString,
    safeInt,
} from '@/data/appUser/transform.js';

/** Encode key để lưu vào Mongo Map (thay '.' bằng '__') – phòng hờ nếu patch chưa normalize */
function encodeKeyForMap(k) {
    return String(k ?? '').trim().replaceAll('.', '__');
}

/**
 * whoAmI(): ensure hồ sơ & trả view-model thống nhất (cache 15s theo externalUserId).
 */
export async function whoAmI() {
    return runAction(
        async ({ user }) => {
            await connectDB();

            const key = `whoami:${user.externalUserId}`;
            const cached = getRuntimeCache(key);
            if (cached) return cached;

            // ensure profile theo externalUserId
            const profile = await AppUser.ensureForExternal(user.externalUserId);

            const data = mergeUserHeaderAndProfile({
                headerUser: user,
                appUserDoc: profile,
            });

            setRuntimeCache(key, data, 15_000);
            return data;
        },
        { requireAuth: true }
    );
}

/**
 * updatePreferences(patch): cập nhật preferences Map
 * - Hỗ trợ key dạng 'ui.compact' (sẽ encode thành 'ui__compact' trước khi lưu)
 */
export async function updatePreferences(patch) {
    return runAction(
        async ({ user }) => {
            assert(patch && typeof patch === 'object', 'PATCH_INVALID');

            await connectDB();

            let doc = await AppUser.findOne({ externalUserId: user.externalUserId });
            if (!doc) {
                doc = await AppUser.ensureForExternal(user.externalUserId);
            }

            // Chuẩn hoá + ép encode key an toàn
            const entries = normalizePrefPatch(patch);
            if (!entries.length) {
                for (const [rawKey, value] of Object.entries(patch || {})) {
                    const k = encodeKeyForMap(rawKey);
                    if (k) entries.push([k, value]);
                }
            }

            for (const [k, v] of entries) {
                const safeKey = encodeKeyForMap(k);
                doc.preferences.set(safeKey, v);
            }

            await doc.save();

            await revalidateMany([userInbox(user.externalUserId)]);
            return { saved: true };
        },
        { requireAuth: true }
    );
}

/**
 * setColor(color): cập nhật màu hiển thị
 */
export async function setColor(color) {
    return runAction(
        async ({ user }) => {
            await connectDB();

            const c = safeString(color).slice(0, 32);
            assert(c, 'COLOR_REQUIRED');

            const doc =
                (await AppUser.findOne({ externalUserId: user.externalUserId })) ||
                (await AppUser.ensureForExternal(user.externalUserId));

            doc.color = c;
            await doc.save();

            await revalidateMany([userInbox(user.externalUserId)]);
            return { saved: true, color: c };
        },
        { requireAuth: true }
    );
}

/**
 * setCapacity(hours): cập nhật capacityHoursPerWeek
 */
export async function setCapacity(hours) {
    return runAction(
        async ({ user }) => {
            await connectDB();

            const h = Math.min(168, Math.max(0, safeInt(hours, 40)));

            const doc =
                (await AppUser.findOne({ externalUserId: user.externalUserId })) ||
                (await AppUser.ensureForExternal(user.externalUserId));

            doc.capacityHoursPerWeek = h;
            await doc.save();

            await revalidateMany([userInbox(user.externalUserId)]);
            return { saved: true, capacityHoursPerWeek: h };
        },
        { requireAuth: true }
    );
}

/**
 * listForPicker({ q, limit }): trả danh sách người dùng rút gọn cho UI chọn thành viên
 * - Tìm kiếm theo name, email, hoặc externalUserId
 * - Chỉ trả về users đã đăng nhập ít nhất 1 lần (có record trong AppUser)
 * - value: externalUserId (chuẩn hệ thống)
 * - label: name + email (hoặc externalUserId nếu chưa có)
 */
export async function listForPicker({ q = '', limit = 50 } = {}) {
    return runAction(
        async () => {
            await connectDB();
            const cond = { isEnabled: { $ne: false } }; // Chỉ lấy users active
            
            if (q && q.trim()) {
                const searchTerm = String(q).trim();
                // Tìm theo name, email, hoặc externalUserId
                cond.$or = [
                    { name: { $regex: searchTerm, $options: 'i' } },
                    { email: { $regex: searchTerm, $options: 'i' } },
                    { externalUserId: { $regex: searchTerm, $options: 'i' } },
                ];
            }

            const rows = await AppUser.find(cond, {
                externalUserId: 1,
                email: 1,
                name: 1,
                firstName: 1,
                lastName: 1,
                avatar: 1,
                jobTitle: 1,
                color: 1,
                isEnabled: 1,
                createdAt: 1,
            })
                .sort({ name: 1, createdAt: -1 })
                .limit(Math.min(200, Math.max(1, Number(limit) || 50)))
                .lean();

            const items = rows.map((r) => {
                // Tạo label từ name và email
                let label = r.name || r.externalUserId;
                if (r.email && r.email !== r.externalUserId) {
                    label = `${label} (${r.email})`;
                }
                if (r.jobTitle) {
                    label = `${label} · ${r.jobTitle}`;
                }

                return {
                    value: r.externalUserId,
                    label,
                    name: r.name || r.externalUserId,
                    email: r.email || '',
                    avatar: r.avatar || '',
                    jobTitle: r.jobTitle || '',
                    color: r.color || '',
                    isEnabled: r.isEnabled !== false,
                };
            });

            // Serialize để tránh lỗi MongoDB ObjectId
            return JSON.parse(JSON.stringify({ items, count: items.length }));
        },
        { requireAuth: true }
    );
}

/**
 * getUserSettings(): Get user settings including preferences
 */
export async function getUserSettings({ userId } = {}) {
    return runAction(
        async ({ user }) => {
            await connectDB();
            const targetUserId = userId || user.externalUserId;
            
            // Only allow users to view their own settings
            assert(
                String(targetUserId) === String(user.externalUserId),
                'FORBIDDEN',
                'FORBIDDEN',
                403
            );

            const doc = await AppUser.findOne({ externalUserId: targetUserId }).lean();
            
            if (!doc) {
                return {
                    notifications: {
                        email: true,
                        taskAssigned: true,
                        taskCompleted: true,
                        projectUpdates: true,
                        mentions: true,
                    },
                    preferences: {},
                    platforms: [],
                };
            }

            // Convert Map to plain object
            const preferencesObj = {};
            if (doc.preferences) {
                for (const [key, value] of Object.entries(doc.preferences)) {
                    preferencesObj[key] = value;
                }
            }

            return {
                notifications: {
                    email: preferencesObj['notifications__email'] !== false,
                    taskAssigned: preferencesObj['notifications__taskAssigned'] !== false,
                    taskCompleted: preferencesObj['notifications__taskCompleted'] !== false,
                    projectUpdates: preferencesObj['notifications__projectUpdates'] !== false,
                    mentions: preferencesObj['notifications__mentions'] !== false,
                },
                preferences: preferencesObj,
                platforms: doc.platforms || [],
                color: doc.color || '',
                capacityHoursPerWeek: doc.capacityHoursPerWeek || 40,
            };
        },
        { requireAuth: true }
    );
}

/**
 * updateUserSettings(): Update user settings
 */
export async function updateUserSettings(settings) {
    return runAction(
        async ({ user }) => {
            await connectDB();
            
            const doc = await AppUser.findOne({ externalUserId: user.externalUserId }) ||
                       await AppUser.ensureForExternal(user.externalUserId);

            // Update notifications preferences
            if (settings.notifications) {
                for (const [key, value] of Object.entries(settings.notifications)) {
                    const prefKey = `notifications__${key}`;
                    doc.preferences.set(prefKey, value);
                }
            }

            // Update other preferences
            if (settings.preferences) {
                for (const [key, value] of Object.entries(settings.preferences)) {
                    const safeKey = encodeKeyForMap(key);
                    doc.preferences.set(safeKey, value);
                }
            }

            // Update platforms
            if (Array.isArray(settings.platforms)) {
                doc.platforms = settings.platforms;
            }

            await doc.save();
            await revalidateMany([userInbox(user.externalUserId)]);

            return { saved: true };
        },
        { requireAuth: true }
    );
}
