// /data/report/processors/aggregations.js
// Cấu trúc: /data/report/processors/*
// Mục đích: Các hàm thuần (không 'use server') để tổng hợp báo cáo tháng (B10)
// - userMonthlyAgg: tổng hợp theo người dùng (điểm, thời lượng, số task) + breakdown theo project & theo ngày
// - projectSummaryAgg: tổng hợp theo project (điểm, thời lượng, số task) + breakdown theo assignee & theo ngày
// Ghi chú:
//   * Mốc thời gian tính theo UTC: dateKey = $ifNull(['$scoredAt', '$completedAt'])
//   * Điểm của user = (assigneeWorkerSplit || finalPoints nếu không tách) + tổng payouts tới user
//   * Thời lượng chỉ cộng cho assignee: trackedDurationSec (null → 0)
//   * Trả về plain JSON (không trả Mongoose raw)

import mongoose from 'mongoose';
import Task from '@/model/task.model.js';

const O = (id) => new mongoose.Types.ObjectId(String(id));

/** Tính mốc bắt đầu & kết thúc tháng UTC từ ym='YYYY-MM' */
function monthRangeUtc(ym) {
    const [y, m] = String(ym).split('-').map((x) => Number(x));
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0)); // 00:00:00 UTC ngày đầu tháng
    const end = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 0, 0, 0, 0)); // 00:00:00 UTC ngày đầu tháng kế
    return { start, end };
}

/**
 * userMonthlyAgg({ ym, userId })
 * - Tổng hợp điểm/thời lượng/số task (chỉ tính các task trong tháng theo dateKey)
 * - Lọc task liên quan user: assignee == userId hoặc payouts (public.payouts|payouts) chứa userId
 * - points = assigneePoints (wspOrFinal) + payoutPoints(to user)
 * - durationSec = trackedDurationSec chỉ khi user là assignee
 * - tasksCompleted = số task user là assignee (đã hoàn tất/tháng)
 */
export async function userMonthlyAgg({ ym, userId }) {
    const { start, end } = monthRangeUtc(ym);
    const uid = String(userId);

    const pipeline = [
        // Match theo dateKey trong tháng
        {
            $match: {
                $expr: {
                    $and: [
                        { $gte: [{ $ifNull: ['$scoredAt', '$completedAt'] }, start] },
                        { $lt: [{ $ifNull: ['$scoredAt', '$completedAt'] }, end] },
                    ],
                },
            },
        },
        // Chỉ lấy task liên quan user: assignee == uid hoặc payouts có uid
        {
            $match: {
                $or: [
                    { assignee: uid },
                    {
                        $expr: {
                            $gt: [
                                {
                                    $size: {
                                        $filter: {
                                            input: {
                                                $ifNull: [
                                                    '$public.payouts',
                                                    { $ifNull: ['$payouts', []] },
                                                ],
                                            },
                                            as: 'p',
                                            cond: { $eq: ['$$p.userId', uid] },
                                        },
                                    },
                                },
                                0,
                            ],
                        },
                    },
                ],
            },
        },
        // Chuẩn hoá trường cần dùng (hỗ trợ path kép)
        {
            $project: {
                project: 1,
                assignee: 1,
                finalPoints: { $ifNull: ['$finalPoints', 0] },
                trackedDurationSec: { $ifNull: ['$trackedDurationSec', 0] },
                wsp: {
                    $ifNull: [
                        '$public.workerSplitPoints',
                        { $ifNull: ['$workerSplitPoints', null] },
                    ],
                },
                payouts: {
                    $ifNull: [
                        '$public.payouts',
                        { $ifNull: ['$payouts', []] },
                    ],
                },
                dateKey: { $ifNull: ['$scoredAt', '$completedAt'] },
            },
        },
        // Tính đóng góp theo user
        {
            $addFields: {
                // Điểm cho user nếu là assignee
                assigneePoints: {
                    $cond: [
                        { $eq: ['$assignee', uid] },
                        { $ifNull: ['$wsp', '$finalPoints'] },
                        0,
                    ],
                },
                // Payouts tới user
                payoutPoints: {
                    $sum: {
                        $map: {
                            input: {
                                $filter: {
                                    input: '$payouts',
                                    as: 'p',
                                    cond: { $eq: ['$$p.userId', uid] },
                                },
                            },
                            as: 'fp',
                            in: { $ifNull: ['$$fp.points', 0] },
                        },
                    },
                },
                // Thời lượng chỉ cho assignee
                durationForUser: {
                    $cond: [{ $eq: ['$assignee', uid] }, '$trackedDurationSec', 0],
                },
                // Đếm task hoàn tất cho user (khi là assignee)
                taskCompletedForUser: {
                    $cond: [{ $eq: ['$assignee', uid] }, 1, 0],
                },
                dayStr: {
                    $dateToString: { format: '%Y-%m-%d', date: '$dateKey', timezone: 'UTC' },
                },
            },
        },
        // Phân nhánh tính totals / byProject / daily
        {
            $facet: {
                totals: [
                    {
                        $group: {
                            _id: null,
                            points: { $sum: { $add: ['$assigneePoints', '$payoutPoints'] } },
                            durationSec: { $sum: '$durationForUser' },
                            tasksCompleted: { $sum: '$taskCompletedForUser' },
                        },
                    },
                ],
                byProject: [
                    {
                        $group: {
                            _id: '$project',
                            points: { $sum: { $add: ['$assigneePoints', '$payoutPoints'] } },
                            durationSec: { $sum: '$durationForUser' },
                            tasksCompleted: { $sum: '$taskCompletedForUser' },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            projectId: {
                                $cond: [{ $ifNull: ['$_id', false] }, { $toString: '$_id' }, null],
                            },
                            points: 1,
                            durationSec: 1,
                            tasksCompleted: 1,
                        },
                    },
                    { $sort: { points: -1 } },
                ],
                daily: [
                    {
                        $group: {
                            _id: '$dayStr',
                            points: { $sum: { $add: ['$assigneePoints', '$payoutPoints'] } },
                            durationSec: { $sum: '$durationForUser' },
                            tasksCompleted: { $sum: '$taskCompletedForUser' },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            date: '$_id',
                            points: 1,
                            durationSec: 1,
                            tasksCompleted: 1,
                        },
                    },
                    { $sort: { date: 1 } },
                ],
            },
        },
    ];

    const [res] = await Task.aggregate(pipeline).allowDiskUse(true);
    const totalsDoc = (res?.totals?.[0] ?? null) || null;

    return {
        ym: String(ym),
        userId: uid,
        totals: {
            points: totalsDoc?.points ?? 0,
            durationSec: totalsDoc?.durationSec ?? 0,
            tasksCompleted: totalsDoc?.tasksCompleted ?? 0,
        },
        byProject: Array.isArray(res?.byProject) ? res.byProject : [],
        daily: Array.isArray(res?.daily) ? res.daily : [],
    };
}

/**
 * projectSummaryAgg(projectId, ym)
 * - Tổng hợp cho 1 project trong tháng
 * - totals.points = sum(finalPoints)
 * - byAssignee.pointsForAssignee = workerSplit (nếu có) else finalPoints
 * - byDay.points = sum(finalPoints)
 */
export async function projectSummaryAgg(projectId, ym) {
    const { start, end } = monthRangeUtc(ym);
    const pid = O(projectId);

    const pipeline = [
        {
            $match: {
                project: pid,
                $expr: {
                    $and: [
                        { $gte: [{ $ifNull: ['$scoredAt', '$completedAt'] }, start] },
                        { $lt: [{ $ifNull: ['$scoredAt', '$completedAt'] }, end] },
                    ],
                },
            },
        },
        {
            $project: {
                assignee: 1,
                finalPoints: { $ifNull: ['$finalPoints', 0] },
                trackedDurationSec: { $ifNull: ['$trackedDurationSec', 0] },
                wsp: {
                    $ifNull: [
                        '$public.workerSplitPoints',
                        { $ifNull: ['$workerSplitPoints', null] },
                    ],
                },
                dateKey: { $ifNull: ['$scoredAt', '$completedAt'] },
            },
        },
        {
            $addFields: {
                pointsForAssignee: { $ifNull: ['$wsp', '$finalPoints'] },
                dayStr: {
                    $dateToString: { format: '%Y-%m-%d', date: '$dateKey', timezone: 'UTC' },
                },
            },
        },
        {
            $facet: {
                totals: [
                    {
                        $group: {
                            _id: null,
                            points: { $sum: '$finalPoints' },
                            durationSec: { $sum: '$trackedDurationSec' },
                            tasksCompleted: { $sum: 1 },
                        },
                    },
                ],
                byAssignee: [
                    {
                        $group: {
                            _id: '$assignee',
                            pointsForAssignee: { $sum: '$pointsForAssignee' },
                            durationSec: { $sum: '$trackedDurationSec' },
                            tasksCompleted: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            userId: {
                                $cond: [
                                    { $ifNull: ['$_id', false] },
                                    { $toString: '$_id' },
                                    null,
                                ],
                            },
                            pointsForAssignee: 1,
                            durationSec: 1,
                            tasksCompleted: 1,
                        },
                    },
                    { $match: { userId: { $ne: null } } },
                    { $sort: { pointsForAssignee: -1 } },
                ],
                byDay: [
                    {
                        $group: {
                            _id: '$dayStr',
                            points: { $sum: '$finalPoints' },
                            durationSec: { $sum: '$trackedDurationSec' },
                            tasksCompleted: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            date: '$_id',
                            points: 1,
                            durationSec: 1,
                            tasksCompleted: 1,
                        },
                    },
                    { $sort: { date: 1 } },
                ],
            },
        },
    ];

    const [res] = await Task.aggregate(pipeline).allowDiskUse(true);
    const totalsDoc = (res?.totals?.[0] ?? null) || null;

    return {
        ym: String(ym),
        projectId: String(projectId),
        totals: {
            points: totalsDoc?.points ?? 0,
            durationSec: totalsDoc?.durationSec ?? 0,
            tasksCompleted: totalsDoc?.tasksCompleted ?? 0,
        },
        byAssignee: Array.isArray(res?.byAssignee) ? res.byAssignee : [],
        byDay: Array.isArray(res?.byDay) ? res.byDay : [],
    };
}
