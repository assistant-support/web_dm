// // data/task/actions/project.server.js
// // Tác dụng file: Server Actions cho Task (scope=project) – tạo/cập nhật meta/checklist/subtask/plan window (B6)
// // và hoàn thiện lifecycle phê duyệt & thực thi (B7).
// // - Mỗi action là async function (App Router) gọi runAction(handler, { requireAuth:true }).
// // - [B6-Fix] Mọi kiểm tra quyền can* đều bọc task với project đã load (taskForPerm = { ...task, project: projectDoc }).

// 'use server';

// import { connectDB } from '@/lib/db.js';
// import { runAction, revalidateMany, assert } from '@/lib/action-utils.js';
// import { AppError } from '@/lib/errors.js';
// import { canEditTask, canAssignTask, canManageProject } from '@/lib/permissions.js';
// import { logActivity } from '@/lib/activity.js';
// import { notifyEvent } from '@/lib/noti.js';
// import * as tags from '@/data/_shared/tags.js';

// import Project from '@/model/project.model.js';
// import Task from '@/model/task.model.js';

// import {
//     validate,
//     taskCreateSchema,
//     taskUpdateMetaSchema,
//     toggleChecklistSchema,
//     addSubtaskSchema,
//     setPlanWindowSchema,
//     taskIdSchema,
// } from '@/data/task/processors/validators.js';

// import {
//     normalizePlanWindow,
//     assertValidPlanWindow,
// } from '@/data/task/processors/compute.js';

// import {
//     getById,
//     createTask as repoCreateTask,
//     updateMeta as repoUpdateMeta,
//     toggleChecklist as repoToggleChecklist,
//     addSubtask as repoAddSubtask,
//     setPlanWindow as repoSetPlanWindow,
// } from '@/data/task/processors/repo.js';

// import { TASK_STATUS, APPROVAL_STATUS } from '@/model/common/enums.js';

// // ===== Helpers quyền B7 =====
// function toTaskForPerm(rawTask, projectDoc) {
//     return projectDoc ? { ...rawTask, project: projectDoc } : rawTask;
// }
// function projectManagerIds(projectDoc) {
//     const ms = projectDoc?.members || [];
//     return ms
//         .filter((m) => ['owner', 'manager'].includes(String(m.role)))
//         .map((m) => String(m.userId));
// }

// // ============================================================================
// // B6 — Create
// // ============================================================================
// /**
//  * Tạo Task (scope=project)
//  * - Quyền: thành viên project có thể tạo.
//  */
// export async function create(payload) {
//     await connectDB();
//     const data = validate(taskCreateSchema, payload);

//     return runAction(
//         async ({ user }) => {
//             // Xác minh thành viên project
//             const project = await Project.findById(data.project).lean().exec();
//             assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

//             const isMember =
//                 Array.isArray(project.members) &&
//                 project.members.some((m) => String(m.userId) === String(user.externalUserId));
//             assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

//             const created = await repoCreateTask(data, user.externalUserId);

//             await logActivity({
//                 actor: user.externalUserId,
//                 project: data.project,
//                 task: created._id,
//                 type: 'task.created',
//                 payload: { title: created.title, priority: created.priority },
//             });

//             await revalidateMany([tags.project(data.project), tags.task(created._id)]);
//             return created;
//         },
//         { requireAuth: true }
//     );
// }

// // ============================================================================
// // B6 — Update meta
// // ============================================================================
// /**
//  * Cập nhật meta (title/description/priority/tags/workType/platforms)
//  * - Quyền: canEditTask(task, uid) – [B6-Fix] với project populated
//  */
// export async function updateMeta(taskId, patch) {
//     await connectDB();
//     const id = validate(taskIdSchema, taskId);
//     const data = validate(taskUpdateMetaSchema, patch);

//     return runAction(
//         async ({ user }) => {
//             const task = await getById(id, { lean: true });
//             assert(task, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

//             const projectDoc = await Project.findById(task.project).lean().exec();
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
//             const taskForPerm = toTaskForPerm(task, projectDoc);

//             assert(canEditTask(taskForPerm, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

//             const updated = await repoUpdateMeta(id, data);
//             await logActivity({
//                 actor: user.externalUserId,
//                 project: updated.project,
//                 task: id,
//                 type: 'task.updated',
//                 payload: data,
//             });

//             await revalidateMany([tags.project(updated.project), tags.task(id)]);
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// // ============================================================================
// // B6 — Checklist
// // ============================================================================
// /**
//  * Toggle/cập nhật checklist item
//  * - Quyền: canEditTask(task, uid) – [B6-Fix] với project populated
//  */
// export async function toggleChecklist(payload) {
//     await connectDB();
//     const data = validate(toggleChecklistSchema, payload);

//     return runAction(
//         async ({ user }) => {
//             const raw = await Task.findById(data.taskId).lean().exec();
//             assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

//             const projectDoc = await Project.findById(raw.project).lean().exec();
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
//             const taskForPerm = toTaskForPerm(raw, projectDoc);

//             assert(canEditTask(taskForPerm, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

//             const updated = await repoToggleChecklist(data.taskId, data);

//             await logActivity({
//                 actor: user.externalUserId,
//                 project: updated.project,
//                 task: data.taskId,
//                 type: 'task.checklist.toggled',
//                 payload: { cid: data.cid, done: data.done, content: data.content },
//             });

//             await revalidateMany([tags.task(data.taskId), tags.project(updated.project)]);
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// // ============================================================================
// // B6 — Subtask
// // ============================================================================
// /**
//  * Thêm subtask dưới parent
//  * - Quyền: thành viên project (hoặc chặt hơn: canEditTask(parent, uid))
//  */
// export async function addSubtask(payload) {
//     await connectDB();
//     const data = validate(addSubtaskSchema, payload);

//     return runAction(
//         async ({ user }) => {
//             const parent = await Task.findById(data.parentTask).lean().exec();
//             assert(parent, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

//             const project = await Project.findById(parent.project).lean().exec();
//             assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
//             const isMember =
//                 Array.isArray(project.members) &&
//                 project.members.some((m) => String(m.userId) === String(user.externalUserId));
//             assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

//             const sub = await repoAddSubtask(data.parentTask, data, user.externalUserId);

//             await logActivity({
//                 actor: user.externalUserId,
//                 project: sub.project,
//                 task: sub._id,
//                 type: 'task.subtask.added',
//                 payload: { parentTask: data.parentTask, title: sub.title },
//             });

//             await revalidateMany([tags.project(sub.project), tags.task(data.parentTask)]);
//             return sub;
//         },
//         { requireAuth: true }
//     );
// }

// // ============================================================================
// // B6 — Plan window
// // ============================================================================
// /**
//  * Cập nhật “cửa sổ kế hoạch” (plannedStartAt/plannedDueAt)
//  * - Quyền: canEditTask(task, uid) – [B6-Fix] với project populated
//  * - Nếu start > due → AppError('INVALID_PLAN_WINDOW')
//  */
// export async function setPlanWindow(payload) {
//     await connectDB();
//     const data = validate(setPlanWindowSchema, payload);

//     return runAction(
//         async ({ user }) => {
//             const raw = await Task.findById(data.taskId).lean().exec();
//             assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

//             const projectDoc = await Project.findById(raw.project).lean().exec();
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
//             const taskForPerm = toTaskForPerm(raw, projectDoc);

//             assert(canEditTask(taskForPerm, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

//             const { start, due } = normalizePlanWindow({ start: data.start, due: data.due });
//             assertValidPlanWindow({ start, due });

//             const updated = await repoSetPlanWindow(data.taskId, { start, due });

//             await logActivity({
//                 actor: user.externalUserId,
//                 project: updated.project,
//                 task: data.taskId,
//                 type: 'task.plan.updated',
//                 payload: { start, due },
//             });

//             await revalidateMany([tags.task(data.taskId), tags.project(updated.project)]);
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// // ============================================================================
// // B7 — Lifecycle: requestApproval → approve/reject → assign → confirm → start → markDone/requestReview → approveCompletion
// // ============================================================================

// /**
//  * 1) Yêu cầu phê duyệt bắt đầu (requestApproval)
//  * - Quyền: creator hoặc project owner/manager (có thể mở rộng cho assignee).
//  * - Điều kiện: không ở IN_PROGRESS/COMPLETED_AWAIT_REVIEW/COMPLETED/CANCELLED.
//  */
// export async function requestApproval(taskId, note) {
//     await connectDB();

//     return runAction(
//         async ({ user }) => {
//             const raw = await Task.findById(taskId).lean().exec();
//             assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);
//             const projectDoc = await Project.findById(raw.project).lean().exec();
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

//             const isCreator = String(raw.createdBy) === String(user.externalUserId);
//             const isManager = canManageProject(projectDoc, user.externalUserId);
//             const isAssignee = raw.assignee && String(raw.assignee) === String(user.externalUserId);
//             assert(isCreator || isManager || isAssignee, 'FORBIDDEN', 'FORBIDDEN', 403);

//             const invalidStatuses = new Set([
//                 TASK_STATUS.IN_PROGRESS,
//                 TASK_STATUS.COMPLETED_AWAIT_REVIEW,
//                 TASK_STATUS.COMPLETED,
//                 TASK_STATUS.CANCELLED,
//             ]);
//             assert(!invalidStatuses.has(raw.status), 'INVALID_STATUS', 'BAD_REQUEST', 400);

//             await Task.updateOne(
//                 { _id: raw._id },
//                 {
//                     $set: {
//                         'approval.required': true,
//                         'approval.status': APPROVAL_STATUS.PENDING,
//                         ...(note ? { 'approval.note': String(note) } : {}),
//                         status: TASK_STATUS.PENDING_APPROVAL,
//                     },
//                 }
//             ).exec();

//             const managerIds = projectManagerIds(projectDoc);

//             await logActivity({
//                 actor: user.externalUserId,
//                 project: raw.project,
//                 task: raw._id,
//                 type: 'task.approval.requested',
//                 payload: { note },
//             });
//             await notifyEvent('task.approval.requested', {
//                 projectId: raw.project,
//                 taskId: raw._id,
//                 byUserId: user.externalUserId,
//                 managerIds,
//             });
//             await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);

//             const updated = await Task.findById(raw._id).lean().exec();
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// /**
//  * 2) Phê duyệt cho phép bắt đầu (approveStart)
//  * - Quyền: canManageProject(project, uid)
//  * - Điều kiện: status === PENDING_APPROVAL && approval.required === true
//  */
// export async function approveStart(taskId, managerNote) {
//     await connectDB();
//     return runAction(
//         async ({ user }) => {
//             const raw = await Task.findById(taskId).lean().exec();
//             assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);
//             const projectDoc = await Project.findById(raw.project).lean().exec();
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

//             assert(canManageProject(projectDoc, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);
//             assert(
//                 raw.status === TASK_STATUS.PENDING_APPROVAL && raw?.approval?.required === true,
//                 'INVALID_STATE',
//                 'BAD_REQUEST',
//                 400
//             );

//             const now = new Date();
//             const hasAssignee = !!raw.assignee;
//             const nextStatus = hasAssignee ? TASK_STATUS.WAITING_ASSIGNEE_CONFIRM : TASK_STATUS.DRAFT;

//             await Task.updateOne(
//                 { _id: raw._id },
//                 {
//                     $set: {
//                         'approval.status': APPROVAL_STATUS.APPROVED,
//                         'approval.by': user.externalUserId,
//                         'approval.at': now,
//                         ...(managerNote ? { 'approval.note': String(managerNote) } : {}),
//                         'assigneeConfirm.required': true,
//                         status: nextStatus,
//                     },
//                 }
//             ).exec();

//             await logActivity({
//                 actor: user.externalUserId,
//                 project: raw.project,
//                 task: raw._id,
//                 type: 'task.approval.approved',
//                 payload: { note: managerNote, nextStatus },
//             });

//             const toUserIds = [raw.assignee, raw.createdBy].filter(Boolean).map(String);
//             if (toUserIds.length) {
//                 await notifyEvent('task.approval.approved', {
//                     projectId: raw.project,
//                     taskId: raw._id,
//                     toUserIds,
//                 });
//             }

//             await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);
//             const updated = await Task.findById(raw._id).lean().exec();
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// /**
//  * 3) Từ chối cho phép bắt đầu (rejectStart)
//  * - Quyền: canManageProject(project, uid)
//  * - Điều kiện: status === PENDING_APPROVAL
//  */
// export async function rejectStart(taskId, managerNote) {
//     await connectDB();
//     return runAction(
//         async ({ user }) => {
//             const raw = await Task.findById(taskId).lean().exec();
//             assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);
//             const projectDoc = await Project.findById(raw.project).lean().exec();
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

//             assert(canManageProject(projectDoc, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);
//             assert(
//                 raw.status === TASK_STATUS.PENDING_APPROVAL,
//                 'INVALID_STATE',
//                 'BAD_REQUEST',
//                 400
//             );

//             const now = new Date();
//             await Task.updateOne(
//                 { _id: raw._id },
//                 {
//                     $set: {
//                         'approval.status': APPROVAL_STATUS.REJECTED,
//                         'approval.by': user.externalUserId,
//                         'approval.at': now,
//                         ...(managerNote ? { 'approval.note': String(managerNote) } : {}),
//                         status: TASK_STATUS.DRAFT,
//                     },
//                 }
//             ).exec();

//             await logActivity({
//                 actor: user.externalUserId,
//                 project: raw.project,
//                 task: raw._id,
//                 type: 'task.approval.rejected',
//                 payload: { note: managerNote },
//             });

//             const toUserIds = [raw.createdBy, raw.assignee].filter(Boolean).map(String);
//             if (toUserIds.length) {
//                 await notifyEvent('task.approval.rejected', {
//                     projectId: raw.project,
//                     taskId: raw._id,
//                     toUserIds,
//                 });
//             }

//             await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);
//             const updated = await Task.findById(raw._id).lean().exec();
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// /**
//  * 4) Giao việc / Huỷ giao (assign)
//  * - Quyền: canAssignTask(taskForPerm, uid)
//  */
// export async function assign(taskId, assignee /* string|null */) {
//     await connectDB();
//     return runAction(
//         async ({ user }) => {
//             const raw = await Task.findById(taskId).lean().exec();
//             assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);
//             const projectDoc = await Project.findById(raw.project).lean().exec();
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
//             const taskForPerm = toTaskForPerm(raw, projectDoc);

//             assert(canAssignTask(taskForPerm, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

//             const nextSet = { assignee: assignee || null };
//             let activityType = 'task.unassigned';

//             if (assignee) {
//                 activityType = 'task.assigned';
//                 // Nếu đã approved thì chuyển sang chờ xác nhận
//                 if (raw?.approval?.status === APPROVAL_STATUS.APPROVED) {
//                     nextSet['assigneeConfirm.required'] = true;
//                     nextSet.status = TASK_STATUS.WAITING_ASSIGNEE_CONFIRM;
//                 }
//             } else {
//                 // unassign: không ép trạng thái
//             }

//             await Task.updateOne({ _id: raw._id }, { $set: nextSet }).exec();

//             await logActivity({
//                 actor: user.externalUserId,
//                 project: raw.project,
//                 task: raw._id,
//                 type: activityType,
//                 payload: { assignee },
//             });

//             if (assignee) {
//                 await notifyEvent('task.assigned', {
//                     projectId: raw.project,
//                     taskId: raw._id,
//                     toUserId: String(assignee),
//                 });
//             }

//             await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);
//             const updated = await Task.findById(raw._id).lean().exec();
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// /**
//  * 5) Assignee xác nhận bắt đầu (confirmStartByAssignee)
//  * - Quyền: chỉ chính assignee.
//  * - Điều kiện: approval.status === 'approved' && assigneeConfirm.required === true && status === WAITING_ASSIGNEE_CONFIRM
//  */
// export async function confirmStartByAssignee(taskId) {
//     await connectDB();
//     return runAction(
//         async ({ user }) => {
//             const raw = await Task.findById(taskId).lean().exec();
//             assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

//             assert(
//                 raw.assignee && String(raw.assignee) === String(user.externalUserId),
//                 'FORBIDDEN',
//                 'FORBIDDEN',
//                 403
//             );
//             assert(
//                 raw?.approval?.status === APPROVAL_STATUS.APPROVED &&
//                 raw?.assigneeConfirm?.required === true &&
//                 raw.status === TASK_STATUS.WAITING_ASSIGNEE_CONFIRM,
//                 'INVALID_STATE',
//                 'BAD_REQUEST',
//                 400
//             );

//             const now = new Date();
//             await Task.updateOne(
//                 { _id: raw._id },
//                 {
//                     $set: {
//                         'assigneeConfirm.required': false,
//                         'assigneeConfirm.confirmedBy': user.externalUserId,
//                         'assigneeConfirm.confirmedAt': now,
//                         status: TASK_STATUS.IN_PROGRESS,
//                         startedAt: raw.startedAt || now,
//                     },
//                 }
//             ).exec();

//             const projectDoc = await Project.findById(raw.project).lean().exec();
//             const mgrIds = projectManagerIds(projectDoc);

//             await logActivity({
//                 actor: user.externalUserId,
//                 project: raw.project,
//                 task: raw._id,
//                 type: 'task.assignee.confirmed',
//             });
//             if (mgrIds.length) {
//                 await notifyEvent('task.assignee.confirmed', {
//                     projectId: raw.project,
//                     taskId: raw._id,
//                     toUserIds: [...mgrIds, String(raw.createdBy)].filter(Boolean),
//                 });
//             }

//             await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);
//             const updated = await Task.findById(raw._id).lean().exec();
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// /**
//  * 6) Bắt đầu ngay (startNow)
//  * - Quyền: manager hoặc assignee (khi đã approved hoặc không yêu cầu)
//  * - Cho phép từ: DRAFT | ON_HOLD | WAITING_ASSIGNEE_CONFIRM
//  */
// export async function startNow(taskId) {
//     await connectDB();
//     return runAction(
//         async ({ user }) => {
//             const raw = await Task.findById(taskId).lean().exec();
//             assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);
//             const projectDoc = await Project.findById(raw.project).lean().exec();
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

//             const isMgr = canManageProject(projectDoc, user.externalUserId);
//             const isAssignee =
//                 raw.assignee && String(raw.assignee) === String(user.externalUserId);

//             let assigneeAllowed = false;
//             if (isAssignee) {
//                 const req = !!raw?.approval?.required;
//                 const approved = raw?.approval?.status === APPROVAL_STATUS.APPROVED;
//                 const confirmRequired = !!raw?.assigneeConfirm?.required;
//                 assigneeAllowed = !req || (approved && !confirmRequired);
//             }

//             assert(isMgr || assigneeAllowed, 'FORBIDDEN', 'FORBIDDEN', 403);

//             const allowed = new Set([
//                 TASK_STATUS.DRAFT,
//                 TASK_STATUS.ON_HOLD,
//                 TASK_STATUS.WAITING_ASSIGNEE_CONFIRM,
//             ]);
//             assert(allowed.has(raw.status), 'INVALID_STATE', 'BAD_REQUEST', 400);

//             const now = new Date();
//             await Task.updateOne(
//                 { _id: raw._id },
//                 { $set: { status: TASK_STATUS.IN_PROGRESS, startedAt: raw.startedAt || now } }
//             ).exec();

//             const mgrIds = projectManagerIds(projectDoc);

//             await logActivity({
//                 actor: user.externalUserId,
//                 project: raw.project,
//                 task: raw._id,
//                 type: 'task.started',
//             });
//             await notifyEvent('task.started', {
//                 projectId: raw.project,
//                 taskId: raw._id,
//                 toUserIds: [String(raw.createdBy), ...mgrIds],
//             });

//             await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);
//             const updated = await Task.findById(raw._id).lean().exec();
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// /**
//  * 7) Đánh dấu hoàn thành & yêu cầu nghiệm thu (markDone)
//  * - Quyền: assignee hoặc manager
//  * - Điều kiện: status === IN_PROGRESS
//  */
// export async function markDone(taskId) {
//     await connectDB();
//     return runAction(
//         async ({ user }) => {
//             const raw = await Task.findById(taskId).lean().exec();
//             assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);
//             const projectDoc = await Project.findById(raw.project).lean().exec();
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

//             const isMgr = canManageProject(projectDoc, user.externalUserId);
//             const isAssignee =
//                 raw.assignee && String(raw.assignee) === String(user.externalUserId);
//             assert(isMgr || isAssignee, 'FORBIDDEN', 'FORBIDDEN', 403);

//             assert(raw.status === TASK_STATUS.IN_PROGRESS, 'INVALID_STATE', 'BAD_REQUEST', 400);

//             await Task.updateOne(
//                 { _id: raw._id },
//                 { $set: { status: TASK_STATUS.COMPLETED_AWAIT_REVIEW } }
//             ).exec();

//             const mgrIds = projectManagerIds(projectDoc);

//             await logActivity({
//                 actor: user.externalUserId,
//                 project: raw.project,
//                 task: raw._id,
//                 type: 'task.completed.requested_review',
//             });
//             if (mgrIds.length) {
//                 await notifyEvent('task.completed.requested_review', {
//                     projectId: raw.project,
//                     taskId: raw._id,
//                     toUserIds: mgrIds,
//                 });
//             }

//             await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);
//             const updated = await Task.findById(raw._id).lean().exec();
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// /**
//  * 8) requestReview — alias cho markDone
//  */
// export async function requestReview(taskId) {
//     return markDone(taskId);
// }

// /**
//  * 9) Phê duyệt hoàn tất (approveCompletion)
//  * - Quyền: canManageProject(project, uid)
//  * - Điều kiện: status === COMPLETED_AWAIT_REVIEW
//  */
// export async function approveCompletion({ taskId, finalPoints }) {
//     await connectDB();
//     return runAction(
//         async ({ user }) => {
//             const raw = await Task.findById(taskId).lean().exec();
//             assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);
//             assert(
//                 raw.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW,
//                 'INVALID_STATE',
//                 'BAD_REQUEST',
//                 400
//             );

//             const projectDoc = await Project.findById(raw.project).lean().exec();
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
//             assert(canManageProject(projectDoc, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

//             const points = Math.max(0, Number(finalPoints) || 0);
//             const now = new Date();

//             await Task.updateOne(
//                 { _id: raw._id },
//                 {
//                     $set: {
//                         finalPoints: points,
//                         scoredBy: user.externalUserId,
//                         scoredAt: now,
//                         status: TASK_STATUS.COMPLETED,
//                         completedAt: now,
//                     },
//                 }
//             ).exec();

//             await logActivity({
//                 actor: user.externalUserId,
//                 project: raw.project,
//                 task: raw._id,
//                 type: 'task.completed.approved',
//                 payload: { points },
//             });

//             if (raw.assignee) {
//                 await notifyEvent('task.approved', {
//                     projectId: raw.project,
//                     taskId: raw._id,
//                     toUserId: String(raw.assignee),
//                     points,
//                 });
//             }

//             await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);
//             const updated = await Task.findById(raw._id).lean().exec();
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// ver 1
// data/task/actions/project.server.js
// Tác dụng file: Server Actions cho Task (scope=project) — CRUD + lifecycle, quyền, log, revalidate, TRẢ PLAIN JSON.

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { AppError } from '@/lib/errors.js';
import { logActivity } from '@/lib/activity.js';
import * as tags from '@/data/_shared/tags.js';
import { canViewProject, canEditTask, canAssignTask, canManageProject } from '@/lib/permissions.js';

import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';
import { TASK_STATUS, APPROVAL_STATUS } from '@/model/common/enums.js';

import {
    validate, taskIdSchema, projectIdSchema, taskCreateSchema,
    taskUpdateMetaSchema, toggleChecklistSchema, addSubtaskSchema, setPlanWindowSchema
} from '@/data/task/processors/validators.js';

import * as repo from '@/data/task/processors/repo.js';
import { normalizePlanWindow } from '@/data/task/processors/compute.js';
import { notifyEvent } from '@/lib/noti.js';
import { asPlainTask } from '@/lib/serialize.js';

function toTaskForPerm(rawTask, projectDoc) {
    return projectDoc ? { ...rawTask, project: projectDoc } : rawTask;
}
function projectManagerIds(projectDoc) {
    const ms = projectDoc?.members || [];
    return ms.filter(m => ['owner', 'manager'].includes(String(m.role))).map(m => String(m.userId));
}

/** Create Task (scope=project) */
export async function create(payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const data = validate(taskCreateSchema, payload);

        const project = await Project.findById(data.project).lean().exec();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        // Quyền: member project cũng được tạo
        const isMember = (project.members || []).some((m) => String(m.userId) === String(user.externalUserId));
        assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

        const doc = await repo.createTask(data, user.externalUserId);
        await logActivity({ actor: user.externalUserId, project: doc.project, task: doc._id, type: 'task.created', payload: { title: doc.title } });
        await revalidateMany([tags.project(doc.project), tags.task(doc._id)]);

        return asPlainTask(doc);
    }, { requireAuth: true });
}

/** Update meta (title/desc/priority/tags/workType/platforms) */
export async function updateMeta(taskId, patch) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(taskIdSchema, taskId);
        const data = validate(taskUpdateMetaSchema, patch);

        const raw = await repo.getById(id, { lean: true });
        assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        const project = await Project.findById(raw.project).lean().exec();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        const taskForPerm = toTaskForPerm(raw, project);
        assert(canEditTask(taskForPerm, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

        const updated = await repo.updateMeta(id, data);
        await logActivity({ actor: user.externalUserId, project: updated.project, task: updated._id, type: 'task.updated', payload: data });
        await revalidateMany([tags.project(updated.project), tags.task(updated._id)]);

        return asPlainTask(updated);
    }, { requireAuth: true });
}

/** Toggle / update checklist */
export async function toggleChecklist(payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const data = validate(toggleChecklistSchema, payload);

        const raw = await repo.getById(data.taskId, { lean: true });
        assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);
        const project = await Project.findById(raw.project).lean().exec();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        const taskForPerm = toTaskForPerm(raw, project);
        assert(canEditTask(taskForPerm, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

        const updated = await repo.toggleChecklist(data.taskId, data);
        await logActivity({ actor: user.externalUserId, project: updated.project, task: updated._id, type: 'task.checklist.toggled', payload: { cid: data.cid } });
        await revalidateMany([tags.project(updated.project), tags.task(updated._id)]);

        return asPlainTask(updated);
    }, { requireAuth: true });
}

/** Add subtask */
export async function addSubtask(payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const data = validate(addSubtaskSchema, payload);

        const parent = await repo.getById(data.parentTask, { lean: true });
        assert(parent, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);
        const project = await Project.findById(parent.project).lean().exec();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        // Cho phép member tạo subtask dưới task mình xem được
        const isMember = (project.members || []).some((m) => String(m.userId) === String(user.externalUserId));
        assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

        const sub = await repo.addSubtask(parent._id, data, user.externalUserId);
        await logActivity({ actor: user.externalUserId, project: parent.project, task: sub._id, type: 'task.subtask.added', payload: { parentTask: parent._id } });
        await revalidateMany([tags.project(parent.project), tags.task(parent._id)]);

        return asPlainTask(sub);
    }, { requireAuth: true });
}

/** Set plan window (start/due) */
export async function setPlanWindow(payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const data = validate(setPlanWindowSchema, payload);

        const raw = await repo.getById(data.taskId, { lean: true });
        assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        const project = await Project.findById(raw.project).lean().exec();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        const taskForPerm = toTaskForPerm(raw, project);
        assert(canEditTask(taskForPerm, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

        const norm = normalizePlanWindow({ start: data.start, due: data.due });
        if (norm.start && norm.due && norm.start > norm.due) {
            throw new AppError('INVALID_PLAN_WINDOW', 'INVALID_PLAN_WINDOW', 400);
        }

        const updated = await repo.setPlanWindow(data.taskId, norm);
        await logActivity({ actor: user.externalUserId, project: updated.project, task: updated._id, type: 'task.plan.updated', payload: norm });
        await revalidateMany([tags.project(updated.project), tags.task(updated._id)]);

        return asPlainTask(updated);
    }, { requireAuth: true });
}

/** B7 — Request approval */
export async function requestApproval(taskId, note) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(taskIdSchema, taskId);
        const raw = await Task.findById(id).lean().exec();
        assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        const project = await Project.findById(raw.project).lean().exec();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        const canByCreator = String(raw.createdBy) === String(user.externalUserId);
        const canByManager = canManageProject(project, user.externalUserId);
        assert(canByCreator || canByManager, 'FORBIDDEN', 'FORBIDDEN', 403);

        // Điều kiện trạng thái
        assert(![TASK_STATUS.IN_PROGRESS, TASK_STATUS.COMPLETED_AWAIT_REVIEW, TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED].includes(raw.status), 'INVALID_STATUS', 'BAD_REQUEST', 400);

        await Task.updateOne(
            { _id: raw._id },
            {
                $set: {
                    'approval.required': true,
                    'approval.status': APPROVAL_STATUS.PENDING,
                    ...(note ? { 'approval.note': String(note) } : {}),
                    status: TASK_STATUS.PENDING_APPROVAL,
                },
            }
        ).exec();

        await logActivity({ actor: user.externalUserId, project: raw.project, task: raw._id, type: 'task.approval.requested', payload: { note } });
        await notifyEvent('task.approval.requested', { projectId: raw.project, taskId: raw._id, byUserId: user.externalUserId, toUserIds: projectManagerIds(project) });
        await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);

        const fresh = await Task.findById(raw._id).lean().exec();
        return asPlainTask(fresh);
    }, { requireAuth: true });
}

/** B7 — Approve start */
export async function approveStart(taskId, managerNote) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(taskIdSchema, taskId);
        const raw = await Task.findById(id).lean().exec();
        assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);
        const project = await Project.findById(raw.project).lean().exec();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        assert(canManageProject(project, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);
        assert(raw.approval?.required === true && raw.approval?.status === APPROVAL_STATUS.PENDING, 'INVALID_STATE', 'BAD_REQUEST', 400);

        await Task.updateOne(
            { _id: raw._id },
            {
                $set: {
                    'approval.status': APPROVAL_STATUS.APPROVED,
                    'approval.by': user.externalUserId,
                    'approval.at': new Date(),
                    ...(managerNote ? { 'approval.note': managerNote } : {}),
                    'assigneeConfirm.required': true,
                    status: raw.assignee ? TASK_STATUS.WAITING_ASSIGNEE_CONFIRM : TASK_STATUS.DRAFT,
                },
            }
        ).exec();

        const toUserIds = [raw.assignee, raw.createdBy].filter(Boolean).map(String);
        await logActivity({ actor: user.externalUserId, project: raw.project, task: raw._id, type: 'task.approval.approved' });
        await notifyEvent('task.approval.approved', { projectId: raw.project, taskId: raw._id, toUserIds });
        await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);

        const fresh = await Task.findById(raw._id).lean().exec();
        return asPlainTask(fresh);
    }, { requireAuth: true });
}

/** B7 — Reject start */
export async function rejectStart(taskId, managerNote) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(taskIdSchema, taskId);
        const raw = await Task.findById(id).lean().exec();
        assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);
        const project = await Project.findById(raw.project).lean().exec();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        assert(canManageProject(project, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);
        assert(raw.approval?.status === APPROVAL_STATUS.PENDING, 'INVALID_STATE', 'BAD_REQUEST', 400);

        await Task.updateOne(
            { _id: raw._id },
            {
                $set: {
                    'approval.status': APPROVAL_STATUS.REJECTED,
                    'approval.by': user.externalUserId,
                    'approval.at': new Date(),
                    ...(managerNote ? { 'approval.note': managerNote } : {}),
                    status: TASK_STATUS.DRAFT,
                },
            }
        ).exec();

        const toUserIds = [raw.createdBy, raw.assignee].filter(Boolean).map(String);
        await logActivity({ actor: user.externalUserId, project: raw.project, task: raw._id, type: 'task.approval.rejected' });
        await notifyEvent('task.approval.rejected', { projectId: raw.project, taskId: raw._id, toUserIds });
        await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);

        const fresh = await Task.findById(raw._id).lean().exec();
        return asPlainTask(fresh);
    }, { requireAuth: true });
}

/** B7 — Assign / Unassign */
export async function assign(taskId, assigneeOrNull) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(taskIdSchema, taskId);
        const raw = await Task.findById(id).lean().exec();
        assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);
        const project = await Project.findById(raw.project).lean().exec();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        const taskForPerm = toTaskForPerm(raw, project);
        assert(canAssignTask(taskForPerm, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

        const newAssignee = assigneeOrNull ? String(assigneeOrNull) : null;

        const set = { assignee: newAssignee };
        if (raw.approval?.status === APPROVAL_STATUS.APPROVED && newAssignee) {
            set['assigneeConfirm.required'] = true;
            set.status = TASK_STATUS.WAITING_ASSIGNEE_CONFIRM;
        }
        await Task.updateOne({ _id: raw._id }, { $set: set }).exec();

        await logActivity({
            actor: user.externalUserId,
            project: raw.project,
            task: raw._id,
            type: newAssignee ? 'task.assigned' : 'task.unassigned',
            payload: { assignee: newAssignee },
        });
        if (newAssignee) {
            await notifyEvent('task.assigned', { projectId: raw.project, taskId: raw._id, toUserId: newAssignee });
        }
        await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);

        const fresh = await Task.findById(raw._id).lean().exec();
        return asPlainTask(fresh);
    }, { requireAuth: true });
}

/** B7 — Assignee confirm start */
export async function confirmStartByAssignee(taskId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(taskIdSchema, taskId);
        const raw = await Task.findById(id).lean().exec();
        assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);
        assert(String(raw.assignee || '') === String(user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);
        assert(raw.approval?.status === APPROVAL_STATUS.APPROVED && raw.assigneeConfirm?.required === true && raw.status === TASK_STATUS.WAITING_ASSIGNEE_CONFIRM, 'INVALID_STATE', 'BAD_REQUEST', 400);

        await Task.updateOne(
            { _id: raw._id },
            {
                $set: {
                    'assigneeConfirm.required': false,
                    'assigneeConfirm.confirmedBy': user.externalUserId,
                    'assigneeConfirm.confirmedAt': new Date(),
                    status: TASK_STATUS.IN_PROGRESS,
                    ...(raw.startedAt ? {} : { startedAt: new Date() }),
                },
            }
        ).exec();

        const project = await Project.findById(raw.project).lean().exec();
        await logActivity({ actor: user.externalUserId, project: raw.project, task: raw._id, type: 'task.assignee.confirmed' });
        await notifyEvent('task.assignee.confirmed', { projectId: raw.project, taskId: raw._id, toUserIds: [...projectManagerIds(project), raw.createdBy].filter(Boolean) });
        await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);

        const fresh = await Task.findById(raw._id).lean().exec();
        return asPlainTask(fresh);
    }, { requireAuth: true });
}

/** B7 — Start now (manager hoặc assignee trong điều kiện cho phép) */
export async function startNow(taskId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(taskIdSchema, taskId);
        const raw = await Task.findById(id).lean().exec();
        assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        const project = await Project.findById(raw.project).lean().exec();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        const isManager = canManageProject(project, user.externalUserId);
        const isAssignee = String(raw.assignee || '') === String(user.externalUserId);
        const assigneeAllowed =
            isAssignee &&
            (raw.approval?.required !== true ||
                (raw.approval?.status === APPROVAL_STATUS.APPROVED && raw.assigneeConfirm?.required === false));

        assert(isManager || assigneeAllowed, 'FORBIDDEN', 'FORBIDDEN', 403);
        assert([TASK_STATUS.DRAFT, TASK_STATUS.ON_HOLD, TASK_STATUS.WAITING_ASSIGNEE_CONFIRM].includes(raw.status), 'INVALID_STATE', 'BAD_REQUEST', 400);

        await Task.updateOne(
            { _id: raw._id },
            { $set: { status: TASK_STATUS.IN_PROGRESS, ...(raw.startedAt ? {} : { startedAt: new Date() }) } }
        ).exec();

        await logActivity({ actor: user.externalUserId, project: raw.project, task: raw._id, type: 'task.started' });
        await notifyEvent('task.started', { projectId: raw.project, taskId: raw._id, toUserIds: [...projectManagerIds(project), raw.createdBy].filter(Boolean) });
        await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);

        const fresh = await Task.findById(raw._id).lean().exec();
        return asPlainTask(fresh);
    }, { requireAuth: true });
}

/** B7 — Mark done / Request review (assignee hoặc manager) */
export async function markDone(taskId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(taskIdSchema, taskId);
        const raw = await Task.findById(id).lean().exec();
        assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        const project = await Project.findById(raw.project).lean().exec();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        const isManager = canManageProject(project, user.externalUserId);
        const isAssignee = String(raw.assignee || '') === String(user.externalUserId);
        assert(isManager || isAssignee, 'FORBIDDEN', 'FORBIDDEN', 403);
        assert(raw.status === TASK_STATUS.IN_PROGRESS, 'INVALID_STATE', 'BAD_REQUEST', 400);

        await Task.updateOne({ _id: raw._id }, { $set: { status: TASK_STATUS.COMPLETED_AWAIT_REVIEW } }).exec();

        await logActivity({ actor: user.externalUserId, project: raw.project, task: raw._id, type: 'task.completed.requested_review' });
        await notifyEvent('task.completed.requested_review', { projectId: raw.project, taskId: raw._id, toUserIds: projectManagerIds(project) });
        await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);

        const fresh = await Task.findById(raw._id).lean().exec();
        return asPlainTask(fresh);
    }, { requireAuth: true });
}

/** B7 — (alias) requestReview */
export async function requestReview(taskId) {
    return markDone(taskId);
}

/** B7 — Approve completion & score */
export async function approveCompletion({ taskId, finalPoints }) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(taskIdSchema, taskId);
        const raw = await Task.findById(id).lean().exec();
        assert(raw, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        const project = await Project.findById(raw.project).lean().exec();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        assert(canManageProject(project, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);
        assert(raw.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW, 'INVALID_STATE', 'BAD_REQUEST', 400);

        const pts = Math.max(0, Number(finalPoints) || 0);

        await Task.updateOne(
            { _id: raw._id },
            {
                $set: {
                    finalPoints: pts,
                    scoredBy: user.externalUserId,
                    scoredAt: new Date(),
                    status: TASK_STATUS.COMPLETED,
                    completedAt: new Date(),
                },
            }
        ).exec();

        await logActivity({ actor: user.externalUserId, project: raw.project, task: raw._id, type: 'task.completed.approved', payload: { points: pts } });
        if (raw.assignee) {
            await notifyEvent('task.approved', { projectId: raw.project, taskId: raw._id, toUserId: raw.assignee, points: pts });
        }
        await revalidateMany([tags.task(raw._id), tags.project(raw.project)]);

        const fresh = await Task.findById(raw._id).lean().exec();
        return asPlainTask(fresh);
    }, { requireAuth: true });
}

