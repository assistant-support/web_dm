// /data/attachment/actions/server.js
// Server Actions cho B8 (upload/list/rename/move/remove) theo conventions B0→B7.
// - Một 'use server' ở đầu file.
// - await connectDB() + runAction(..., { requireAuth:true }) cho mọi action.
// - Quyền: dùng helpers từ @/lib/permissions.js (single source of truth) và luôn await.
// - Revalidate: import * as tags (khớp export named của tags.js) + .filter(Boolean) trước khi revalidateMany.
// - Activity & Notify: logActivity() và notifyEvent() cho mọi thao tác.
// - Trả về PlainAttachment (không trả Mongoose raw).

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { notifyEvent } from '@/lib/noti.js';
import { logActivity } from '@/lib/activity.js';
import * as tags from '@/data/_shared/tags.js';

import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';
import Attachment from '@/model/attachment.model.js';

import {
    canEditTask,
    canManageProject,
    canViewProject,
} from '@/lib/permissions.js';
import { PROJECT_ROLE } from '@/model/common/enums.js';

import {
    validate,
    attachmentCreateSchema,
    attachmentRenameSchema,
    attachmentMoveSchema,
    attachmentDeleteSchema,
} from '@/data/attachment/processors/validators.js';

import {
    uploadToDrive,
    renameDriveFile,
    moveDriveFile,
    deleteDriveFile,
    ensureProjectFolder,
    ensureTaskFolder,
} from '@/data/attachment/processors/drive-adapter.js';

import {
    createAttachment as createAttachmentRepo,
    listByProject,
    listByTask,
    renameAttachment,
    moveAttachment,
    deleteAttachment,
} from '@/data/attachment/processors/repo.js';

// ---- Helpers ----------------------------------------------------------------

function getProjectManagerIds(project) {
    return (project?.members || [])
        .filter((m) => [PROJECT_ROLE.OWNER, PROJECT_ROLE.MANAGER].includes(m.role))
        .map((m) => String(m.userId));
}

// ---- Actions ----------------------------------------------------------------

/**
 * Create attachment from FormData (file upload from client)
 */
export async function createAttachment(formData) {
    'use server';
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;

            // Extract data from FormData
            const file = formData.get('file');
            const taskId = formData.get('taskId');
            let projectId = formData.get('projectId');
            const scope = formData.get('scope');

            assert(file, 'Thiếu file', 'VALIDATION', 400);
            assert(scope, 'Thiếu scope', 'VALIDATION', 400);

            // Convert file to buffer
            const buffer = Buffer.from(await file.arrayBuffer());

            // Validate task if scope is task
            let task = null;
            if (scope === 'task') {
                assert(taskId, 'Thiếu taskId', 'VALIDATION', 400);
                task = await Task.findById(taskId).lean();
                assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);
                // Get projectId from task if not provided
                projectId = projectId || String(task.project);
            } else {
                assert(projectId, 'Thiếu projectId', 'VALIDATION', 400);
            }

            // Validate project
            const project = await Project.findById(projectId).lean();
            assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);

            // Verify task belongs to project if scope is task
            if (scope === 'task') {
                assert(
                    String(task.project) === String(project._id),
                    'Task không thuộc project',
                    'BAD_REQUEST',
                    400
                );
            }

            // Check permissions
            const allowMembers =
                String(process.env.ATTACHMENTS_PROJECT_UPLOAD || '').toLowerCase() === 'members';

            if (scope === 'project') {
                assert(
                    (await canManageProject(project, user)) ||
                    (allowMembers && (await canViewProject(project, user))),
                    'Bạn không có quyền upload vào project',
                    'FORBIDDEN',
                    403
                );
            } else {
                const taskForPerm = task ? { ...task, project } : null;
                assert(
                    await canEditTask(taskForPerm, user),
                    'Bạn không có quyền upload vào task',
                    'FORBIDDEN',
                    403
                );
            }

            // Determine parent folder
            const parentId =
                scope === 'project'
                    ? await ensureProjectFolder(project)
                    : await ensureTaskFolder({ project, task });

            // Upload to Drive
            const driveMeta = await uploadToDrive({
                buffer,
                name: file.name,
                mime: file.type,
                parentId,
            });

            // Create DB record
            const created = await createAttachmentRepo({
                scope,
                projectId: String(project._id),
                taskId: taskId ?? null,
                file: {
                    name: file.name,
                    size: file.size,
                    mime: file.type,
                },
                kind: 'other',
                driveMeta,
                createdBy: uid,
            });

            // Activity + Notify
            const managerIds = getProjectManagerIds(project);
            const recipientSet = new Set(managerIds);
            if (task?.assignee) recipientSet.add(String(task.assignee));

            await logActivity({
                actor: uid,
                project: String(project._id),
                task: taskId ?? null,
                type: 'attachment.added',
                payload: {
                    attachmentId: created.id,
                    name: created.name,
                    size: created.size,
                    mime: created.mime,
                    kind: created.kind,
                },
            });

            await notifyEvent('attachment.added', {
                projectId: String(project._id),
                taskId: taskId ?? null,
                attachmentId: created.id,
                byUserId: uid,
                toUserIds: Array.from(recipientSet),
                taskTitle: task ? task.title : null // [NEW]
            });

            // [NEW] If adding to a subtask, notify Parent Task Assignee
            if (task && task.parentTask) {
                const parentTask = await Task.findById(task.parentTask).select('assignee').lean();
                if (parentTask && parentTask.assignee && String(parentTask.assignee) !== uid) {
                     await notifyEvent('attachment.added', {
                        projectId: String(project._id),
                        taskId: taskId,
                        attachmentId: created.id,
                        byUserId: uid,
                        toUserIds: [String(parentTask.assignee)],
                        taskTitle: task.title
                    });
                }
            }

            await revalidateMany(
                [tags.project(project._id), taskId && tags.task(taskId)].filter(Boolean)
            );

            return created;
        },
        { requireAuth: true }
    );
}

export async function upload(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const input = validate(attachmentCreateSchema, payload);
            const uid = user.externalUserId;

            const project = await Project.findById(input.projectId).lean();
            assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);

            const task = input.taskId ? await Task.findById(input.taskId).lean() : null;
            if (input.scope === 'task') {
                assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);
                assert(
                    String(task.project) === String(project._id),
                    'Task không thuộc project',
                    'BAD_REQUEST',
                    400
                );
            }

            // Quyền
            const allowMembers =
                String(process.env.ATTACHMENTS_PROJECT_UPLOAD || '').toLowerCase() === 'members';

            if (input.scope === 'project') {
                assert(
                    (await canManageProject(project, user)) ||
                    (allowMembers && (await canViewProject(project, user))),
                    'Bạn không có quyền upload vào project',
                    'FORBIDDEN',
                    403
                );
            } else {
                // Dùng canEditTask trên task có kèm project để canManageProject(project, uid) hoạt động đúng bên trong canEditTask
                const taskForPerm = task ? { ...task, project } : null;
                assert(
                    await canEditTask(taskForPerm, user),
                    'Bạn không có quyền upload vào task',
                    'FORBIDDEN',
                    403
                );
            }

            // Parent folder
            const parentId =
                input.scope === 'project'
                    ? await ensureProjectFolder(project)
                    : await ensureTaskFolder({ project, task });

            // Upload lên Drive
            const driveMeta = await uploadToDrive({
                buffer: input.file.arrayBuffer,
                base64: input.file.base64,
                name: input.file.name,
                mime: input.file.mime,
                parentId,
            });

            // Tạo DB record (PlainAttachment)
            const created = await createAttachmentRepo({
                scope: input.scope,
                projectId: String(project._id),
                taskId: input.taskId ?? null,
                file: input.file,
                kind: input.kind,
                driveMeta,
                createdBy: uid,
            });

            // Activity + Notify
            const managerIds = getProjectManagerIds(project);
            const recipientSet = new Set(managerIds);
            if (task?.assignee) recipientSet.add(String(task.assignee));

            await logActivity({
                actor: uid,
                project: String(project._id),
                task: input.taskId ?? null,
                type: 'attachment.added',
                payload: {
                    attachmentId: created.id,
                    name: created.name,
                    size: created.size,
                    mime: created.mime,
                    kind: created.kind,
                },
            });

            await notifyEvent('attachment.added', {
                projectId: String(project._id),
                taskId: input.taskId ?? null,
                attachmentId: created.id,
                byUserId: uid,
                toUserIds: Array.from(recipientSet),
            });

            await revalidateMany(
                [tags.project(project._id), input.taskId && tags.task(input.taskId)].filter(Boolean)
            );

            return created;
        },
        { requireAuth: true }
    );
}

export async function listProjectAttachments(projectId) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            assert(projectId, 'Thiếu projectId');
            const uid = user.externalUserId;

            const project = await Project.findById(projectId).lean();
            assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);
            assert(await canViewProject(project, user), 'Bạn không có quyền xem project này', 'FORBIDDEN', 403);

            const items = await listByProject(projectId);
            // Serialize để tránh lỗi MongoDB ObjectId
            return JSON.parse(JSON.stringify(items));
        },
        { requireAuth: true }
    );
}

export async function listTaskAttachments(taskId) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            assert(taskId, 'Thiếu taskId');
            const uid = user.externalUserId;

            const task = await Task.findById(taskId).lean();
            assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);

            const project = await Project.findById(task.project).lean();
            assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);
            assert(await canViewProject(project, user), 'Bạn không có quyền xem task này', 'FORBIDDEN', 403);

            const items = await listByTask(taskId);
            // Serialize để tránh lỗi MongoDB ObjectId
            return JSON.parse(JSON.stringify(items));
        },
        { requireAuth: true }
    );
}

export async function rename(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const input = validate(attachmentRenameSchema, payload);
            const uid = user.externalUserId;

            const att = await Attachment.findById(input.attachmentId).lean();
            assert(att, 'Attachment không tồn tại', 'NOT_FOUND', 404);

            const project = await Project.findById(att.project).lean();
            assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);

            const isOwner = String(att.author) === String(uid);
            const isMgr = await canManageProject(project, user);
            assert(isOwner || isMgr, 'Không có quyền đổi tên', 'FORBIDDEN', 403);

            if (att.driveFileId) await renameDriveFile({ driveFileId: att.driveFileId, name: input.name });
            const updated = await renameAttachment(input.attachmentId, input.name, { byUserId: uid });

            await logActivity({
                actor: uid,
                project: String(att.project),
                task: att.task ? String(att.task) : null,
                type: 'attachment.renamed',
                payload: { attachmentId: updated.id, nameFrom: att.driveName || null, nameTo: input.name },
            });

            await notifyEvent('attachment.renamed', {
                projectId: String(att.project),
                taskId: att.task ? String(att.task) : null,
                attachmentId: updated.id,
                byUserId: uid,
                toUserIds: getProjectManagerIds(project),
            });

            await revalidateMany(
                [tags.project(att.project), att.task && tags.task(att.task)].filter(Boolean)
            );

            return updated;
        },
        { requireAuth: true }
    );
}

export async function move(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const input = validate(attachmentMoveSchema, payload);
            const uid = user.externalUserId;

            const att = await Attachment.findById(input.attachmentId).lean();
            assert(att, 'Attachment không tồn tại', 'NOT_FOUND', 404);

            const project = await Project.findById(att.project).lean();
            assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);

            // Cùng project
            assert(
                String(input.to.projectId) === String(att.project),
                'Không hỗ trợ cross-project',
                'BAD_REQUEST',
                400
            );

            const fromTask = att.task ? await Task.findById(att.task).lean() : null;
            const toTask = input.to.taskId ? await Task.findById(input.to.taskId).lean() : null;
            if (toTask) {
                assert(
                    String(toTask.project) === String(project._id),
                    'Task đích không thuộc project',
                    'BAD_REQUEST',
                    400
                );
            }

            const isMgr = await canManageProject(project, user);

            // Quyền theo nguồn/đích:
            // - source = task? cần canEditTask(source)
            // - source = project? cần member project (canViewProject)
            // - dest   = task? cần canEditTask(dest)
            // - dest   = project? cần member project (canViewProject)
            const canEditSource = fromTask
                ? await canEditTask({ ...fromTask, project }, user)
                : await canViewProject(project, user);

            const canEditDest = toTask
                ? await canEditTask({ ...toTask, project }, user)
                : await canViewProject(project, user);

            assert(isMgr || (canEditSource && canEditDest), 'Không có quyền move', 'FORBIDDEN', 403);

            const parentId =
                input.to.scope === 'project'
                    ? await ensureProjectFolder(project)
                    : await ensureTaskFolder({ project, task: toTask });

            if (att.driveFileId) {
                await moveDriveFile({ driveFileId: att.driveFileId, newParentId: parentId });
            }

            const updated = await moveAttachment(
                input.attachmentId,
                { scope: input.to.scope, projectId: input.to.projectId, taskId: input.to.taskId ?? null },
                parentId,
                { byUserId: uid }
            );

            await logActivity({
                actor: uid,
                project: String(att.project),
                task: updated.task ?? null,
                type: 'attachment.moved',
                payload: {
                    attachmentId: updated.id,
                    from: { taskId: att.task ? String(att.task) : null },
                    to: { taskId: updated.task ?? null },
                },
            });

            await notifyEvent('attachment.moved', {
                projectId: String(att.project),
                taskId: updated.task ?? null,
                attachmentId: updated.id,
                byUserId: uid,
                toUserIds: getProjectManagerIds(project),
            });

            await revalidateMany(
                [
                    tags.project(att.project),
                    att.task && tags.task(att.task),
                    updated.task && tags.task(updated.task),
                ].filter(Boolean)
            );

            return updated;
        },
        { requireAuth: true }
    );
}

export async function remove(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const input = validate(attachmentDeleteSchema, payload);
            const uid = user.externalUserId;

            const att = await Attachment.findById(input.attachmentId).lean();
            assert(att, 'Attachment không tồn tại', 'NOT_FOUND', 404);

            const project = await Project.findById(att.project).lean();
            assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);

            const isOwner = String(att.author) === String(uid);
            const isMgr = await canManageProject(project, user);
            assert(isOwner || isMgr, 'Không có quyền xóa', 'FORBIDDEN', 403);

            const hard = String(process.env.ATTACHMENTS_DELETE || '').toLowerCase() === 'hard';
            if (hard && att.driveFileId) {
                await deleteDriveFile({ driveFileId: att.driveFileId, hard: true });
            }
            const result = await deleteAttachment(input.attachmentId, { hard, byUserId: uid });

            await logActivity({
                actor: uid,
                project: String(att.project),
                task: att.task ? String(att.task) : null,
                type: 'attachment.removed',
                payload: { attachmentId: result.id, hard },
            });

            await notifyEvent('attachment.removed', {
                projectId: String(att.project),
                taskId: att.task ? String(att.task) : null,
                attachmentId: result.id,
                byUserId: uid,
                toUserIds: getProjectManagerIds(project),
            });

            await revalidateMany(
                [tags.project(att.project), att.task && tags.task(att.task)].filter(Boolean)
            );

            return result;
        },
        { requireAuth: true }
    );
}
