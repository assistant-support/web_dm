// /data/noti/processors/service.js
// Cấu trúc: /data/noti/processors/*
// Mục đích: Dịch vụ thông báo trung tâm (notifyEvent) + 2 kênh gửi (in-app & Zalo stub).
// - Không 'use server' (được gọi từ Server Actions đã connectDB sẵn).
// - Quy tắc (RULES) cover đủ các event: task.assigned, task.completion.approved,
//   publicTask.claim.requested|decided|claimed, comment.added, task.reminder, task.overdue.
// - Alias: 'task.completed.approved' → 'task.completion.approved',
//          'task.approved' → 'task.completion.approved',
//          'publicTask.completion.approved' → 'task.completion.approved' (NEW).
// - Mặc định DEV: chỉ console.log, không throw để không phá luồng nghiệp vụ.

import Task from '@/model/task.model.js';
import Project from '@/model/project.model.js';

/** Dedupe mảng user ids -> string[] */
function uniqIds(arr = []) {
    return Array.from(new Set((arr || []).map((x) => String(x)).filter(Boolean)));
}

/**
 * Tải context gọn để dựng message (tên task/project).
 * - Lấy task.title; nếu thiếu projectId thì gán từ task.project.
 * - Lấy project.name sau cùng.
 * - Tất cả .lean() và không throw ra ngoài.
 * @param {{projectId?: string, taskId?: string}} param0
 * @returns {Promise<{taskTitle?:string, projectName?:string}>}
 */
export async function loadMiniContext({ projectId, taskId } = {}) {
    const ctx = {};
    try {
        if (taskId) {
            const t = await Task.findById(taskId).select({ title: 1, project: 1 }).lean();
            if (t) {
                ctx.taskTitle = t.title || `#${String(taskId)}`;
                if (!projectId && t.project) projectId = String(t.project);
            }
        }
        if (projectId) {
            const p = await Project.findById(projectId).select({ name: 1 }).lean();
            if (p) ctx.projectName = p.name || `#${String(projectId)}`;
        }
    } catch (e) {
        console.warn('[NOTI][CTX][WARN]', e?.message || e);
    }
    return ctx;
}

/**
 * Gửi thông báo in-app và lưu vào database.
 * UI sẽ đảm nhiệm quyền hiển thị. Không throw.
 * @param {string[]} toUserIds - Mảng externalUserId của users cần nhận thông báo
 * @param {string} message - Nội dung thông báo
 * @param {object} meta - Metadata chứa type, taskId, projectId, actorId, etc.
 */
export async function sendSystemNotification(toUserIds = [], message = '', meta = {}) {
    try {
        // Dynamic import để tránh circular dependencies
        const Notification = (await import('@/model/notification.model.js')).default;

        // Lọc và dedupe user IDs
        const uniqueUserIds = uniqIds(toUserIds);

        // Không làm gì nếu không có user nào để gửi
        if (uniqueUserIds.length === 0) {
            return;
        }

        // Tạo mảng notifications để insert
        const notifications = uniqueUserIds.map(userId => ({
            userId,
            type: meta.type || 'system', // Lấy type từ metadata, fallback về 'system'
            message,
            metadata: {
                taskId: meta.taskId || undefined,
                projectId: meta.projectId || undefined,
                commentId: meta.commentId || undefined,
                actorId: meta.actorId || undefined,
            },
            read: false,
        }));

        // Lưu vào database
        await Notification.insertMany(notifications);
    } catch (e) {
        // Log error nhưng không throw để không phá luồng nghiệp vụ
        console.error('[NOTI][SYSTEM][ERROR]', e?.message || e);
    }
}

/**
 * Gửi thông báo qua Zalo OA (stub).
 * Hiện chỉ log, để tránh phụ thuộc hạ tầng. Không throw.
 * @param {string[]} toUserIds
 * @param {string} message
 * @param {object} meta
 */
export async function sendZaloNotification(toUserIds = [], message = '', meta = {}) {
    try {
        
    } catch (e) {
        console.error('[NOTI][ZALO][ERROR]', e);
    }
}

/** Builder helpers cho message ngắn gọn */
const M = {
    assigned: ({ taskTitle, projectName }) =>
        `Bạn được giao task: ${taskTitle || 'Nhiệm vụ'}${projectName ? ` (${projectName})` : ''}`,
    completionApproved: ({ taskTitle, totalPoints }) =>
        `Task đã được duyệt: ${taskTitle || 'Nhiệm vụ'}${Number.isFinite(totalPoints) ? ` — điểm: ${totalPoints}` : ''}`,
    claimRequested: ({ taskTitle }) => `Có yêu cầu nhận task: ${taskTitle || 'Nhiệm vụ'}`,
    claimDecided: ({ taskTitle, accept }) =>
        `Yêu cầu nhận task ${taskTitle || ''} đã được ${accept ? 'CHẤP NHẬN' : 'TỪ CHỐI'}`,
    claimedAuto: ({ taskTitle }) => `Bạn đã nhận task: ${taskTitle || 'Nhiệm vụ'}`,
    commentMention: ({ taskTitle }) => `Bạn được nhắc trong bình luận tại task: ${taskTitle || 'Nhiệm vụ'}`,
    reminder: ({ taskTitle }) => `Nhắc hạn: ${taskTitle || 'Nhiệm vụ'} sắp đến hạn`,
    overdue: ({ taskTitle }) => `Task quá hạn: ${taskTitle || 'Nhiệm vụ'}`,
};

/**
 * Bảng quy tắc event → builder
 * Mỗi luật trả { system: { message }, zalo: { message } }
 */
const RULES = {
    // === Task chung ===
    'task.assigned': async (payload) => {
        const ctx = await loadMiniContext(payload);
        const msg = M.assigned(ctx);
        return { system: { message: msg }, zalo: { message: msg } };
    },
    'task.completion.approved': async (payload) => {
        const ctx = await loadMiniContext(payload);
        const msg = M.completionApproved({ ...ctx, totalPoints: payload.totalPoints });
        return { system: { message: msg }, zalo: { message: msg } };
    },

    // === Public board ===
    'publicTask.claim.requested': async (payload) => {
        const ctx = await loadMiniContext(payload);
        const msg = M.claimRequested(ctx);
        return { system: { message: msg }, zalo: { message: msg } };
    },
    'publicTask.claim.decided': async (payload) => {
        const ctx = await loadMiniContext(payload);
        const msg = M.claimDecided({ ...ctx, accept: !!payload.accept });
        return { system: { message: msg }, zalo: { message: msg } };
    },
    'publicTask.claimed': async (payload) => {
        const ctx = await loadMiniContext(payload);
        const msg = M.claimedAuto(ctx);
        return { system: { message: msg }, zalo: { message: msg } };
    },

    // === Comments ===
    'comment.added': async (payload) => {
        const ctx = await loadMiniContext(payload);
        const msg = M.commentMention(ctx);
        return { system: { message: msg }, zalo: { message: msg } };
    },

    // === Scheduler ===
    'task.reminder': async (payload) => {
        const ctx = await loadMiniContext(payload);
        const msg = M.reminder(ctx);
        return { system: { message: msg }, zalo: { message: msg } };
    },
    'task.overdue': async (payload) => {
        const ctx = await loadMiniContext(payload);
        const msg = M.overdue(ctx);
        return { system: { message: msg }, zalo: { message: msg } };
    },
};

/**
 * Aliases để gom nhóm tên sự kiện tương đương.
 * - NEW: 'publicTask.completion.approved' → 'task.completion.approved'
 */
const ALIASES = {
    'task.completed.approved': 'task.completion.approved',
    'task.approved': 'task.completion.approved',
    'publicTask.completion.approved': 'task.completion.approved',
};

/**
 * notifyEvent(eventName, payload)
 * - Dò rule theo eventName (hỗ trợ alias)
 * - Dedupe recipients; loại bỏ byUserId khỏi danh sách nếu trùng (tránh tự nhận thông báo).
 * - Gửi qua 2 kênh: in-app (system) + Zalo (stub)
 * - Log [NOTI][SKIP] khi thiếu rule/recipients.
 * @param {string} eventName
 * @param {{ projectId?:string, taskId?:string, byUserId?:string, toUserIds?:string[] } & Record<string,any>} payload
 */
export async function notifyEvent(eventName, payload = {}) {
    const name = ALIASES[eventName] || eventName;
    const rule = RULES[name];
    const from = payload?.byUserId ? String(payload.byUserId) : null;

    let to = uniqIds(payload?.toUserIds || []);
    if (from) to = to.filter((u) => u !== from); // loại tự thân nếu có

    if (!rule || !to.length) {
        return;
    }

    const built = await rule(payload);
    const meta = { event: name, ...payload, toUserCount: to.length };

    if (built?.system?.message) await sendSystemNotification(to, built.system.message, meta);
    if (built?.zalo?.message) await sendZaloNotification(to, built.zalo.message, meta);
}
