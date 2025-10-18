// data/appUser/transform.js
// Tác dụng file: Pure helpers chuẩn hoá dữ liệu AppUser + chuẩn hoá patch preferences.
// - LƯU Ý: MongoDB không cho key chứa '.' → ta ENCODE key trước khi lưu và DECODE khi xuất ra UI.
// - Không dùng 'use server' (pure JS).

/** Encode key path để lưu vào Mongo Map (thay '.' bằng '__'). */
function encodePrefKey(path) {
    return String(path ?? '').trim().replaceAll('.', '__');
}
/** Decode key path để hiển thị ra UI (khôi phục '.' từ '__'). */
function decodePrefKey(storedKey) {
    return String(storedKey ?? '').replaceAll('__', '.');
}

/** Chuẩn hoá string an toàn. */
export function safeString(v, def = '') {
    if (v == null) return def;
    return String(v);
}

/** Chuẩn hoá int an toàn. */
export function safeInt(v, def = 0) {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : def;
}

/**
 * Gộp thông tin từ header + AppUser doc thành view model cho UI.
 * @param {{headerUser?:object, appUserDoc?:any}} param0
 */
export function mergeUserHeaderAndProfile({ headerUser, appUserDoc }) {
    // preferences: Map → Object (decode key)
    let preferences = {};
    const prefs = appUserDoc?.preferences;
    if (prefs && typeof prefs[Symbol.iterator] === 'function') {
        const out = {};
        for (const [k, v] of prefs) out[decodePrefKey(k)] = v;
        preferences = out;
    }

    return {
        id: appUserDoc?._id?.toString?.() ?? null,
        externalUserId: headerUser?.externalUserId ?? null,
        email: headerUser?.email ?? null,
        name: headerUser?.name ?? null,
        avatar: headerUser?.avatar ?? null,
        jobTitle: appUserDoc?.jobTitle ?? '',
        color: appUserDoc?.color ?? '',
        capacityHoursPerWeek: appUserDoc?.capacityHoursPerWeek ?? 40,
        preferences,
        isEnabled: appUserDoc?.isEnabled ?? true,
        createdAt: appUserDoc?.createdAt ?? null,
        updatedAt: appUserDoc?.updatedAt ?? null,
    };
}

/**
 * Chuẩn hoá patch preferences: { 'ui.compact': true } → [['ui__compact', true]]
 * (sau đó actions sẽ .set(key,value) vào Map)
 * @param {Record<string,any>} patch
 * @returns {[string, any][]}
 */
export function normalizePrefPatch(patch = {}) {
    const entries = [];
    for (const [rawKey, value] of Object.entries(patch || {})) {
        const key = String(rawKey || '').trim();
        if (!key) continue;
        entries.push([encodePrefKey(key), value]);
    }
    return entries;
}
