// data/team/actions/analytics.js
// Server action để lấy analytics của team

'use server';

import { z } from 'zod';
import { connectDB } from '@/lib/db.js';
import { runAction, assert } from '@/lib/action-utils.js';
import { getTeamAnalytics } from '@/data/team/processors/team-analytics.js';
import Team from '@/model/team.model.js';
import { isTeamMember } from '@/lib/permissions.js';

/**
 * Lấy analytics tổng quan cho team
 */
export async function getAnalytics(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { teamId } = z
                .object({
                    teamId: z.string().min(1),
                })
                .parse(payload || {});

            const team = await Team.findById(teamId).lean();
            assert(team, 'Team không tồn tại', 'NOT_FOUND', 404);
            assert(await isTeamMember(team, uid), 'FORBIDDEN', 'FORBIDDEN', 403);

            const analytics = await getTeamAnalytics(teamId);
            
            // Serialize để tránh lỗi MongoDB ObjectId
            return JSON.parse(JSON.stringify(analytics));
        },
        { requireAuth: true }
    );
}
