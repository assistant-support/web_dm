// data/project/processors/analytics.js
// Project analytics aggregation

import Task from '@/model/task.model.js';
import { connectDB } from '@/lib/db.js';

/**
 * Get project analytics - tasks, members, time stats
 */
export async function getProjectAnalytics(projectId) {
    await connectDB();

    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Aggregate task statistics
    const taskStats = await Task.aggregate([
        {
            $match: {
                project: projectId,
                deletedAt: null,
            }
        },
        {
            $group: {
                _id: null,
                totalTasks: { $sum: 1 },
                completedTasks: {
                    $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
                },
                inProgressTasks: {
                    $sum: { $cond: [{ $in: ['$status', ['in-progress', 'in-review']] }, 1, 0] }
                },
                todoTasks: {
                    $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] }
                },
                overdueTasks: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $ne: ['$status', 'done'] },
                                    { $lt: ['$dueDate', now] },
                                    { $ne: ['$dueDate', null] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
            }
        }
    ]);

    // Monthly trend (last 6 months)
    const monthlyTrend = await Task.aggregate([
        {
            $match: {
                project: projectId,
                deletedAt: null,
                createdAt: { $gte: sixMonthsAgo }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                },
                created: { $sum: 1 },
                completed: {
                    $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
                }
            }
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1 }
        },
        {
            $project: {
                _id: 0,
                year: '$_id.year',
                month: '$_id.month',
                created: 1,
                completed: 1
            }
        }
    ]);

    const stats = taskStats[0] || {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        overdueTasks: 0,
    };

    return {
        tasks: stats,
        trend: monthlyTrend,
        completionRate: stats.totalTasks > 0 
            ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
            : 0,
    };
}

/**
 * Get member statistics for project
 */
export async function getProjectMemberStats(projectId, memberIds) {
    await connectDB();

    const stats = {};

    for (const userId of memberIds) {
        const userTasks = await Task.aggregate([
            {
                $match: {
                    project: projectId,
                    assignee: userId,
                    deletedAt: null,
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
                    },
                    inProgress: {
                        $sum: { $cond: [{ $in: ['$status', ['in-progress', 'in-review']] }, 1, 0] }
                    },
                }
            }
        ]);

        const userStats = userTasks[0] || { total: 0, completed: 0, inProgress: 0 };
        stats[userId] = userStats;
    }

    return stats;
}
