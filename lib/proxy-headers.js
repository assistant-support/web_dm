// cấu trúc thư mục hiện tại: /lib/proxy-headers.js
// Tác dụng file: Hỗ trợ proxy response headers giữa Next.js (3000) và backend (5000).
// - pickProxyHeaders: chọn lọc các header có ích để trả về client.
// - mergeHeaders: hợp nhất headers nguồn & đích theo thứ tự mong muốn.

const PASS_THROUGH = new Set([
    "etag",
    "last-modified",
    "cache-control",
    "vary",
]);

/**
 * Lựa chọn các header được phép chuyển tiếp cho client.
 * @param {Response} fromResponse
 * @returns {Headers}
 */
export function pickProxyHeaders(fromResponse) {
    const out = new Headers();
    for (const [k, v] of fromResponse.headers.entries()) {
        if (PASS_THROUGH.has(k.toLowerCase())) out.set(k, v);
    }
    return out;
}

/**
 * Hợp nhất headers “nguồn” (từ 3000) & “đích” (mặc định/tuỳ chỉnh).
 * @param {Headers} sourceHeaders - headers nguồn
 * @param {Record<string,string>} destHeaders - headers đích (object)
 * @param {boolean} destBeforeSource - true: dest ghi trước, để source ghi đè; false: ngược lại
 * @returns {Headers}
 */
export function mergeHeaders(sourceHeaders, destHeaders = {}, destBeforeSource = false) {
    const merged = new Headers();
    if (destBeforeSource) {
        for (const [k, v] of Object.entries(destHeaders)) merged.set(k, v);
        for (const [k, v] of sourceHeaders.entries()) merged.set(k, v);
    } else {
        for (const [k, v] of sourceHeaders.entries()) merged.set(k, v);
        for (const [k, v] of Object.entries(destHeaders)) merged.set(k, v);
    }
    return merged;
}
