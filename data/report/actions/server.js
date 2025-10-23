// /data/report/actions/server.js
// Cấu trúc: /data/report/actions/*
// Mục đích: Server Actions cho báo cáo tháng (B10)
// - userMonthly: báo cáo theo user (self-only giai đoạn này)
// - projectSummary: báo cáo theo project (member mới xem được)
// Chuẩn: 'use server' + await connectDB() + runAction(..., { requireAuth: true })
// Revalidate: tags.leaderboard('user:...|project:...', ym) + tags.project(projectId) khi cần

'use server';

import { z } from 'zod';
import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import * as tags from '@/data/_shared/tags.js';
import { userMonthlyAgg, projectSummaryAgg } from '@/data/report/processors/aggregations.js';
import Project from '@/model/project.model.js';
import { canViewProject } from '@/lib/permissions.js';

/** Zod validate cho ym & ids */
const ymSchema = z.string().regex(/^\d{4}-\d{2}$/, 'ym phải có dạng YYYY-MM');
const idSchema = z.string().min(1);

/** Action: Báo cáo tháng theo user (self-only) */
export async function userMonthly(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { ym, userId } = z
                .object({ ym: ymSchema, userId: z.string().optional() })
                .parse(payload || {});
            const target = userId || uid;
            assert(
                String(target) === String(uid),
                'Bạn chỉ xem được báo cáo của chính bạn',
                'FORBIDDEN',
                403
            );

            const data = await userMonthlyAgg({ ym, userId: target });

            await revalidateMany([tags.leaderboard(`user:${target}`, ym)].filter(Boolean));
            // Serialize để tránh lỗi MongoDB ObjectId
            return JSON.parse(JSON.stringify(data));
        },
        { requireAuth: true }
    );
}

/** Action: Báo cáo tháng theo project (chỉ member) */
export async function projectSummary(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { projectId, ym } = z
                .object({ projectId: idSchema, ym: ymSchema })
                .parse(payload || {});
            const project = await Project.findById(projectId).lean();
            assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);
            // dùng await để an toàn nếu helpers async
            assert(await canViewProject(project, uid), 'FORBIDDEN', 'FORBIDDEN', 403);

            const data = await projectSummaryAgg(projectId, ym);

            await revalidateMany(
                [tags.leaderboard(`project:${projectId}`, ym), tags.project(projectId)].filter(Boolean)
            );
            // Serialize để tránh lỗi MongoDB ObjectId
            return JSON.parse(JSON.stringify(data));
        },
        { requireAuth: true }
    );
}

/**
 * getUserReportData - Get comprehensive user report
 * Includes: tasks stats, projects stats, teams, activity log, points
 */
export async function getUserReportData(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { userId, ym } = z
                .object({ 
                    userId: z.string().optional(), 
                    ym: ymSchema 
                })
                .parse(payload || {});
            
            const targetUser = userId || uid;
            assert(
                String(targetUser) === String(uid),
                'Bạn chỉ xem được báo cáo của chính bạn',
                'FORBIDDEN',
                403
            );

            // Get monthly aggregation
            const monthlyData = await userMonthlyAgg({ ym, userId: targetUser });

            // Get additional stats from Task model
            const Task = (await import('@/model/task.model.js')).default;
            const Team = (await import('@/model/team.model.js')).default;
            const ActivityLog = (await import('@/model/activityLog.model.js')).default;

            // Get all-time stats
            const [totalTasks, completedTasks, teams, recentActivities] = await Promise.all([
                Task.countDocuments({
                    $or: [{ createdBy: targetUser }, { assignee: targetUser }],
                    deletedAt: null
                }),
                Task.countDocuments({
                    assignee: targetUser,
                    status: 'completed',
                    deletedAt: null
                }),
                Team.find({
                    'members.userId': targetUser,
                    deletedAt: null
                }).lean(),
                ActivityLog.find({
                    actor: targetUser
                })
                    .sort({ createdAt: -1 })
                    .limit(20)
                    .lean()
            ]);

            // Calculate completion rate
            const assignedTasks = await Task.countDocuments({
                assignee: targetUser,
                deletedAt: null
            });
            const completionRate = assignedTasks > 0 
                ? Math.round((completedTasks / assignedTasks) * 100) 
                : 0;

            return {
                monthly: monthlyData,
                allTime: {
                    totalTasks,
                    completedTasks,
                    assignedTasks,
                    completionRate,
                    teamsCount: teams.length,
                },
                teams: teams.map(t => ({
                    _id: t._id.toString(),
                    name: t.name,
                    description: t.description,
                    memberRole: t.members.find(m => m.userId === targetUser)?.role
                })),
                recentActivities: recentActivities.map(a => ({
                    _id: a._id.toString(),
                    type: a.type,
                    createdAt: a.createdAt,
                    payload: a.payload
                }))
            };
        },
        { requireAuth: true }
    );
}
