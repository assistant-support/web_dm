// /data/leaderboard/processors/aggregations.js
// Cấu trúc: /data/leaderboard/processors/*
// Mục đích: Tổng hợp điểm/thành tích để dựng Leaderboard theo tháng cho Team/Project (B10)
// - teamLeaderboardAgg({ teamId, ym, limit=20, cursor })
// - projectLeaderboardAgg({ projectId, ym, limit=20, cursor })
// Ghi chú:
//   * Mốc thời gian UTC: dateKey = $ifNull(['$scoredAt', '$completedAt'])
//   * Đóng góp theo user = entry của assignee (wspOrFinal, duration, task=1) + entries payouts (points, 0 duration, 0 task)
//   * Phân trang cursor dạng "points|userId" theo sort points desc, userId asc (ổn định)

import mongoose from 'mongoose';
import Task from '@/model/task.model.js';

const O = (id) => new mongoose.Types.ObjectId(String(id));

function monthRangeUtc(ym) {
    const [y, m] = String(ym).split('-').map((x) => Number(x));
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 0, 0, 0));
    return { start, end };
}

/** Dựng contributions array cho mỗi task (1 phần tử assignee + N phần tử payouts) */
function contributionsExpr() {
    return {
        $concatArrays: [
            {
                $cond: [
                    { $and: [{ $ne: ['$assignee', null] }, { $ne: ['$assignee', ''] }] },
                    [
                        {
                            userId: '$assignee',
                            points: { $ifNull: ['$wsp', '$finalPoints'] },
                            durationSec: '$trackedDurationSec',
                            tasksCompleted: 1,
                        },
                    ],
                    [],
                ],
            },
            {
                $map: {
                    input: { $ifNull: ['$payouts', []] },
                    as: 'p',
                    in: {
                        userId: '$$p.userId',
                        points: { $ifNull: ['$$p.points', 0] },
                        durationSec: 0,
                        tasksCompleted: 0,
                    },
                },
            },
        ],
    };
}

/** Áp dụng cursor "points|userId" cho kết quả đã sort */
function applyCursorPagination(docs, { limit = 20, cursor }) {
    if (!cursor) {
        const items = docs.slice(0, limit);
        const last = items[items.length - 1];
        const nextCursor = last ? `${last.points}|${last.userId}` : undefined;
        return { items, nextCursor };
    }
    const [pStr, uid] = String(cursor).split('|');
    const p = Number(pStr);
    const startIdx = docs.findIndex(
        (d) => d.points < p || (d.points === p && String(d.userId) > String(uid))
    );
    const begin = startIdx >= 0 ? startIdx : docs.length; // nếu không tìm thấy → đã hết
    const items = docs.slice(begin, begin + limit);
    const last = items[items.length - 1];
    const nextCursor = last ? `${last.points}|${last.userId}` : undefined;
    return { items, nextCursor };
}

/**
 * teamLeaderboardAgg({ teamId, ym, limit, cursor })
 * - Lấy tasks thuộc các project của teamId, trong tháng
 * - Tính contributions theo user, group & sort
 */
export async function teamLeaderboardAgg({ teamId, ym, limit = 20, cursor }) {
    const { start, end } = monthRangeUtc(ym);
    const tid = O(teamId);

    const pipeline = [
        // Join Project để lọc team
        {
            $lookup: {
                from: 'projects',
                localField: 'project',
                foreignField: '_id',
                as: 'proj',
            },
        },
        { $unwind: '$proj' },
        { $match: { 'proj.team': tid } },
        // Lọc theo dateKey trong tháng
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
        // Chuẩn hoá trường & contributions (hỗ trợ path kép cho wsp & payouts)
        {
            $project: {
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
                assignee: 1,
            },
        },
        { $addFields: { contributions: contributionsExpr() } },
        { $unwind: '$contributions' },
        // Group theo userId
        {
            $group: {
                _id: '$contributions.userId',
                points: { $sum: '$contributions.points' },
                durationSec: { $sum: '$contributions.durationSec' },
                tasksCompleted: { $sum: '$contributions.tasksCompleted' },
            },
        },
        {
            $project: {
                _id: 0,
                userId: '$_id',
                points: 1,
                durationSec: 1,
                tasksCompleted: 1,
            },
        },
        { $sort: { points: -1, userId: 1 } },
    ];

    const rows = await Task.aggregate(pipeline).allowDiskUse(true);
    const { items, nextCursor } = applyCursorPagination(rows, { limit, cursor });
    const ranked = items.map((r, idx) => ({ rank: idx + 1, ...r }));
    return { ym: String(ym), teamId: String(teamId), items: ranked, nextCursor };
}

/**
 * projectLeaderboardAgg({ projectId, ym, limit, cursor })
 * - Lọc theo projectId duy nhất
 */
export async function projectLeaderboardAgg({ projectId, ym, limit = 20, cursor }) {
    const { start, end } = monthRangeUtc(ym);
    const pid = O(projectId);

    const pipeline = [
        { $match: { project: pid } },
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
        {
            $project: {
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
                assignee: 1,
            },
        },
        { $addFields: { contributions: contributionsExpr() } },
        { $unwind: '$contributions' },
        {
            $group: {
                _id: '$contributions.userId',
                points: { $sum: '$contributions.points' },
                durationSec: { $sum: '$contributions.durationSec' },
                tasksCompleted: { $sum: '$contributions.tasksCompleted' },
            },
        },
        {
            $project: {
                _id: 0,
                userId: '$_id',
                points: 1,
                durationSec: 1,
                tasksCompleted: 1,
            },
        },
        { $sort: { points: -1, userId: 1 } },
    ];

    const rows = await Task.aggregate(pipeline).allowDiskUse(true);
    const { items, nextCursor } = applyCursorPagination(rows, { limit, cursor });
    const ranked = items.map((r, idx) => ({ rank: idx + 1, ...r }));
    return { ym: String(ym), projectId: String(projectId), items: ranked, nextCursor };
}
