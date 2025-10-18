// lib/noti.js
// Tác dụng file: Provider thông báo (In-App + Zalo stub).
// - Dùng trong server actions để phát sự kiện UI/nhắc nhở.
// - Hỗ trợ gửi 1 người hoặc nhiều người (sendToMany), chuyển hoá managerIds -> toUserIds.
// - Không throw: log lỗi và tiếp tục để không phá vỡ luồng nghiệp vụ.

/**
 * Gửi thông báo In-App (stub/dev).
 * @param {string} userId
 * @param {object} payload
 */
export async function sendInApp(userId, payload) {
    try {
        console.log('[NOTI:INAPP]', { userId: String(userId), payload });
    } catch (e) {
        console.error('[NOTI:INAPP:ERROR]', e);
    }
}

/**
 * Gửi thông báo qua Zalo (stub) — thực thi thật sẽ tách ra action riêng theo yêu cầu.
 * @param {string} userId
 * @param {object} payload
 */
export async function sendZalo(userId, payload) {
    const token = process.env.ZALO_ACCESS_TOKEN;
    try {
        if (!token) {
            console.info('[NOTI:ZALO:STUB:NO_TOKEN] fallback console.log', {
                userId: String(userId),
                payload,
            });
            return;
        }
        // Chưa triển khai thật: hiện chỉ log để tránh lỗi.
        console.info('[NOTI:ZALO:STUB:HAS_TOKEN] would send', {
            userId: String(userId),
            payload,
        });
    } catch (e) {
        console.error('[NOTI:ZALO:ERROR]', e);
    }
}

/** Helper nội bộ: gửi cho nhiều người (dùng In-App) */
async function sendToMany(ids = [], payload) {
    for (const id of ids || []) {
        if (!id) continue;
        await sendInApp(String(id), payload);
    }
}

/**
 * Điều phối gửi thông báo theo “type” & “context”.
 * Không throw; luôn nuốt lỗi để không phá vỡ server action.
 *
 * @param {string} type
 * @param {object} ctx
 *  - Thường có: { projectId, taskId, byUserId, toUserId?, toUserIds?, managerIds?, message?, points? }
 */
export async function notifyEvent(type, ctx = {}) {
    try {
        // Chuẩn hoá mảng người nhận ưu tiên:
        // 1) ctx.toUserIds nếu có
        // 2) ctx.managerIds nếu có
        // 3) ctx.toUserId đơn lẻ
        const uniq = (arr) => Array.from(new Set((arr || []).map((x) => String(x)).filter(Boolean)));

        switch (type) {
            // === Phê duyệt bắt đầu ===
            case 'task.approval.requested': {
                const recips = uniq(ctx.managerIds);
                await sendToMany(recips, { type, ...ctx });
                break;
            }
            case 'task.approval.approved': {
                const recips = uniq(ctx.toUserIds);
                await sendToMany(recips, { type, ...ctx });
                break;
            }
            case 'task.approval.rejected': {
                const recips = uniq(ctx.toUserIds);
                await sendToMany(recips, { type, ...ctx });
                break;
            }

            // === Giao việc / xác nhận ===
            case 'task.assigned': {
                if (ctx.toUserId) {
                    await sendInApp(String(ctx.toUserId), { type, ...ctx });
                } else if (Array.isArray(ctx.toUserIds)) {
                    await sendToMany(uniq(ctx.toUserIds), { type, ...ctx });
                }
                break;
            }
            case 'task.assignee.confirmed': {
                const recips = uniq(ctx.toUserIds);
                await sendToMany(recips, { type, ...ctx });
                break;
            }

            // === Bắt đầu / hoàn tất (yêu cầu review) ===
            case 'task.started': {
                const recips = uniq(ctx.toUserIds);
                await sendToMany(recips, { type, ...ctx });
                break;
            }
            case 'task.completed.requested_review': {
                const recips = uniq(ctx.toUserIds);
                await sendToMany(recips, { type, ...ctx });
                break;
            }

            // === Nghiệm thu hoàn tất ===
            case 'task.completed.approved': // alias activity name
            case 'task.approved': {         // notify key dùng ở B7
                if (ctx.toUserId) {
                    await sendInApp(String(ctx.toUserId), { type, ...ctx });
                } else if (Array.isArray(ctx.toUserIds)) {
                    await sendToMany(uniq(ctx.toUserIds), { type, ...ctx });
                }
                break;
            }

            // === Mặc định: hỗ trợ danh sách người nhận ===
            default: {
                if (Array.isArray(ctx.toUserIds) && ctx.toUserIds.length) {
                    await sendToMany(uniq(ctx.toUserIds), { type, ...ctx });
                } else if (Array.isArray(ctx.managerIds) && ctx.managerIds.length) {
                    await sendToMany(uniq(ctx.managerIds), { type, ...ctx });
                } else if (ctx.toUserId) {
                    await sendInApp(String(ctx.toUserId), { type, ...ctx });
                } else {
                    console.info('[NOTI:NO_RECIPIENT]', { type, ctx });
                }
                break;
            }
        }
    } catch (e) {
        console.error('[NOTI:ERROR]', { type, ctx, error: e });
    }
}
