// app/actions/get-project-analytics.js
// Server Action: Aggregate project analytics statistics

'use server';

import { cache } from 'react';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db.js';
import { runAction, assert } from '@/lib/action-utils.js';
import { canViewProject } from '@/lib/permissions.js';
import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';
import User from '@/model/user.model.js';
import { TASK_STATUS } from '@/model/common/enums.js';

/**
 * Aggregate analytics for a given project.
 * @param {string} projectId - Project identifier (string or ObjectId).
 * @param {string} userId - Current user's external ID.
 * @returns {Promise<Object>} Project analytics payload.
 */
async function _getProjectAnalytics(projectId, userId) {
    await connectDB();

    return runAction(async ({ user }) => {
        const requesterId = userId || user.externalUserId;
        assert(requesterId, 'UNAUTHENTICATED', 'FORBIDDEN', 403);

        assert(mongoose.Types.ObjectId.isValid(projectId), 'INVALID_PROJECT_ID', 'BAD_REQUEST', 400);

        const project = await Project.findById(projectId).lean();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        const canView = await canViewProject(requesterId, project);
        assert(canView, 'FORBIDDEN', 'FORBIDDEN', 403);

        const projectObjectId = new mongoose.Types.ObjectId(projectId);

        const taskMatchStage = {
            project: projectObjectId,
            parentTask: null,
            deletedAt: null,
        };

        const taskAggregation = await Task.aggregate([
            { $match: taskMatchStage },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalPoints: {
                        $sum: {
                            $cond: [
                                { $eq: ['$status', TASK_STATUS.COMPLETED] },
                                { $ifNull: ['$finalPoints', 0] },
                                0,
                            ],
                        },
                    },
                },
            },
        ]);

        let totalTasks = 0;
        let completedTasks = 0;
        let inProgressTasks = 0;
        let totalPointsAwarded = 0;

        for (const entry of taskAggregation) {
            totalTasks += entry.count;
            if (entry._id === TASK_STATUS.COMPLETED) {
                completedTasks = entry.count;
                totalPointsAwarded = entry.totalPoints;
            }
            if (entry._id === TASK_STATUS.IN_PROGRESS) {
                inProgressTasks = entry.count;
            }
        }

        const memberUserIds = (project.members || []).map((m) => String(m.userId));

        const memberStatsPipeline = [
            { $match: { ...taskMatchStage, assignee: { $in: memberUserIds } } },
            {
                $group: {
                    _id: '$assignee',
                    tasksAssigned: { $sum: 1 },
                    tasksCompleted: {
                        $sum: {
                            $cond: [
                                { $eq: ['$status', TASK_STATUS.COMPLETED] },
                                1,
                                0,
                            ],
                        },
                    },
                    pointsEarned: {
                        $sum: {
                            $cond: [
                                { $eq: ['$status', TASK_STATUS.COMPLETED] },
                                { $ifNull: ['$finalPoints', 0] },
                                0,
                            ],
                        },
                    },
                },
            },
        ];

        const memberStatsAggregation = await Task.aggregate(memberStatsPipeline).exec();

        const userDisplayMap = new Map();

        if (memberUserIds.length) {
            const users = await User.find({ externalUserId: { $in: memberUserIds } })
                .select('externalUserId displayName fullName firstName lastName')
                .lean();

            for (const u of users) {
                const name =
                    u.displayName ||
                    u.fullName ||
                    [u.firstName, u.lastName].filter(Boolean).join(' ') ||
                    u.externalUserId;
                userDisplayMap.set(String(u.externalUserId), name);
            }
        }

        const memberStats = (project.members || []).map((member) => {
            const stats = memberStatsAggregation.find((s) => s._id === member.userId) || {
                tasksAssigned: 0,
                tasksCompleted: 0,
                pointsEarned: 0,
            };

            return {
                userId: member.userId,
                userName: userDisplayMap.get(member.userId) || member.userId,
                role: member.role,
                tasksAssigned: stats.tasksAssigned || 0,
                tasksCompleted: stats.tasksCompleted || 0,
                pointsEarned: stats.pointsEarned || 0,
            };
        });

        return {
            projectId: projectId,
            totalTasks,
            completedTasks,
            inProgressTasks,
            totalPointsAwarded,
            memberStats,
        };
    }, { requireAuth: true, allowCachedUser: true });
}

export const getProjectAnalytics = cache(_getProjectAnalytics);

export default getProjectAnalytics;
