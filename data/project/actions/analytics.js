// data/project/actions/analytics.js
// Project analytics server actions

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert } from '@/lib/action-utils.js';
import Project from '@/model/project.model.js';
import ActivityLog from '@/model/activityLog.model.js';
import { getProjectAnalytics, getProjectMemberStats } from '@/data/project/processors/analytics.js';

/**
 * Get project analytics
 */
export async function getAnalytics(projectId) {
    return runAction(
        async ({ user }) => {
            await connectDB();

            // Check if user is project member
            const project = await Project.findById(projectId).lean();
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const isMember = project.members.some(
                m => String(m.userId) === String(user.externalUserId)
            );
            assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

            const analytics = await getProjectAnalytics(projectId);
            
            // Serialize
            return JSON.parse(JSON.stringify(analytics));
        },
        { requireAuth: true }
    );
}

/**
 * Get member statistics
 */
export async function getMemberStats(projectId) {
    return runAction(
        async ({ user }) => {
            await connectDB();

            // Check if user is project member
            const project = await Project.findById(projectId).lean();
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const isMember = project.members.some(
                m => String(m.userId) === String(user.externalUserId)
            );
            assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

            const memberIds = project.members.map(m => m.userId);
            const stats = await getProjectMemberStats(projectId, memberIds);
            
            // Serialize
            return JSON.parse(JSON.stringify(stats));
        },
        { requireAuth: true }
    );
}

/**
 * Get project activities
 */
export async function getActivities({ projectId, limit = 20, skip = 0 }) {
    return runAction(
        async ({ user }) => {
            await connectDB();

            // Check if user is project member
            const project = await Project.findById(projectId).lean();
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const isMember = project.members.some(
                m => String(m.userId) === String(user.externalUserId)
            );
            assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

            const activities = await ActivityLog.find({ project: projectId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip)
                .lean();

            const total = await ActivityLog.countDocuments({ project: projectId });

            // Serialize
            return JSON.parse(JSON.stringify({
                items: activities,
                total,
                hasMore: skip + activities.length < total,
            }));
        },
        { requireAuth: true }
    );
}
