// data/project/processors/analytics.js
// Project analytics aggregation
// Tối ưu: Đã cache getProjectAnalytics và viết lại getProjectMemberStats để loại bỏ N+1 query.

import mongoose from 'mongoose';
import { unstable_cache as cache } from 'next/cache';
import Task from '@/model/task.model.js';
import { connectDB } from '@/lib/db.js';
import * as tags from '@/data/_shared/tags.js'; // Cần cho caching

const O = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Hàm gốc lấy project analytics (không cache)
 */
async function _getProjectAnalytics(projectId) {
    await connectDB();
    
    const pid = O(projectId);
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const taskStatsPipeline = [
        { $match: { project: pid, deletedAt: null } },
        {
            $group: {
                _id: null,
                totalTasks: { $sum: 1 },
                completedTasks: {
                    // Giả định 'completed' là trạng thái hoàn thành cuối cùng
                    $sum: { $cond: [{ $in: ['$status', ['completed', 'approved']] }, 1, 0] }
                },
                inProgressTasks: {
                    // Bao gồm các trạng thái đang thực hiện
                    $sum: { $cond: [{ $in: ['$status', ['in_progress', 'completed_await_review']] }, 1, 0] }
                },
                todoTasks: {
                    // Bao gồm các trạng thái chưa bắt đầu
                    $sum: { $cond: [{ $in: ['$status', ['draft', 'pending_approval', 'waiting_confirm']] }, 1, 0] }
                },
                overdueTasks: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    // Chưa hoàn thành
                                    { $not: { $in: ['$status', ['completed', 'approved', 'cancelled', 'rejected']] } },
                                    // Có deadline và đã qua deadline
                                    { $lt: ['$dueDate', now] },
                                    { $ne: ['$dueDate', null] }
                                ]
                            },
                            1, 0
                        ]
                    }
                },
            }
        }
    ];

    const monthlyTrendPipeline = [
        {
            $match: {
                project: pid,
                deletedAt: null,
                createdAt: { $gte: sixMonthsAgo } // Chỉ lấy task tạo trong 6 tháng gần đây
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                },
                created: { $sum: 1 },
                // Tính completed dựa trên scoredAt hoặc completedAt trong tháng đó
                completed: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $in: ['$status', ['completed', 'approved']] },
                                    // Kiểm tra ngày hoàn thành/chấm điểm có trong tháng group không
                                    { $eq: [{ $year: { $ifNull: ['$scoredAt', '$completedAt'] } }, '$_id.year'] },
                                    { $eq: [{ $month: { $ifNull: ['$scoredAt', '$completedAt'] } }, '$_id.month'] }
                                ]
                            },
                            1, 0
                        ]
                    }
                }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
            $project: {
                _id: 0,
                year: '$_id.year',
                month: '$_id.month',
                created: 1,
                completed: 1
            }
        }
    ];

    const [taskStatsResult, monthlyTrend] = await Promise.all([
        Task.aggregate(taskStatsPipeline),
        Task.aggregate(monthlyTrendPipeline)
    ]);

    const stats = taskStatsResult[0] || {
        totalTasks: 0, completedTasks: 0, inProgressTasks: 0, todoTasks: 0, overdueTasks: 0,
    };

    const result = {
        tasks: stats,
        trend: monthlyTrend.map(item => ({
            ...item,
            ym: `${item.year}-${String(item.month).padStart(2, '0')}`
        })),
        completionRate: stats.totalTasks > 0
            ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
            : 0,
    };

    return result;
}

/**
 * Lấy project analytics (đã cache)
 */
export const getProjectAnalytics = cache(
    _getProjectAnalytics,
    ['project-analytics'],
    (() => {
        const tagsList = tags.sanitizeTags(['project-analytics']);
        return tagsList.length
            ? { tags: tagsList, revalidate: 3 }
            : { revalidate: 3 };
    })()
);

/**
 * Hàm gốc lấy thống kê task theo member (không cache)
 */
async function _getProjectMemberStats(projectId, memberIds) {
    await connectDB();
    if (!memberIds || memberIds.length === 0) {
        return {};
    }

    const pid = O(projectId);

    const memberStatsPipeline = [
        {
            $match: {
                project: pid,
                deletedAt: null,
                // Chỉ xét task có assignee nằm trong danh sách members
                assignee: { $in: memberIds }
            }
        },
        {
            $group: {
                _id: '$assignee', // Group theo assignee
                total: { $sum: 1 },
                completed: {
                    $sum: { $cond: [{ $in: ['$status', ['completed', 'approved']] }, 1, 0] }
                },
                inProgress: {
                    $sum: { $cond: [{ $in: ['$status', ['in_progress', 'completed_await_review']] }, 1, 0] }
                },
                // Thêm các stats khác nếu cần, ví dụ điểm, overdue...
                overdue: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $not: { $in: ['$status', ['completed', 'approved', 'cancelled', 'rejected']] } },
                                    { $lt: ['$dueDate', new Date()] },
                                    { $ne: ['$dueDate', null] }
                                ]
                            },
                            1, 0
                        ]
                    }
                }
            }
        }
    ];

    const results = await Task.aggregate(memberStatsPipeline);

    // Chuyển kết quả aggregation thành object map userId -> stats
    const statsMap = results.reduce((acc, item) => {
        acc[item._id] = {
            total: item.total || 0,
            completed: item.completed || 0,
            inProgress: item.inProgress || 0,
            overdue: item.overdue || 0,
            // Tính các tỷ lệ nếu cần
            completionRate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0,
        };
        return acc;
    }, {});

    // Đảm bảo mọi memberId đều có entry trong kết quả (dù không có task nào)
    memberIds.forEach(id => {
        if (!statsMap[id]) {
            statsMap[id] = { total: 0, completed: 0, inProgress: 0, overdue: 0, completionRate: 0 };
        }
    });

    return statsMap;
}

/**
 * Lấy thống kê task theo member cho project (ĐÃ CACHE)
 */
export const getProjectMemberStats = cache(
    _getProjectMemberStats,
    ['project-member-stats'],
    (() => {
        const tagsList = tags.sanitizeTags(['project-member-stats', 'tasks']);
        return tagsList.length
            ? { tags: tagsList, revalidate: 3 }
            : { revalidate: 3 };
    })()
);