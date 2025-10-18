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
 * - value: externalUserId (chuẩn hệ thống)
 * - label: externalUserId (vì AppUser không lưu name/email); có thể nối jobTitle nếu có
 */
export async function listForPicker({ q = '', limit = 50 } = {}) {
    return runAction(
        async () => {
            await connectDB();
            const cond = {};
            if (q) {
                cond.externalUserId = { $regex: String(q), $options: 'i' };
            }
            const rows = await AppUser.find(cond, {
                externalUserId: 1,
                jobTitle: 1,
                color: 1,
                isEnabled: 1,
                createdAt: 1,
            })
                .sort({ createdAt: -1 })
                .limit(Math.min(200, Math.max(1, Number(limit) || 50)))
                .lean();

            const items = rows.map((r) => ({
                value: r.externalUserId,
                label: r.jobTitle ? `${r.externalUserId} · ${r.jobTitle}` : r.externalUserId,
                color: r.color || '',
                isEnabled: r.isEnabled !== false,
            }));

            return { items, count: items.length };
        },
        { requireAuth: true }
    );
}
