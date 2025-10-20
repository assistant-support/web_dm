// /data/task/actions/public.server.js
// Cấu trúc: /data/task/actions/*
// Mục đích: Server Actions cho Public Board & Claim (B9) theo conventions B0→B7.
// - 'use server' (đầu file) + await connectDB() + runAction(..., { requireAuth:true })
// - Quyền:
//    * createDraft: user đăng nhập
//    * publish/unpublish: nếu từ project → manager project; nếu draft public → tác giả/postedBy
//    * claim: user đăng nhập
//    * decide/approve: manager project gốc (nếu có) hoặc tác giả/postedBy (fallback cho public draft)
// - Revalidate: [tags.publicTasks(), tags.task(taskId), originProjectId && tags.project(originProjectId)].filter(Boolean)
// - Activity: publicTask.*
// - Notify: theo từng sự kiện

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { AppError } from '@/lib/errors.js';
import { logActivity } from '@/lib/activity.js';
import { notifyEvent } from '@/lib/noti.js';
import * as tags from '@/data/_shared/tags.js';

import Task from '@/model/task.model.js';
import Project from '@/model/project.model.js';
import { canManageProject } from '@/lib/permissions.js';
import { TASK_SCOPE, CLAIM_MODE } from '@/model/common/enums.js';

import {
    validate,
    publicCreateDraftSchema,
    publicPublishSchema,
    publicUnpublishSchema,
    publicClaimSchema,
    publicDecideClaimSchema,
    publicApproveCompletionWithSplitSchema,
    publicListOpenSchema,
} from '@/data/task/processors/validators.js';

import {
    createPublicDraftTask,
    publishPublicTask,
    unpublishPublicTask,
    publishFromProjectTask,
    createClaim,
    decideClaim,
    approveCompletionWithSplit,
    listOpenPublicTasks,
} from '@/data/task/processors/repo.js';

/** Helper: kiểm tra quyền manager dựa trên origin (nếu có) */
async function assertManagerByOrigin(task, uid) {
    const originProjectId = task?.public?.origin?.project || null;
    if (!originProjectId) return false; // không có origin → không assert manager ở đây
    const project = await Project.findById(originProjectId).lean();
    assert(project, 'Project gốc không tồn tại', 'NOT_FOUND', 404);
    const isMgr = await canManageProject(project, uid);
    assert(isMgr, 'Bạn không có quyền quản lý project gốc', 'FORBIDDEN', 403);
    return true;
}

/** Helper: quyền publish/unpublish cho draft public (không thuộc project) → tác giả/postedBy */
function assertOwnerOfPublicDraft(task, uid) {
    const by = task?.public?.postedBy || task?.createdBy || null;
    assert(String(by) === String(uid), 'Bạn không có quyền thao tác với bản nháp này', 'FORBIDDEN', 403);
}

/**
 * Action: Tạo public draft task
 */
export async function createDraft(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const input = validate(publicCreateDraftSchema, payload);

            const plain = await createPublicDraftTask({
                ...input,
                createdBy: uid,
            });

            await logActivity({
                actor: uid,
                project: null,
                task: plain._id,
                type: 'publicTask.draft.created',
                payload: { taskId: plain._id, claimMode: input.claimMode },
            });

            await revalidateMany([tags.publicTasks()].filter(Boolean));
            return plain;
        },
        { requireAuth: true }
    );
}

/**
 * Action: Publish public task
 * - Nếu task scope=project → publishFromProjectTask(original)
 * - Nếu task scope=public (draft) → publishPublicTask(taskId) (yêu cầu owner của draft)
 */
export async function publish(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const input = validate(publicPublishSchema, payload);

            const task = await Task.findById(input.taskId).lean();
            assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);

            let plain;
            let originProjectId = null;

            if (task.scope === TASK_SCOPE.PROJECT) {
                // Require manager project gốc
                const project = await Project.findById(task.project).lean();
                assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);
                assert(await canManageProject(project, uid), 'Bạn không có quyền publish từ project', 'FORBIDDEN', 403);

                const pub = await publishFromProjectTask(String(task._id), {
                    postedBy: uid,
                    claimMode: task?.public?.claimMode || CLAIM_MODE.AUTO,
                    requiredPoints: task?.public?.requiredPoints || 0,
                    docsEnabled: !!task?.docs?.enabled,
                });
                plain = pub;
                originProjectId = String(task.project);
            } else if (task.scope === TASK_SCOPE.PUBLIC) {
                // Draft public → chỉ owner/postedBy được phép
                assertOwnerOfPublicDraft(task, uid);
                plain = await publishPublicTask(String(task._id));
            } else {
                throw new AppError('Task không hợp lệ để publish', 'BAD_REQUEST', 400);
            }

            await logActivity({
                actor: uid,
                project: originProjectId ?? null,
                task: plain._id,
                type: 'publicTask.published',
                payload: { taskId: plain._id, originProjectId },
            });

            await notifyEvent('publicTask.published', {
                taskId: plain._id,
                projectId: originProjectId ?? null,
                byUserId: uid,
            });

            await revalidateMany(
                [tags.publicTasks(), tags.task(plain._id), originProjectId && tags.project(originProjectId)].filter(Boolean)
            );

            return plain;
        },
        { requireAuth: true }
    );
}

/**
 * Action: Unpublish public task
 * - Nếu có origin project → yêu cầu manager project
 * - Nếu draft public → yêu cầu owner/postedBy
 */
export async function unpublish(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const input = validate(publicUnpublishSchema, payload);

            const task = await Task.findById(input.taskId);
            assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);
            assert(task.scope === TASK_SCOPE.PUBLIC, 'Chỉ áp dụng cho task công khai', 'BAD_REQUEST', 400);

            let originProjectId = null;
            if (task.public?.origin?.project) {
                await assertManagerByOrigin(task, uid);
                originProjectId = String(task.public.origin.project);
            } else {
                assertOwnerOfPublicDraft(task.toObject(), uid);
            }

            const plain = await unpublishPublicTask(String(task._id));

            await logActivity({
                actor: uid,
                project: originProjectId ?? null,
                task: plain._id,
                type: 'publicTask.unpublished',
                payload: { taskId: plain._id },
            });

            await notifyEvent('publicTask.unpublished', {
                taskId: plain._id,
                projectId: originProjectId ?? null,
                byUserId: uid,
            });

            await revalidateMany(
                [tags.publicTasks(), tags.task(plain._id), originProjectId && tags.project(originProjectId)].filter(Boolean)
            );

            return plain;
        },
        { requireAuth: true }
    );
}

/**
 * Action: Claim public task
 * - AUTO → assign & in_progress ngay
 * - REVIEW → tạo claim pending
 */
export async function claim(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const input = validate(publicClaimSchema, payload);

            const t = await Task.findById(input.taskId).lean();
            assert(t, 'Task không tồn tại', 'NOT_FOUND', 404);
            assert(t.scope === TASK_SCOPE.PUBLIC && t.public?.published, 'Task chưa công khai', 'BAD_REQUEST', 400);

            const { task: plain, claim } = await createClaim({
                taskId: String(t._id),
                workerId: uid,
                note: input.note,
            });

            const isAutoAccepted = claim?.status === 'accepted' || claim?.status === 'ACCEPTED';

            await logActivity({
                actor: uid,
                project: t.public?.origin?.project ? String(t.public.origin.project) : null,
                task: String(t._id),
                type: isAutoAccepted ? 'publicTask.claimed' : 'publicTask.claim.requested',
                payload: { claimId: claim?.id, mode: t.public?.claimMode || null },
            });

            await notifyEvent(isAutoAccepted ? 'publicTask.claimed' : 'publicTask.claim.requested', {
                taskId: String(t._id),
                projectId: t.public?.origin?.project ? String(t.public.origin.project) : null,
                claimId: claim?.id,
                byUserId: uid,
            });

            await revalidateMany(
                [tags.publicTasks(), tags.task(t._id), t.public?.origin?.project && tags.project(t.public.origin.project)].filter(Boolean)
            );

            return { task: plain, claim };
        },
        { requireAuth: true }
    );
}

/**
 * Action: Decide claim (manager)
 */
export async function decide(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const input = validate(publicDecideClaimSchema, payload);

            const t = await Task.findOne({ 'public.claims._id': input.claimId }).lean();
            assert(t, 'Claim không tồn tại', 'NOT_FOUND', 404);

            let originProjectId = null;
            if (t.public?.origin?.project) {
                await assertManagerByOrigin(t, uid);
                originProjectId = String(t.public.origin.project);
            } else {
                const by = t.public?.postedBy || t.createdBy || null;
                assert(String(by) === String(uid), 'Không có quyền quyết định claim', 'FORBIDDEN', 403);
            }

            const { task: plain, claim } = await decideClaim({
                claimId: input.claimId,
                managerId: uid,
                accept: input.accept,
                note: input.note,
            });

            await logActivity({
                actor: uid,
                project: originProjectId ?? null,
                task: plain._id,
                type: 'publicTask.claim.decided',
                payload: { claimId: claim?.id, accept: !!input.accept },
            });

            await notifyEvent('publicTask.claim.decided', {
                taskId: plain._id,
                projectId: originProjectId ?? null,
                claimId: claim?.id,
                byUserId: uid,
                toUserIds: claim?.userId ? [String(claim.userId)] : [],
            });

            await revalidateMany(
                [tags.publicTasks(), tags.task(plain._id), originProjectId && tags.project(originProjectId)].filter(Boolean)
            );

            return { task: plain, claim };
        },
        { requireAuth: true }
    );
}

/**
 * Action: Approve completion with split (B9 input)
 * - Input: totalPoints + workerSplitPoints[] + payouts[] (amount)
 */
export async function approveCompletionWithSplitAction(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const input = validate(publicApproveCompletionWithSplitSchema, payload);

            const t = await Task.findById(input.taskId).lean();
            assert(t, 'Task không tồn tại', 'NOT_FOUND', 404);

            let originProjectId = null;
            if (t.public?.origin?.project) {
                await assertManagerByOrigin(t, uid);
                originProjectId = String(t.public.origin.project);
            } else {
                const by = t.public?.postedBy || t.createdBy || null;
                assert(String(by) === String(uid), 'Không có quyền duyệt hoàn tất', 'FORBIDDEN', 403);
            }

            const updated = await approveCompletionWithSplit({
                taskId: String(t._id),
                totalPoints: input.totalPoints,
                workerSplitPoints: input.workerSplitPoints, // array {userId, points}
                payouts: input.payouts || [], // array {userId, amount, ref?}
                approverId: uid,
            });

            // toUserIds: tất cả recipients (workerSplit + payouts) + assignee + creator (loại trùng)
            const recipients = new Set(
                (input.workerSplitPoints || []).map((s) => String(s.userId))
            );
            (input.payouts || []).forEach((p) => recipients.add(String(p.userId)));
            if (t.assignee) recipients.add(String(t.assignee));
            if (t.createdBy) recipients.add(String(t.createdBy));

            await logActivity({
                actor: uid,
                project: originProjectId ?? null,
                task: updated._id,
                type: 'publicTask.completion.approved',
                payload: { totalPoints: input.totalPoints, recipients: Array.from(recipients).length },
            });

            await notifyEvent('publicTask.completion.approved', {
                projectId: originProjectId ?? null,
                taskId: updated._id,
                byUserId: uid,
                toUserIds: Array.from(recipients),
            });

            await revalidateMany(
                [tags.publicTasks(), tags.task(updated._id), originProjectId && tags.project(originProjectId)].filter(Boolean)
            );

            return updated;
        },
        { requireAuth: true }
    );
}

/**
 * Action: Danh sách public tasks đang mở (open)
 */
export async function listOpen(payload) {
    await connectDB();
    return runAction(
        async () => {
            const input = validate(publicListOpenSchema, payload);
            const res = await listOpenPublicTasks({
                filters: input.filters || {},
                sort: input.sort || 'newest',
                limit: input.limit || 20,
                cursor: input.cursor,
            });
            return res;
        },
        { requireAuth: true }
    );
}
