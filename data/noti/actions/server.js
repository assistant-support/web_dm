// /data/noti/actions/server.js
// Cấu trúc: /data/noti/actions/*
// Mục đích: Server Actions cho scheduler & test gửi thông báo.
// - scanDueTasks(): quét nhắc hạn + quá hạn, gửi notifyEvent; requireAuth=false (cho cron).
// - sendTest(): gửi thử 1 event tới chính user đang đăng nhập.
// Chuẩn: 'use server' + await connectDB() + runAction(...)

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert } from '@/lib/action-utils.js';
import Task from '@/model/task.model.js';
import { notifyEvent } from '@/lib/noti.js';

/** Lấy danh sách người nhận cho task: assignee + watchers, loại rỗng & trùng */
function recipientsFromTask(doc) {
    const arr = []
        .concat(doc?.assignee ? [String(doc.assignee)] : [])
        .concat(Array.isArray(doc?.watchers) ? doc.watchers.map(String) : []);
    return Array.from(new Set(arr.filter(Boolean)));
}

/**
 * scanDueTasks
 * - Reminders: remindAt <= now, !reminderSent, !deleted → notify 'task.reminder' + set reminderSent=true
 * - Overdue: plannedDueAt < now, !completedAt, !deleted → notify 'task.overdue'
 * - (Khuyến nghị) anti-spam: cũng set reminderSent=true cho case quá hạn nếu chưa, để tránh spam lặp.
 * - requireAuth: false (để cron gọi)
 */
export async function scanDueTasks() {
    await connectDB();
    return runAction(
        async () => {
            const now = new Date();

            // --- Reminders ---
            const reminders = await Task.find({
                deletedAt: null,
                remindAt: { $ne: null, $lte: now },
                reminderSent: { $ne: true },
            })
                .select({ _id: 1, project: 1, assignee: 1, watchers: 1 })
                .lean();

            let reminderCount = 0;
            for (const t of reminders) {
                const toUserIds = recipientsFromTask(t);
                if (toUserIds.length) {
                    await notifyEvent('task.reminder', {
                        projectId: t.project ? String(t.project) : null,
                        taskId: String(t._id),
                        byUserId: 'system',
                        toUserIds,
                    });
                }
                await Task.updateOne(
                    { _id: t._id, reminderSent: { $ne: true } },
                    { $set: { reminderSent: true } }
                );
                reminderCount++;
            }

            // --- Overdue ---
            const overdue = await Task.find({
                deletedAt: null,
                plannedDueAt: { $ne: null, $lt: now },
                completedAt: null,
            })
                .select({ _id: 1, project: 1, assignee: 1, watchers: 1, reminderSent: 1 })
                .lean();

            let overdueCount = 0;
            for (const t of overdue) {
                const toUserIds = recipientsFromTask(t);
                if (toUserIds.length) {
                    await notifyEvent('task.overdue', {
                        projectId: t.project ? String(t.project) : null,
                        taskId: String(t._id),
                        byUserId: 'system',
                        toUserIds,
                    });
                    overdueCount++;
                }
                // Anti-spam (khuyến nghị): đánh dấu đã nhắc để không spam
                if (t.reminderSent !== true) {
                    await Task.updateOne({ _id: t._id }, { $set: { reminderSent: true } });
                }
            }

            console.log('[NOTI][SCAN]', { reminderCount, overdueCount, at: now.toISOString() });
            return { reminderCount, overdueCount, at: now.toISOString() };
        },
        { requireAuth: false }
    );
}

/**
 * sendTest
 * - Gửi thử một event (mặc định 'task.reminder') tới chính user hiện tại.
 * @param {{ eventName?: string, projectId?: string, taskId?: string, totalPoints?: number, accept?: boolean }} payload
 */
export async function sendTest(payload = {}) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            assert(uid, 'UNAUTHORIZED', 'UNAUTHORIZED', 401);
            const eventName = payload?.eventName || 'task.reminder';

            await notifyEvent(eventName, {
                projectId: payload?.projectId || null,
                taskId: payload?.taskId || null,
                byUserId: uid,
                toUserIds: [uid],
                totalPoints: payload?.totalPoints, // optional for completion.approved
                accept: payload?.accept, // optional for claim.decided
            });

            return { ok: true, eventName, to: uid };
        },
        { requireAuth: true }
    );
}
