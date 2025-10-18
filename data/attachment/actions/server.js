// /data/attachment/actions/server.js
'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { AppError } from '@/lib/errors.js';
import { notifyEvent } from '@/lib/noti.js';
import { project as tagProject, task as tagTask } from '@/data/_shared/tags.js';

import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';
import Attachment from '@/model/common/attachment.model.js';
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
    createAttachment,
    listByProject,
    listByTask,
    renameAttachment,
    moveAttachment,
    deleteAttachment,
    getById,
} from '@/data/attachment/processors/repo.js';

function isProjectMember(project, uid) {
    return Array.isArray(project?.members) && project.members.some(m => String(m.userId) === String(uid));
}
function isProjectManager(project, uid) {
    return Array.isArray(project?.members) && project.members.some(m => {
        const r = String(m.role);
        return String(m.userId) === String(uid) && (r === PROJECT_ROLE.OWNER || r === PROJECT_ROLE.MANAGER);
    });
}
function getProjectManagerIds(project) {
    return (project?.members || [])
        .filter(m => [PROJECT_ROLE.OWNER, PROJECT_ROLE.MANAGER].includes(m.role))
        .map(m => String(m.userId));
}

export async function upload(payload) {
    'use server';
    await connectDB();
    return runAction(async ({ user }) => {
        const input = validate(attachmentCreateSchema, payload);
        const uid = user.externalUserId;

        const project = await Project.findById(input.projectId).lean();
        assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);

        const task = input.taskId ? await Task.findById(input.taskId).lean() : null;
        if (input.scope === 'task') {
            assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);
            assert(String(task.project) === String(project._id), 'Task không thuộc project', 'BAD_REQUEST', 400);
        }

        // Quyền upload
        const allowMembers = String(process.env.ATTACHMENTS_PROJECT_UPLOAD || '').toLowerCase() === 'members';
        if (input.scope === 'project') {
            assert(isProjectManager(project, uid) || (allowMembers && isProjectMember(project, uid)),
                'Bạn không có quyền upload vào project', 'FORBIDDEN', 403);
        } else {
            // task scope
            const canEdit =
                isProjectManager(project, uid) ||
                [task?.createdBy, task?.assignee].map(String).includes(String(uid));
            assert(canEdit, 'Bạn không có quyền upload vào task', 'FORBIDDEN', 403);
        }

        // Chọn parentId
        const parentId = input.scope === 'project'
            ? await ensureProjectFolder(project)
            : await ensureTaskFolder({ project, task });

        // Chuẩn file buffer/base64
        const driveMeta = await uploadToDrive({
            buffer: input.file.arrayBuffer, base64: input.file.base64,
            name: input.file.name, mime: input.file.mime, parentId,
        });

        // Tạo DB record
        const created = await createAttachment({
            scope: input.scope,
            projectId: String(project._id),
            taskId: input.taskId ?? null,
            file: input.file,
            kind: input.kind,
            driveMeta,
            createdBy: uid,
        });

        // Activity + Noti
        const managerIds = getProjectManagerIds(project);
        const toUserIds = new Set(managerIds);
        if (task?.assignee) toUserIds.add(String(task.assignee));

        await notifyEvent('attachment.added', {
            projectId: String(project._id),
            taskId: input.taskId ?? null,
            attachmentId: created.id,
            byUserId: uid,
            toUserIds: Array.from(toUserIds),
        });

        // Revalidate
        await revalidateMany([
            tagProject(project._id),
            input.taskId ? tagTask(input.taskId) : '',
        ]);

        return created;
    }, { requireAuth: true });
}

export async function listProjectAttachments(projectId) {
    'use server';
    await connectDB();
    return runAction(async ({ user }) => {
        assert(projectId, 'Thiếu projectId');
        const uid = user.externalUserId;

        const project = await Project.findById(projectId).lean();
        assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);
        assert(isProjectMember(project, uid), 'Bạn không có quyền xem project này', 'FORBIDDEN', 403);

        const items = await listByProject(projectId);
        return items;
    }, { requireAuth: true });
}

export async function listTaskAttachments(taskId) {
    'use server';
    await connectDB();
    return runAction(async ({ user }) => {
        assert(taskId, 'Thiếu taskId');
        const uid = user.externalUserId;

        const task = await Task.findById(taskId).lean();
        assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);

        const project = await Project.findById(task.project).lean();
        assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);
        assert(isProjectMember(project, uid), 'Bạn không có quyền xem task này', 'FORBIDDEN', 403);

        const items = await listByTask(taskId);
        return items;
    }, { requireAuth: true });
}

export async function rename(payload) {
    'use server';
    await connectDB();
    return runAction(async ({ user }) => {
        const input = validate(attachmentRenameSchema, payload);
        const uid = user.externalUserId;

        const att = await Attachment.findById(input.attachmentId).lean();
        assert(att, 'Attachment không tồn tại', 'NOT_FOUND', 404);

        const project = await Project.findById(att.project).lean();
        assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);

        const isOwner = String(att.author) === String(uid);
        assert(isOwner || isProjectManager(project, uid), 'Không có quyền đổi tên', 'FORBIDDEN', 403);

        // Drive + DB
        if (att.driveFileId) await renameDriveFile({ driveFileId: att.driveFileId, name: input.name });
        const updated = await renameAttachment(input.attachmentId, input.name);

        await notifyEvent('attachment.renamed', {
            projectId: String(att.project),
            taskId: att.task ? String(att.task) : null,
            attachmentId: updated.id,
            byUserId: uid,
            toUserIds: getProjectManagerIds(project),
        });

        await revalidateMany([
            tagProject(att.project),
            att.task ? tagTask(att.task) : '',
        ]);

        return updated;
    }, { requireAuth: true });
}

export async function move(payload) {
    'use server';
    await connectDB();
    return runAction(async ({ user }) => {
        const input = validate(attachmentMoveSchema, payload);
        const uid = user.externalUserId;

        const att = await Attachment.findById(input.attachmentId).lean();
        assert(att, 'Attachment không tồn tại', 'NOT_FOUND', 404);

        const project = await Project.findById(att.project).lean();
        assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);

        // ràng buộc cùng project
        assert(String(input.to.projectId) === String(att.project), 'Không hỗ trợ cross-project', 'BAD_REQUEST', 400);

        // Quyền: manager hoặc có thể edit ở nguồn & đích
        const fromTask = att.task ? await Task.findById(att.task).lean() : null;
        const toTask = input.to.taskId ? await Task.findById(input.to.taskId).lean() : null;
        if (toTask) {
            assert(String(toTask.project) === String(project._id), 'Task đích không thuộc project', 'BAD_REQUEST', 400);
        }

        const isMgr = isProjectManager(project, uid);
        const canEditFrom =
            isMgr || (fromTask && [fromTask.createdBy, fromTask.assignee].map(String).includes(String(uid))) || (!fromTask);
        const canEditTo =
            isMgr || (toTask && [toTask.createdBy, toTask.assignee].map(String).includes(String(uid))) || (!toTask);

        assert(isMgr || (canEditFrom && canEditTo), 'Không có quyền move', 'FORBIDDEN', 403);

        // Chọn parent id
        const parentId = input.to.scope === 'project'
            ? await ensureProjectFolder(project)
            : await ensureTaskFolder({ project, task: toTask });

        if (att.driveFileId && parentId) {
            await moveDriveFile({ driveFileId: att.driveFileId, newParentId: parentId });
        }

        const updated = await moveAttachment(input.attachmentId, {
            scope: input.to.scope,
            projectId: input.to.projectId,
            taskId: input.to.taskId ?? null,
        }, parentId);

        await notifyEvent('attachment.moved', {
            projectId: String(att.project),
            taskId: updated.task ?? null,
            attachmentId: updated.id,
            byUserId: uid,
            toUserIds: getProjectManagerIds(project),
        });

        await revalidateMany([
            tagProject(att.project),
            att.task ? tagTask(att.task) : '',
            updated.task ? tagTask(updated.task) : '',
        ]);

        return updated;
    }, { requireAuth: true });
}

export async function remove(payload) {
    'use server';
    await connectDB();
    return runAction(async ({ user }) => {
        const input = validate(attachmentDeleteSchema, payload);
        const uid = user.externalUserId;

        const att = await Attachment.findById(input.attachmentId).lean();
        assert(att, 'Attachment không tồn tại', 'NOT_FOUND', 404);

        const project = await Project.findById(att.project).lean();
        assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);

        const isOwner = String(att.author) === String(uid);
        assert(isOwner || isProjectManager(project, uid), 'Không có quyền xóa', 'FORBIDDEN', 403);

        const hard = String(process.env.ATTACHMENTS_DELETE || '').toLowerCase() === 'hard';
        if (hard && att.driveFileId) {
            await deleteDriveFile({ driveFileId: att.driveFileId, hard: true });
        }
        const result = await deleteAttachment(input.attachmentId, { hard });

        await notifyEvent('attachment.removed', {
            projectId: String(att.project),
            taskId: att.task ? String(att.task) : null,
            attachmentId: result.id,
            byUserId: uid,
            toUserIds: getProjectManagerIds(project),
        });

        await revalidateMany([
            tagProject(att.project),
            att.task ? tagTask(att.task) : '',
        ]);

        return result;
    }, { requireAuth: true });
}
