// data/team/actions/activities.js
'use server';

import { z } from 'zod';
import { connectDB } from '@/lib/db.js';
import { runAction, assert } from '@/lib/action-utils.js';
import ActivityLog from '@/model/activityLog.model.js';
import { getById } from '@/data/team/processors/repo.js'; // SỬ DỤNG REPO
import { isTeamMember } from '@/lib/permissions.js';

/**
 * Lấy activity log của team với pagination
 */
export async function getActivities(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { teamId, limit = 20, skip = 0 } = z
                .object({
                    teamId: z.string().min(1),
                    limit: z.number().int().min(1).max(50).optional(),
                    skip: z.number().int().min(0).optional(),
                })
                .parse(payload || {});

            // Tối ưu: Dùng getById từ repo (có React.cache)
            const team = await getById(teamId, { lean: true });
            assert(team, 'Team không tồn tại', 'NOT_FOUND', 404);
            assert(await isTeamMember(team, uid), 'FORBIDDEN', 'FORBIDDEN', 403);

            const activities = await ActivityLog.find({ team: teamId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            const total = await ActivityLog.countDocuments({ team: teamId });

            return JSON.parse(JSON.stringify({
                items: activities,
                total,
                hasMore: skip + activities.length < total
            }));
        },
        { requireAuth: true }
    );
}