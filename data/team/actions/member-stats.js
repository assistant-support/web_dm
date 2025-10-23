// data/team/actions/member-stats.js
// Server action để lấy stats của members

'use server';

import { z } from 'zod';
import { connectDB } from '@/lib/db.js';
import { runAction, assert } from '@/lib/action-utils.js';
import { getBatchMemberStats } from '@/data/team/processors/member-stats.js';
import Team from '@/model/team.model.js';
import { isTeamMember } from '@/lib/permissions.js';

/**
 * Lấy stats cho tất cả members trong team
 */
export async function getMembersStats(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { teamId, ym } = z
                .object({
                    teamId: z.string().min(1),
                    ym: z.string().regex(/^\d{4}-\d{2}$/).optional(),
                })
                .parse(payload || {});

            const team = await Team.findById(teamId).lean();
            assert(team, 'Team không tồn tại', 'NOT_FOUND', 404);
            assert(await isTeamMember(team, uid), 'FORBIDDEN', 'FORBIDDEN', 403);

            const userIds = team.members.map(m => m.userId);
            const stats = await getBatchMemberStats(teamId, userIds, ym);

            // Serialize để tránh lỗi MongoDB ObjectId
            return JSON.parse(JSON.stringify(stats));
        },
        { requireAuth: true }
    );
}
