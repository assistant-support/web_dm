// data/team/actions/analytics.js
'use server';

import { z } from 'zod';
import { connectDB } from '@/lib/db.js';
import { runAction, assert } from '@/lib/action-utils.js';
import { getTeamAnalytics } from '@/data/team/processors/team-analytics.js'; 
import { getById } from '@/data/team/processors/repo.js';
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
            const team = await getById(teamId, { lean: true });
            assert(team, 'Không tìm thấy nhóm', 'NOT_FOUND', 404);
            assert(await isTeamMember(team, uid), 'Bạn không có quyền thực hiện thao tác này', 'FORBIDDEN', 403);
            const analytics = await getTeamAnalytics(teamId);
            return JSON.parse(JSON.stringify(analytics));
        },
        { requireAuth: true }
    );
}