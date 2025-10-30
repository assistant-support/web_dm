// data/team/actions/member-stats.js

'use server';

import { z } from 'zod';
import { connectDB } from '@/lib/db.js';
import { runAction, assert } from '@/lib/action-utils.js';
import { getBatchMemberStats } from '@/data/team/processors/member-stats.js';
import { getById } from '@/data/team/processors/repo.js';
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
            const team = await getById(teamId, { lean: true });
            assert(team, 'Team không tồn tại', 'NOT_FOUND', 404);
            assert(await isTeamMember(team, uid), 'FORBIDDEN', 'FORBIDDEN', 403);

            const userIds = team.members.map(m => m.userId);
            const stats = await getBatchMemberStats(teamId, userIds, ym);

            return JSON.parse(JSON.stringify(stats));
        },
        { requireAuth: true }
    );
}