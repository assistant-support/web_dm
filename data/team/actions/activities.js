// data/team/actions/activities.js
// Server action để lấy activity log của team

'use server';

import { z } from 'zod';
import { connectDB } from '@/lib/db.js';
import { runAction, assert } from '@/lib/action-utils.js';
import ActivityLog from '@/model/activityLog.model.js';
import Team from '@/model/team.model.js';
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

            const team = await Team.findById(teamId).lean();
            assert(team, 'Team không tồn tại', 'NOT_FOUND', 404);
            assert(await isTeamMember(team, uid), 'FORBIDDEN', 'FORBIDDEN', 403);

            // Lấy activities liên quan đến team
            const activities = await ActivityLog.find({ team: teamId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            // Đếm tổng số
            const total = await ActivityLog.countDocuments({ team: teamId });

            // Serialize để tránh lỗi MongoDB ObjectId
            return JSON.parse(JSON.stringify({
                items: activities,
                total,
                hasMore: skip + activities.length < total
            }));
        },
        { requireAuth: true }
    );
}
