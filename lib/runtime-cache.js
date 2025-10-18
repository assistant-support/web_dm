// cấu trúc thư mục hiện tại: /lib/runtime-cache.js
// Tác dụng file: Cache nhỏ trong runtime (process) với TTL (ms).
// - Phù hợp cache tạm thời như ETag, user snapshot, tránh gọi DB liên tục.

const store = new Map();

/**
 * Đặt cache với TTL (ms).
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs - thời gian sống (ms)
 */
export function setRuntimeCache(key, value, ttlMs = 60_000) {
    const expireAt = Date.now() + ttlMs;
    store.set(key, { value, expireAt });
}

/**
 * Lấy cache nếu còn hạn; trả undefined nếu hết hạn/không có.
 * @param {string} key
 */
export function getRuntimeCache(key) {
    const rec = store.get(key);
    if (!rec) return undefined;
    if (rec.expireAt < Date.now()) {
        store.delete(key);
        return undefined;
    }
    return rec.value;
}

/**
 * Xoá cache theo key (tuỳ chọn).
 * @param {string} key
 */
export function delRuntimeCache(key) {
    store.delete(key);
}
