// data/project/processors/member-stats.js
// Tính toán thống kê thành viên trong dự án

import mongoose from 'mongoose';
import { unstable_cache as cache } from 'next/cache';
import Task from '@/model/task.model.js';
import * as tags from '@/data/_shared/tags.js';

const O = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Lấy stats của một member trong project
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID
 * @param {string} ym - Year-month (YYYY-MM), null = current month
 * @returns {Object} Member stats
 */
async function _getMemberStats(projectId, userId, ym) {
    const now = new Date();
    const targetYM = ym || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = targetYM.split('-').map(Number);

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 0, 0, 0));

    const pid = O(projectId);
    const uid = String(userId);

    // Thống kê tháng hiện tại
    const monthlyPipeline = [
        {
            $match: {
                project: pid,
                assignee: uid,
                completedAt: {
                    $gte: startOfMonth,
                    $lt: endOfMonth
                },
                $or: [
                    { status: 'COMPLETED' },
                    { status: 'APPROVED' }
                ]
            }
        },
        {
            $group: {
                _id: null,
                points: { $sum: { $ifNull: ['$finalPoints', 0] } },
                tasks: { $sum: 1 },
                duration: { $sum: { $ifNull: ['$trackedDurationSec', 0] } }
            }
        }
    ];

    const monthlyResult = await Task.aggregate(monthlyPipeline);
    const monthlyData = monthlyResult[0] || { points: 0, tasks: 0, duration: 0 };

    // Thống kê all-time
    const allTimePipeline = [
        {
            $match: {
                project: pid,
                assignee: uid,
                $or: [
                    { status: 'COMPLETED' },
                    { status: 'APPROVED' }
                ]
            }
        },
        {
            $group: {
                _id: null,
                totalPoints: { $sum: { $ifNull: ['$finalPoints', 0] } },
                totalTasks: { $sum: 1 }
            }
        }
    ];

    const allTimeResult = await Task.aggregate(allTimePipeline);
    const allTimeData = allTimeResult[0] || { totalPoints: 0, totalTasks: 0 };

    // Đếm task đang active
    const activeTasks = await Task.countDocuments({
        project: pid,
        assignee: uid,
        status: { $in: ['TODO', 'IN_PROGRESS', 'WAITING_CONFIRM'] }
    });

    return {
        userId: uid,
        projectId: String(projectId),
        currentMonthPoints: monthlyData.points,
        currentMonthTasks: monthlyData.tasks,
        currentMonthDuration: monthlyData.duration,
        totalPoints: allTimeData.totalPoints,
        totalTasks: allTimeData.totalTasks,
        activeTasks,
        yearMonth: targetYM
    };
}

/**
 * Lấy stats cho nhiều members cùng lúc (tối ưu)
 * @param {string} projectId - Project ID
 * @param {string[]} userIds - Array of user IDs
 * @param {string} ym - Year-month
 * @returns {Object} Map userId -> stats
 */
async function _getBatchMemberStats(projectId, userIds, ym) {
    console.log(`[Cache Miss] Running _getBatchMemberStats for project ${projectId}`);

    const now = new Date();
    const targetYM = ym || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = targetYM.split('-').map(Number);

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 0, 0, 0));

    const pid = O(projectId);
    const uids = userIds.map(String);

    // Query 1: Monthly stats cho tất cả users
    const monthlyPipeline = [
        {
            $match: {
                project: pid,
                assignee: { $in: uids },
                completedAt: {
                    $gte: startOfMonth,
                    $lt: endOfMonth
                },
                $or: [
                    { status: 'COMPLETED' },
                    { status: 'APPROVED' }
                ]
            }
        },
        {
            $group: {
                _id: '$assignee',
                points: { $sum: { $ifNull: ['$finalPoints', 0] } },
                tasks: { $sum: 1 },
                duration: { $sum: { $ifNull: ['$trackedDurationSec', 0] } }
            }
        }
    ];

    // Query 2: All-time stats
    const allTimePipeline = [
        {
            $match: {
                project: pid,
                assignee: { $in: uids },
                $or: [
                    { status: 'COMPLETED' },
                    { status: 'APPROVED' }
                ]
            }
        },
        {
            $group: {
                _id: '$assignee',
                totalPoints: { $sum: { $ifNull: ['$finalPoints', 0] } },
                totalTasks: { $sum: 1 }
            }
        }
    ];

    // Query 3: Active tasks count
    const activePipeline = [
        {
            $match: {
                project: pid,
                assignee: { $in: uids },
                status: { $in: ['TODO', 'IN_PROGRESS', 'WAITING_CONFIRM'] }
            }
        },
        {
            $group: {
                _id: '$assignee',
                activeTasks: { $sum: 1 }
            }
        }
    ];

    const [monthlyResults, allTimeResults, activeResults] = await Promise.all([
        Task.aggregate(monthlyPipeline),
        Task.aggregate(allTimePipeline),
        Task.aggregate(activePipeline)
    ]);

    // Map results
    const monthlyMap = new Map(monthlyResults.map(r => [r._id, r]));
    const allTimeMap = new Map(allTimeResults.map(r => [r._id, r]));
    const activeMap = new Map(activeResults.map(r => [r._id, r.activeTasks]));

    // Build result object
    const result = {};
    for (const uid of uids) {
        const monthly = monthlyMap.get(uid) || { points: 0, tasks: 0, duration: 0 };
        const allTime = allTimeMap.get(uid) || { totalPoints: 0, totalTasks: 0 };
        const active = activeMap.get(uid) || 0;

        result[uid] = {
            userId: uid,
            projectId: String(projectId),
            currentMonthPoints: monthly.points,
            currentMonthTasks: monthly.tasks,
            currentMonthDuration: monthly.duration,
            totalPoints: allTime.totalPoints,
            totalTasks: allTime.totalTasks,
            activeTasks: active,
            yearMonth: targetYM
        };
    }

    return result;
}

/**
 * Cached version - lấy stats cho nhiều members
 * Cache 3 giây, revalidate khi có thay đổi project/task
 */
export const getBatchProjectMemberStats = (projectId, userIds, ym) => {
    const tagList = tags.sanitizeTags([
        tags.project(projectId),
        tags.tasks(),
        'project-member-stats'
    ]);

    const options = { revalidate: 3 };
    if (tagList.length > 0) {
        options.tags = tagList;
    }

    return cache(
        async () => _getBatchMemberStats(projectId, userIds, ym),
        ['project-member-stats', String(projectId ?? ''), String(ym ?? '')],
        options
    )();
};

/**
 * Cached version - lấy stats cho 1 member
 */
export const getProjectMemberStats = (projectId, userId, ym) => {
    const tagList = tags.sanitizeTags([
        tags.project(projectId),
        tags.tasks(),
        userId ? `project-member-stats-${userId}` : undefined
    ]);

    const options = { revalidate: 3 };
    if (tagList.length > 0) {
        options.tags = tagList;
    }

    return cache(
        async () => _getMemberStats(projectId, userId, ym),
        ['project-member-stats-single', String(projectId ?? ''), String(userId ?? ''), String(ym ?? '')],
        options
    )();
};
