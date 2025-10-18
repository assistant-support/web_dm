// cấu trúc thư mục hiện tại: /lib/activity.js
// Tác dụng file: Ghi ActivityLog không-throw (fire-and-forget) để không chặn luồng chính.

'use server';

import { connectDB } from '@/lib/db.js';
import ActivityLog from '@/model/activityLog.model.js';

/**
 * Ghi 1 activity (không throw lỗi).
 * @param {{actor?:string, project?:string, team?:string, task?:string, type:string, payload?:object}} params
 */
export async function logActivity({ actor, project, team, task, type, payload }) {
    try {
        await connectDB();
        await ActivityLog.create({
            actor: actor ?? null,
            project: project ?? null,
            team: team ?? null,
            task: task ?? null,
            type,
            payload: payload || {},
        });
    } catch (e) {
        console.warn('[ActivityLog] failed:', e?.message || e);
    }
}
