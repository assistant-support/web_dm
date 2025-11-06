// data/team/processors/team-analytics.js

import mongoose from 'mongoose';
import { unstable_cache as cache } from 'next/cache'; 
import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';
import Team from '@/model/team.model.js';
import * as tags from '@/data/_shared/tags.js';

const O = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Lấy analytics tổng quan cho team (Hàm logic gốc)
 * @param {string} teamId - Team ID
 * @returns {Object} Analytics data
 */
async function _getTeamAnalytics(teamId) {
    console.log(`[Cache Miss] Running _getTeamAnalytics for ${teamId}`);
    const tid = O(teamId);

    const team = await Team.findById(tid).lean();
    if (!team) {
        throw new Error('Team không tồn tại');
    }

    const activeMembersCount = team.members?.filter(m => m.role).length || 0;

    const totalProjects = await Project.countDocuments({ team: tid });
    const activeProjects = await Project.countDocuments({ team: tid, isActive: true });

    const allTimePointsPipeline = [
        {
            $lookup: {
                from: 'projects',
                localField: 'project',
                foreignField: '_id',
                as: 'proj'
            }
        },
        { $unwind: '$proj' },
        { $match: { 'proj.team': tid } },
        {
            $match: {
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

    const allTimeResult = await Task.aggregate(allTimePointsPipeline);
    const allTimePoints = allTimeResult[0]?.totalPoints || 0;
    const allTimeTasks = allTimeResult[0]?.totalTasks || 0;

    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = currentYm.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 0, 0, 0));

    const monthlyStatsPipeline = [
        {
            $lookup: {
                from: 'projects',
                localField: 'project',
                foreignField: '_id',
                as: 'proj'
            }
        },
        { $unwind: '$proj' },
        { $match: { 'proj.team': tid } },
        {
            $match: {
                $expr: {
                    $and: [
                        { $gte: [{ $ifNull: ['$scoredAt', '$completedAt'] }, startDate] },
                        { $lt: [{ $ifNull: ['$scoredAt', '$completedAt'] }, endDate] }
                    ]
                }
            }
        },
        {
            $group: {
                _id: null,
                monthlyPoints: { $sum: { $ifNull: ['$finalPoints', 0] } },
                monthlyTasks: { $sum: 1 },
                monthlyDuration: { $sum: { $ifNull: ['$trackedDurationSec', 0] } }
            }
        }
    ];

    const monthlyResult = await Task.aggregate(monthlyStatsPipeline);
    const monthlyPoints = monthlyResult[0]?.monthlyPoints || 0;
    const monthlyTasks = monthlyResult[0]?.monthlyTasks || 0;
    const monthlyDuration = monthlyResult[0]?.monthlyDuration || 0;

    const last6MonthsTrend = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const [y, m] = ym.split('-').map(Number);
        const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 0, 0, 0));

        const trendPipeline = [
            {
                $lookup: {
                    from: 'projects',
                    localField: 'project',
                    foreignField: '_id',
                    as: 'proj'
                }
            },
            { $unwind: '$proj' },
            { $match: { 'proj.team': tid } },
            {
                $match: {
                    $expr: {
                        $and: [
                            { $gte: [{ $ifNull: ['$scoredAt', '$completedAt'] }, start] },
                            { $lt: [{ $ifNull: ['$scoredAt', '$completedAt'] }, end] }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    points: { $sum: { $ifNull: ['$finalPoints', 0] } },
                    tasks: { $sum: 1 }
                }
            }
        ];

        const trendResult = await Task.aggregate(trendPipeline);
        last6MonthsTrend.push({
            ym,
            month: d.toLocaleDateString('vi-VN', { month: 'short' }),
            points: trendResult[0]?.points || 0,
            tasks: trendResult[0]?.tasks || 0
        });
    }

    return {
        teamId: String(teamId),
        teamName: team.name,
        activeMembersCount,
        totalProjects,
        activeProjects,
        allTime: {
            points: allTimePoints,
            tasks: allTimeTasks
        },
        currentMonth: {
            ym: currentYm,
            points: monthlyPoints,
            tasks: monthlyTasks,
            durationSec: monthlyDuration
        },
        trend: last6MonthsTrend
    };
}

export const getTeamAnalytics = cache(
    _getTeamAnalytics,
    ['team-analytics'],
    {
        tags: ['team-analytics'],
        revalidate: 3 // Revalidate every 3 seconds for real-time data
    }
);