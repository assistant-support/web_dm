// data/project/actions/analytics.js
// Project analytics server actions
// Tối ưu: Sử dụng repo.getDetail thay vì Project.findById

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert } from '@/lib/action-utils.js';
import ActivityLog from '@/model/activityLog.model.js';
// Tối ưu: Import hàm repo
import { getDetail as getProjectDetailRepo } from '@/data/project/processors/repo.js';
// Tối ưu: Import hàm analytics đã cache
import { getProjectAnalytics, getProjectMemberStats } from '@/data/project/processors/analytics.js';

/**
 * Lấy project analytics
 */
export async function getAnalytics(projectId) {
    return runAction(
        async ({ user }) => {
            await connectDB();

            // Tối ưu: Sử dụng hàm repo đã cache
            const project = await getProjectDetailRepo(projectId, { lean: true });
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const isMember = (project.members || []).some(
                m => String(m.userId) === String(user.externalUserId)
            );
            assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

            // Tối ưu: Gọi hàm analytics đã cache
            const analytics = await getProjectAnalytics(projectId);

            return JSON.parse(JSON.stringify(analytics));
        },
        { requireAuth: true }
    );
}

/**
 * Lấy thống kê thành viên
 */
export async function getMemberStats(projectId) {
    return runAction(
        async ({ user }) => {
            await connectDB();

            // Tối ưu: Sử dụng hàm repo đã cache
            const project = await getProjectDetailRepo(projectId, { lean: true });
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const isMember = (project.members || []).some(
                m => String(m.userId) === String(user.externalUserId)
            );
            assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

            const memberIds = (project.members || []).map(m => m.userId);
            // Tối ưu: Gọi hàm stats đã sửa N+1
            const stats = await getProjectMemberStats(projectId, memberIds);

            return JSON.parse(JSON.stringify(stats));
        },
        { requireAuth: true }
    );
}

/**
 * Lấy project activities
 */
export async function getActivities({ projectId, limit = 20, skip = 0 }) {
    return runAction(
        async ({ user }) => {
            await connectDB();

            // Tối ưu: Sử dụng hàm repo đã cache
            const project = await getProjectDetailRepo(projectId, { lean: true });
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const isMember = (project.members || []).some(
                m => String(m.userId) === String(user.externalUserId)
            );
            assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

            // Logic lấy activity giữ nguyên
            const activities = await ActivityLog.find({ project: projectId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip)
                .lean();

            const total = await ActivityLog.countDocuments({ project: projectId });

            return JSON.parse(JSON.stringify({
                items: activities,
                total,
                hasMore: skip + activities.length < total,
            }));
        },
        { requireAuth: true }
    );
}