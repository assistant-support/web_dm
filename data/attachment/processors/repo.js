// /data/attachment/processors/repo.js
import mongoose from 'mongoose';
import Attachment from '@/model/common/attachment.model.js';
import Task from '@/model/task.model.js';
import Project from '@/model/project.model.js';
import { STORAGE_PROVIDER } from '@/model/common/enums.js';
import { asPlainAttachment } from '@/lib/serialize.js';

const O = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Create + return PlainAttachment
 */
export async function createAttachment({
    scope, projectId, taskId = null,
    file, kind,
    driveMeta, createdBy,
}) {
    const doc = await Attachment.create({
        project: O(projectId),
        task: taskId ? O(taskId) : null,
        author: String(createdBy),
        storage: STORAGE_PROVIDER.DRIVE,
        driveFileId: driveMeta?.driveFileId,
        driveFolderId: driveMeta?.parentId,
        driveName: file?.name ?? driveMeta?.name ?? '',
        mimeType: file?.mime ?? null,
        size: file?.size ?? driveMeta?.size ?? null,
        webViewLink: driveMeta?.webViewLink ?? null,
        webContentLink: driveMeta?.webContentLink ?? null,
        kind,
        label: null,
    });
    return asPlainAttachment(doc);
}

/** List by project (project-level attachments only; task==null) */
export async function listByProject(projectId) {
    const items = await Attachment.find({
        project: O(projectId),
        $or: [{ task: { $exists: false } }, { task: null }],
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    }).sort({ createdAt: -1 }).lean();
    return items.map(asPlainAttachment);
}

/** List by task */
export async function listByTask(taskId) {
    const items = await Attachment.find({
        task: O(taskId),
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    }).sort({ createdAt: -1 }).lean();
    return items.map(asPlainAttachment);
}

/** Get by id (lean) */
export async function getById(attachmentId) {
    const item = await Attachment.findById(O(attachmentId)).lean();
    return item ? asPlainAttachment(item) : null;
}

/** Rename (DB only) */
export async function renameAttachment(attachmentId, name) {
    const updated = await Attachment.findByIdAndUpdate(
        O(attachmentId),
        { $set: { driveName: name } },
        { new: true, lean: true }
    );
    return updated ? asPlainAttachment(updated) : null;
}

/**
 * Move between containers within the same project.
 * Side-effects: adjust counters (-1/+1) accordingly (NO post-save hook triggered on findByIdAndUpdate)
 */
export async function moveAttachment(attachmentId, { scope, projectId, taskId }, driveParentId) {
    const att = await Attachment.findById(O(attachmentId)).lean();
    if (!att) return null;

    const fromTaskId = att.task ? String(att.task) : null;
    const toTaskId = taskId ? String(taskId) : null;

    // update attachment record
    const updated = await Attachment.findByIdAndUpdate(
        O(attachmentId),
        {
            $set: {
                project: O(projectId),
                task: toTaskId ? O(toTaskId) : null,
                driveFolderId: driveParentId || att.driveFolderId || null,
            },
        },
        { new: true, lean: true }
    );

    // counters
    try {
        // from
        if (fromTaskId && fromTaskId !== toTaskId) {
            await Task.findByIdAndUpdate(O(fromTaskId), { $inc: { attachmentsCount: -1 } }, { lean: true });
        }
        if (!fromTaskId && toTaskId) {
            // moved from project -> task
            await Project.findByIdAndUpdate(O(projectId), { $inc: { assetsCount: -1 } }, { lean: true });
        }
        // to
        if (toTaskId && fromTaskId !== toTaskId) {
            await Task.findByIdAndUpdate(O(toTaskId), { $inc: { attachmentsCount: 1 } }, { lean: true });
        }
        if (!toTaskId && fromTaskId) {
            // moved from task -> project
            await Project.findByIdAndUpdate(O(projectId), { $inc: { assetsCount: 1 } }, { lean: true });
        }
    } catch {
        // swallow
    }

    return updated ? asPlainAttachment(updated) : null;
}

/**
 * Soft/Hard delete attachment
 *  - Soft: set deletedAt; counters -1
 *  - Hard: remove doc; counters -1
 * Returns plain + {_hard:boolean}
 */
export async function deleteAttachment(attachmentId, { hard = false } = {}) {
    const att = await Attachment.findById(O(attachmentId)).lean();
    if (!att) return null;

    const projectId = String(att.project);
    const taskId = att.task ? String(att.task) : null;

    let result;
    if (hard) {
        await Attachment.findByIdAndDelete(O(attachmentId), { lean: true });
        result = { ...asPlainAttachment(att), _hard: true };
    } else {
        const updated = await Attachment.findByIdAndUpdate(
            O(attachmentId),
            { $set: { deletedAt: new Date() } },
            { new: true, lean: true }
        );
        result = { ...asPlainAttachment(updated), _hard: false };
    }

    // counters
    try {
        if (taskId) {
            await Task.findByIdAndUpdate(O(taskId), { $inc: { attachmentsCount: -1 } }, { lean: true });
        } else {
            await Project.findByIdAndUpdate(O(projectId), { $inc: { assetsCount: -1 } }, { lean: true });
        }
    } catch { }

    return result;
}
