// data/team/processors/member-stats.js
// Tối ưu: Đã viết lại `getBatchMemberStats` để loại bỏ N+1 query.
// Giờ đây, hàm này chạy 3-4 truy vấn tổng hợp thay vì N*4 truy vấn.

import mongoose from 'mongoose';
import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';
import Team from '@/model/team.model.js';

const O = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Lấy thống kê chi tiết cho một member trong team (HÀM CŨ - GIỮ LẠI NẾU CẦN)
 * @param {string} teamId - Team ID
 * (Hàm getMemberStats gốc của bạn ở đây... - không cần thay đổi nếu vẫn muốn dùng riêng lẻ)
 */
export async function getMemberStats(teamId, userId, ym) {
    const tid = O(teamId);
    const projectsCount = await Project.countDocuments({
        team: tid,
        $or: [
            { owner: userId },
            { 'members.userId': userId }
        ]
    });
    const team = await Team.findById(tid, { 'members': 1 }).lean();
    const member = team?.members?.find(m => String(m.userId) === String(userId));
    const joinedAt = member?.createdAt || null;
    const currentYm = ym || (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })();
    const [year, month] = currentYm.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 0, 0, 0));
    const pipeline = [
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
            $project: {
                assignee: 1,
                finalPoints: { $ifNull: ['$finalPoints', 0] },
                wsp: {
                    $ifNull: [
                        '$public.workerSplitPoints',
                        { $ifNull: ['$workerSplitPoints', null] }
                    ]
                },
                payouts: {
                    $ifNull: [
                        '$public.payouts',
                        { $ifNull: ['$payouts', []] }
                    ]
                }
            }
        },
        {
            $addFields: {
                contributions: {
                    $concatArrays: [
                        {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$assignee', null] },
                                        { $ne: ['$assignee', ''] },
                                        { $eq: ['$assignee', userId] }
                                    ]
                                },
                                [{
                                    userId: '$assignee',
                                    points: { $ifNull: ['$wsp', '$finalPoints'] },
                                    tasks: 1
                                }],
                                []
                            ]
                        },
                        {
                            $filter: {
                                input: {
                                    $map: {
                                        input: '$payouts',
                                        as: 'p',
                                        in: {
                                            userId: '$$p.userId',
                                            points: { $ifNull: ['$$p.points', 0] },
                                            tasks: 0
                                        }
                                    }
                                },
                                as: 'contrib',
                                cond: { $eq: ['$$contrib.userId', userId] }
                            }
                        }
                    ]
                }
            }
        },
        { $unwind: { path: '$contributions', preserveNullAndEmptyArrays: false } },
        {
            $group: {
                _id: '$contributions.userId',
                points: { $sum: '$contributions.points' },
                tasks: { $sum: '$contributions.tasks' }
            }
        }
    ];

    const monthResult = await Task.aggregate(pipeline).allowDiskUse(true);
    const monthStats = monthResult[0] || { points: 0, tasks: 0 };

    const allTimeTasksPipeline = [
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
                    { assignee: userId },
                    { 'public.payouts.userId': userId },
                    { 'payouts.userId': userId }
                ],
                $or: [
                    { status: 'COMPLETED' },
                    { status: 'APPROVED' }
                ]
            }
        },
        { $count: 'total' }
    ];

    const allTimeTasksResult = await Task.aggregate(allTimeTasksPipeline);
    const allTimeTasksCompleted = allTimeTasksResult[0]?.total || 0;

    return {
        projectsCount,
        tasksCompleted: allTimeTasksCompleted,
        currentMonthPoints: monthStats.points || 0,
        currentMonthTasks: monthStats.tasks || 0,
        joinedAt
    };
}


/**
 * Lấy stats cho tất cả members trong team (batch) - ĐÃ TỐI ƯU
 * @param {string} teamId - Team ID
 * @param {Array<string>} userIds - Array of external user IDs
 * @param {string} ym - Year-Month format YYYY-MM (optional)
 * @returns {Object} Map of userId -> stats
 */
export async function getBatchMemberStats(teamId, userIds, ym) {
    const tid = O(teamId);
    const results = {};
    userIds.forEach(uid => {
        results[uid] = {
            projectsCount: 0,
            tasksCompleted: 0,
            currentMonthPoints: 0,
            currentMonthTasks: 0,
            joinedAt: null
        };
    });

    // 1. Lấy `joinedAt`
    const team = await Team.findById(tid, { 'members': 1 }).lean();
    team?.members?.forEach(m => {
        const uid = String(m.userId);
        if (results[uid]) {
            results[uid].joinedAt = m.createdAt || null;
        }
    });

    // 2. Đếm projects (1 aggregation)
    const projectsCountAgg = await Project.aggregate([
        { $match: { team: tid } },
        {
            $project: {
                owner: 1,
                members: { $ifNull: ['$members.userId', []] }
            }
        },
        {
            $project: {
                allUsers: { $concatArrays: [['$owner'], '$members'] }
            }
        },
        { $unwind: '$allUsers' },
        { $match: { allUsers: { $in: userIds } } },
        { $group: { _id: '$allUsers', count: { $sum: 1 } } }
    ]);

    projectsCountAgg.forEach(item => {
        if (results[item._id]) {
            results[item._id].projectsCount = item.count;
        }
    });

    // 3. Tính điểm và tasks tháng hiện tại (1 aggregation)
    const currentYm = ym || (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })();

    const [year, month] = currentYm.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 0, 0, 0));

    const monthPipeline = [
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
            $project: {
                assignee: 1,
                finalPoints: { $ifNull: ['$finalPoints', 0] },
                wsp: { $ifNull: ['$public.workerSplitPoints', { $ifNull: ['$workerSplitPoints', null] }] },
                payouts: { $ifNull: ['$public.payouts', { $ifNull: ['$payouts', []] }] }
            }
        },
        {
            $addFields: {
                contributions: {
                    $concatArrays: [
                        {
                            $cond: [
                                { $and: [{ $ne: ['$assignee', null] }, { $ne: ['$assignee', ''] }] },
                                [{
                                    userId: '$assignee',
                                    points: { $ifNull: ['$wsp', '$finalPoints'] },
                                    tasks: 1
                                }],
                                []
                            ]
                        },
                        {
                            $map: {
                                input: '$payouts',
                                as: 'p',
                                in: {
                                    userId: '$$p.userId',
                                    points: { $ifNull: ['$$p.points', 0] },
                                    tasks: 0
                                }
                            }
                        }
                    ]
                }
            }
        },
        { $unwind: { path: '$contributions', preserveNullAndEmptyArrays: false } },
        { $match: { 'contributions.userId': { $in: userIds } } },
        {
            $group: {
                _id: '$contributions.userId',
                points: { $sum: '$contributions.points' },
                tasks: { $sum: '$contributions.tasks' }
            }
        }
    ];

    const monthResult = await Task.aggregate(monthPipeline).allowDiskUse(true);
    monthResult.forEach(item => {
        if (results[item._id]) {
            results[item._id].currentMonthPoints = item.points || 0;
            results[item._id].currentMonthTasks = item.tasks || 0;
        }
    });


    // 4. Tính tổng số tasks đã hoàn thành (all time) (1 aggregation)
    const allTimeTasksPipeline = [
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
                $or: [{ status: 'COMPLETED' }, { status: 'APPROVED' }],
                $or: [
                    { assignee: { $in: userIds } },
                    { 'public.payouts.userId': { $in: userIds } },
                    { 'payouts.userId': { $in: userIds } }
                ]
            }
        },
        {
            $project: {
                assignee: 1,
                payoutUsers: { $ifNull: ['$public.payouts.userId', { $ifNull: ['$payouts.userId', []] }] }
            }
        },
        {
            $addFields: {
                allUsers: {
                    $filter: {
                        input: { $concatArrays: [['$assignee'], '$payoutUsers'] },
                        as: 'uid',
                        cond: { $in: ['$$uid', userIds] }
                    }
                }
            }
        },
        { $unwind: '$allUsers' },
        { $group: { _id: '$allUsers', total: { $sum: 1 } } }
    ];

    const allTimeTasksResult = await Task.aggregate(allTimeTasksPipeline);
    allTimeTasksResult.forEach(item => {
        if (results[item._id]) {
            results[item._id].tasksCompleted = item.total || 0;
        }
    });

    return results;
}