// data/team/processors/member-stats.js
// Tính toán thống kê cho members trong team

import mongoose from 'mongoose';
import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';

const O = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Lấy thống kê chi tiết cho một member trong team
 * @param {string} teamId - Team ID
 * @param {string} userId - External User ID
 * @param {string} ym - Year-Month format YYYY-MM (optional, mặc định tháng hiện tại)
 * @returns {Object} { projectsCount, tasksCompleted, currentMonthPoints, joinedAt }
 */
export async function getMemberStats(teamId, userId, ym) {
    const tid = O(teamId);
    
    // Tính số dự án member tham gia
    const projectsCount = await Project.countDocuments({
        team: tid,
        $or: [
            { owner: userId },
            { 'members.userId': userId }
        ]
    });

    // Lấy ngày tham gia team từ Team model
    const Team = mongoose.models.Team || mongoose.model('Team');
    const team = await Team.findById(tid, { 'members': 1 }).lean();
    const member = team?.members?.find(m => String(m.userId) === String(userId));
    const joinedAt = member?.createdAt || null;

    // Tính điểm và tasks tháng hiện tại
    const currentYm = ym || (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })();

    const [year, month] = currentYm.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 0, 0, 0));

    // Aggregate tasks trong tháng cho user này trong các projects của team
    const pipeline = [
        // Join với Project để lọc theo team
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
        
        // Lọc tasks trong tháng
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
        
        // Chuẩn hóa để tính contributions
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
        
        // Tạo contributions array
        {
            $addFields: {
                contributions: {
                    $concatArrays: [
                        // Assignee contribution
                        {
                            $cond: [
                                { $and: [
                                    { $ne: ['$assignee', null] },
                                    { $ne: ['$assignee', ''] },
                                    { $eq: ['$assignee', userId] }
                                ]},
                                [{
                                    userId: '$assignee',
                                    points: { $ifNull: ['$wsp', '$finalPoints'] },
                                    tasks: 1
                                }],
                                []
                            ]
                        },
                        // Payouts contributions
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
        
        // Group theo userId
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

    // Tính tổng số tasks đã hoàn thành (all time)
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
 * Lấy stats cho tất cả members trong team (batch)
 * @param {string} teamId - Team ID
 * @param {Array<string>} userIds - Array of external user IDs
 * @param {string} ym - Year-Month format YYYY-MM (optional)
 * @returns {Object} Map of userId -> stats
 */
export async function getBatchMemberStats(teamId, userIds, ym) {
    const results = {};
    
    // Có thể tối ưu bằng cách chạy parallel
    await Promise.all(
        userIds.map(async (userId) => {
            results[userId] = await getMemberStats(teamId, userId, ym);
        })
    );
    
    return results;
}
