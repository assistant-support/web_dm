// data/task/processors/compute.js
// Tác dụng file: Pure helpers cho Task – chuẩn hoá tiêu đề/mô tả/tags, checklist, và plan window.
// - KHÔNG gọi DB, không 'use server'.

import { AppError } from '@/lib/errors.js';

/** Rút gọn khoảng trắng & trim tiêu đề. */
export function sanitizeTitle(s = '') {
    return String(s || '').replace(/\s+/g, ' ').trim();
}

/** Chuẩn hoá patch meta: lọc các field cho phép & normalize cơ bản. */
export function normalizeMeta(patch = {}) {
    const out = {};
    if (patch.title != null) out.title = sanitizeTitle(patch.title);
    if (patch.description != null) out.description = String(patch.description || '');
    if (patch.priority != null) out.priority = patch.priority;
    if (patch.tags != null)
        out.tags = Array.isArray(patch.tags)
            ? [...new Set(patch.tags.map((t) => String(t).trim()).filter(Boolean))]
            : [];
    if (Object.prototype.hasOwnProperty.call(patch, 'workType'))
        out.workType = patch.workType ?? null;
    if (patch.platforms != null)
        out.platforms = Array.isArray(patch.platforms)
            ? [...new Set(patch.platforms.map((p) => String(p).trim()).filter(Boolean))]
            : [];
    return out;
}

/** Bảo đảm checklist item chuẩn. */
export function ensureChecklistItem({ cid, content, done } = {}) {
    return {
        cid: String(cid || ''),
        content: String(content || '').trim(),
        done: Boolean(done),
        ...(done ? { doneAt: new Date() } : { doneAt: null }),
    };
}

/**
 * Toggle/cập nhật checklist:
 * - Nếu chưa có cid → thêm mới (auto cid)
 * - Nếu có → cập nhật content/done (chỉ 2 field này)
 * Trả về list mới.
 */
export function toggleChecklist(list = [], { cid, content, done } = {}) {
    const next = Array.isArray(list) ? [...list] : [];
    const id = String(cid || '');
    const idx = next.findIndex((x) => String(x?.cid) === id);

    if (idx === -1) {
        // Thêm mới
        const newCid = generateCid();
        next.push(
            ensureChecklistItem({
                cid: newCid,
                content: content || '',
                done: Boolean(done),
            })
        );
    } else {
        // Cập nhật
        const cur = { ...next[idx] };
        if (content != null) cur.content = String(content).trim();
        if (done != null) {
            cur.done = Boolean(done);
            cur.doneAt = cur.done ? new Date() : null;
        }
        next[idx] = cur;
    }
    return next;
}

function generateCid() {
    try {
        return crypto.randomUUID();
    } catch {
        // Fallback khi môi trường không có crypto.randomUUID
        return 'cid_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
}

/** Chuẩn hoá start/due về Date|null. Không ném lỗi ở đây. */
export function normalizePlanWindow({ start, due } = {}) {
    const s = start == null ? null : start instanceof Date ? start : new Date(start);
    const d = due == null ? null : due instanceof Date ? due : new Date(due);
    return { start: s, due: d };
}

/** Tiện ích: đảm bảo plan window hợp lệ, ném lỗi nếu không. */
export function assertValidPlanWindow({ start, due } = {}) {
    if (start && due && start.getTime() > due.getTime()) {
        throw new AppError('INVALID_PLAN_WINDOW', 'INVALID_PLAN_WINDOW', 400);
    }
}
