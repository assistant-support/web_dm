// /data/task/processors/repo.js
// Cấu trúc: /data/task/processors/*
// Mục đích: Repo wrapper cho Public Board & Claim, sử dụng methods/statics sẵn có của Task model.
// - Không thay đổi schema Task/Project/Team.
// - Trả về PlainTask/PlainClaim (serialize an toàn — không trả Mongoose raw).

import mongoose from 'mongoose';
import Task from '@/model/task.model.js';
import Project from '@/model/project.model.js';
import { asPlainTask } from '@/lib/serialize.js';
import { AppError } from '@/lib/errors.js';
import { TASK_SCOPE, CLAIM_MODE } from '@/model/common/enums.js';
import { computeFromB9Input } from '@/data/task/processors/compute.js';

const O = (id) => new mongoose.Types.ObjectId(String(id));

/** Chuẩn hoá claim ở Task.public.claims[] thành PlainClaim (an toàn cho client) */
function asPlainClaim(c) {
    if (!c) return null;
    return {
        id: String(c._id),
        userId: String(c.userId),
        status: String(c.status),
        appliedAt: c.appliedAt ? new Date(c.appliedAt).toISOString() : null,
        decidedAt: c.decidedAt ? new Date(c.decidedAt).toISOString() : null,
        decidedBy: c.decidedBy ? String(c.decidedBy) : null,
        note: c.note ?? null,
    };
}

/** Tạo public draft task (scope=public, chưa publish) */
export async function createPublicDraftTask({
    title,
    description = '',
    initialPoints = 0,
    priority,
    workType = null,
    platforms = [],
    tags = [],
    claimMode = CLAIM_MODE.AUTO,
    requiredPoints = 0,
    docsEnabled = false,
    createdBy,
}) {
    const t = await Task.createPublicTask({
        title,
        description,
        postedBy: createdBy,
        claimMode,
        requiredPoints,
        docsEnabled,
        workType,
        platforms,
        tags,
        priority,
    });

    // Gán initialPoints nếu truyền vào
    if (initialPoints && Number(initialPoints) > 0) {
        t.initialPoints = Number(initialPoints);
        await t.save();
    }

    return asPlainTask(t);
}

/** Publish public task (task phải scope=public) */
export async function publishPublicTask(taskId) {
    const t = await Task.findById(O(taskId));
    if (!t) throw new AppError('Task không tồn tại', 'NOT_FOUND', 404);
    const updated = await t.publishPublic();
    return asPlainTask(updated);
}

/** Unpublish public task */
export async function unpublishPublicTask(taskId) {
    const t = await Task.findById(O(taskId));
    if (!t) throw new AppError('Task không tồn tại', 'NOT_FOUND', 404);
    const updated = await t.unpublishPublic();
    return asPlainTask(updated);
}

/** Publish từ task dự án sang public task mới */
export async function publishFromProjectTask(originalTaskId, { postedBy, claimMode = CLAIM_MODE.AUTO, requiredPoints = 0, docsEnabled = false }) {
    const pub = await Task.publishFromProjectTask(originalTaskId, { postedBy, claimMode, requiredPoints, docsEnabled });
    return asPlainTask(pub);
}

/**
 * Tạo claim cho public task.
 * - Trả về { task: PlainTask, claim: PlainClaim }
 */
export async function createClaim({ taskId, workerId, note }) {
    const t = await Task.findById(O(taskId));
    if (!t) throw new AppError('Task không tồn tại', 'NOT_FOUND', 404);

    if (t.scope !== TASK_SCOPE.PUBLIC || !t.public?.published) {
        throw new AppError('Task chưa công khai', 'BAD_REQUEST', 400);
    }
    if (t.assignee || t.public?.workerId) {
        throw new AppError('Task đã có người nhận', 'BAD_REQUEST', 400);
    }
    if (t.public?.workerId && String(t.public.workerId) === String(workerId)) {
        throw new AppError('Bạn đã là người nhận task này', 'BAD_REQUEST', 400);
    }

    const updated = await t.claimPublic(String(workerId), note);
    const claim = [...(updated.public?.claims || [])].reverse().find((c) => String(c.userId) === String(workerId));
    return { task: asPlainTask(updated), claim: asPlainClaim(claim) };
}

/**
 * Manager quyết định claim pending.
 * - Trả về { task: PlainTask, claim: PlainClaim }
 */
export async function decideClaim({ claimId, managerId, accept, note }) {
    const t = await Task.findOne({ 'public.claims._id': O(claimId) });
    if (!t) throw new AppError('Claim không tồn tại', 'NOT_FOUND', 404);

    const updated = await t.decideClaim(String(claimId), String(managerId), !!accept, note);
    const claim = (updated.public?.claims || []).find((c) => String(c._id) === String(claimId));
    return { task: asPlainTask(updated), claim: asPlainClaim(claim) };
}

/**
 * Approve completion + split điểm cho public task (theo input B9)
 * - Input: { totalPoints, workerSplitPoints:[], payouts:[] (amount) }
 * - Output: gọi Task.approveCompletionWithSplit(approver, { totalPoints, workerSplitPoints:number, payouts:[{userId,points}] })
 */
export async function approveCompletionWithSplit({ taskId, totalPoints, workerSplitPoints = [], payouts = [], approverId }) {
    const t = await Task.findById(O(taskId));
    if (!t) throw new AppError('Task không tồn tại', 'NOT_FOUND', 404);

    const assigneeId = t.assignee ? String(t.assignee) : null;
    const { workerSplitPoints: workerPoints, payouts: mappedPayouts, issues } = computeFromB9Input({
        assigneeId,
        totalPoints: Number(totalPoints) || 0,
        workerSplitItems: workerSplitPoints,
        payoutItems: payouts,
    });
    if (issues?.length) {
        throw new AppError('VALIDATION', { issues });
    }

    const updated = await t.approveCompletionWithSplit(String(approverId), {
        totalPoints: Number(totalPoints) || 0,
        workerSplitPoints: workerPoints,
        payouts: mappedPayouts, // [{userId, points}]
    });

    return asPlainTask(updated);
}

/**
 * Lấy mapping nguồn gốc của public task → { originTaskId, originProjectId }
 */
export async function getTaskOriginMapping(taskId) {
    const t = await Task.findById(O(taskId)).lean();
    if (!t?.public?.origin) return null;
    return {
        originTaskId: t.public.origin.task ? String(t.public.origin.task) : null,
        originProjectId: t.public.origin.project ? String(t.public.origin.project) : null,
    };
}

/**
 * Danh sách public tasks đang mở (open) để claim:
 * - scope='public' AND public.published=true
 * - chưa assign (assignee null & public.workerId null)
 * - filter priority/workType/platforms/tags
 * - sort: newest | points_desc | points_asc
 * - paging: cursor theo createdAt (hoặc "ISO|_id") + limit
 */
export async function listOpenPublicTasks({ filters = {}, sort = 'newest', limit = 20, cursor }) {
    const q = {
        scope: TASK_SCOPE.PUBLIC,
        'public.published': true,
        $and: [
            { $or: [{ assignee: { $exists: false } }, { assignee: null }] },
            { $or: [{ 'public.workerId': { $exists: false } }, { 'public.workerId': null }] },
        ],
    };

    // Filters
    if (Array.isArray(filters.priority) && filters.priority.length) {
        q.priority = { $in: filters.priority };
    }
    if (filters.workType != null) {
        q.workType = filters.workType ? O(filters.workType) : null;
    }
    if (Array.isArray(filters.platforms) && filters.platforms.length) {
        q.platforms = { $in: filters.platforms.map(O) };
    }
    if (Array.isArray(filters.tags) && filters.tags.length) {
        q.tags = { $in: filters.tags };
    }

    // Cursor (createdAt) — chấp nhận "ISO" hoặc "ISO|_id"
    if (cursor) {
        const [iso, id] = String(cursor).split('|');
        const dt = iso ? new Date(iso) : null;
        if (dt && !Number.isNaN(dt.getTime())) {
            if (id) {
                q.$or = [
                    { createdAt: { $lt: dt } },
                    { createdAt: dt, _id: { $lt: O(id) } },
                ];
            } else {
                q.createdAt = { $lt: dt };
            }
        }
    }

    // Sort
    let sortSpec = { createdAt: -1, _id: -1 };
    if (sort === 'points_desc') sortSpec = { requiredPoints: -1, initialPoints: -1, createdAt: -1, _id: -1 };
    if (sort === 'points_asc') sortSpec = { requiredPoints: 1, initialPoints: 1, createdAt: -1, _id: -1 };

    const docs = await Task.find(q).sort(sortSpec).limit(limit).lean();

    // nextCursor
    let nextCursor = undefined;
    if (docs.length === limit) {
        const last = docs[docs.length - 1];
        if (last?.createdAt && last?._id) {
            nextCursor = `${new Date(last.createdAt).toISOString()}|${String(last._id)}`;
        }
    }

    return {
        items: docs.map(asPlainTask),
        nextCursor,
    };
}
