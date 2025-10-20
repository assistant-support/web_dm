// /data/leaderboard/actions/server.js
// Cấu trúc: /data/leaderboard/actions/*
// Mục đích: Server Actions cho Leaderboard tháng (B10)
// - team: leaderboard theo team (member)
// - project: leaderboard theo project (member)
// Chuẩn: 'use server' + await connectDB() + runAction(..., { requireAuth: true })
// Revalidate: tags.leaderboard('team:..'|'project:..', ym) (+ tags.project(projectId) cho project)

'use server';

import { z } from 'zod';
import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import * as tags from '@/data/_shared/tags.js';
import { teamLeaderboardAgg, projectLeaderboardAgg } from '@/data/leaderboard/processors/aggregations.js';
import Team from '@/model/team.model.js';
import Project from '@/model/project.model.js';
import { isTeamMember, canViewProject } from '@/lib/permissions.js';

const ymSchema = z.string().regex(/^\d{4}-\d{2}$/, 'ym phải có dạng YYYY-MM');
const idSchema = z.string().min(1);

/** Action: Leaderboard theo Team (member) */
export async function team(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { teamId, ym, limit, cursor } = z
                .object({
                    teamId: idSchema,
                    ym: ymSchema,
                    limit: z.number().int().min(1).max(100).optional(),
                    cursor: z.string().optional(),
                })
                .parse(payload || {});

            const teamDoc = await Team.findById(teamId).lean();
            assert(teamDoc, 'Team không tồn tại', 'NOT_FOUND', 404);
            // dùng await để an toàn nếu helper async
            assert(await isTeamMember(teamDoc, uid), 'FORBIDDEN', 'FORBIDDEN', 403);

            const data = await teamLeaderboardAgg({ teamId, ym, limit: limit ?? 20, cursor });

            await revalidateMany([tags.leaderboard(`team:${teamId}`, ym)].filter(Boolean));
            return data;
        },
        { requireAuth: true }
    );
}

/** Action: Leaderboard theo Project (member) */
export async function project(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { projectId, ym, limit, cursor } = z
                .object({
                    projectId: idSchema,
                    ym: ymSchema,
                    limit: z.number().int().min(1).max(100).optional(),
                    cursor: z.string().optional(),
                })
                .parse(payload || {});

            const project = await Project.findById(projectId).lean();
            assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);
            // dùng await để an toàn nếu helper async
            assert(await canViewProject(project, uid), 'FORBIDDEN', 'FORBIDDEN', 403);

            const data = await projectLeaderboardAgg({ projectId, ym, limit: limit ?? 20, cursor });

            await revalidateMany(
                [tags.leaderboard(`project:${projectId}`, ym), tags.project(projectId)].filter(Boolean)
            );
            return data;
        },
        { requireAuth: true }
    );
}
