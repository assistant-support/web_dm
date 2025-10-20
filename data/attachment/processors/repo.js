// /data/attachment/processors/repo.js
// Mục đích: Tầng làm việc với DB cho Attachment, trả PlainAttachment (không trả Mongoose raw).
// - Sửa listByProject: lọc đúng task==null và deletedAt==null.
// - Thống nhất counter cấp Project theo conventions: attachmentsCount. Để tương thích dữ liệu cũ (assetsCount),
//   triển khai helper incProjectAttachments() cập nhật cả hai trường (an toàn, không đổi schema file).
// - Loại bỏ { lean:true } trong *findByIdAndUpdate* (tùy chọn vì không có hiệu lực), vẫn trả về doc mới qua { new:true }.

import mongoose from 'mongoose';
import Attachment from '@/model/common/attachment.model.js';
import Task from '@/model/task.model.js';
import Project from '@/model/project.model.js';
import { STORAGE_PROVIDER } from '@/model/common/enums.js';
import { asPlainAttachment } from '@/lib/serialize.js';

const O = (id) => new mongoose.Types.ObjectId(String(id));

/** Tăng/giảm attachmentsCount ở cấp Project; đồng thời cập nhật assetsCount để giữ tương thích. */
async function incProjectAttachments(projectId, delta) {
    try {
        await Project.findByIdAndUpdate(
            O(projectId),
            { $inc: { attachmentsCount: delta, assetsCount: delta } }, // cập nhật cả 2 trường để không sai số liệu
            { new: false }
        );
    } catch {
        // swallow
    }
}

/**
 * Tạo record Attachment và trả PlainAttachment.
 * Counters: đã có post-save hook tăng tương ứng (Task/Project) → không tăng lại ở đây.
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

/** Danh sách attachment cấp Project (KHÔNG gồm những cái thuộc task) */
export async function listByProject(projectId) {
    const items = await Attachment.find({
        project: O(projectId),
        $or: [{ task: { $exists: false } }, { task: null }],
        deletedAt: null,
    })
        .sort({ createdAt: -1 })
        .lean();
    return items.map(asPlainAttachment);
}

/** Danh sách attachment cấp Task */
export async function listByTask(taskId) {
    const items = await Attachment.find({
        task: O(taskId),
        deletedAt: null,
    })
        .sort({ createdAt: -1 })
        .lean();
    return items.map(asPlainAttachment);
}

/** Lấy 1 attachment (plain) */
export async function getById(attachmentId) {
    const item = await Attachment.findById(O(attachmentId)).lean();
    return item ? asPlainAttachment(item) : null;
}

/** Đổi tên (DB only) và trả PlainAttachment */
export async function renameAttachment(attachmentId, name) {
    const updated = await Attachment.findByIdAndUpdate(
        O(attachmentId),
        { $set: { driveName: name } },
        { new: true }
    );
    return updated ? asPlainAttachment(updated) : null;
}

/**
 * Di chuyển giữa project <-> task cùng 1 project.
 * Side-effects: cập nhật counters chuẩn (Task.attachmentsCount & Project.attachmentsCount).
 */
export async function moveAttachment(attachmentId, { scope, projectId, taskId }, driveParentId) {
    const att = await Attachment.findById(O(attachmentId)).lean();
    if (!att) return null;

    const fromTaskId = att.task ? String(att.task) : null;
    const toTaskId = taskId ? String(taskId) : null;

    // Cập nhật record
    const updated = await Attachment.findByIdAndUpdate(
        O(attachmentId),
        {
            $set: {
                project: O(projectId),
                task: toTaskId ? O(toTaskId) : null,
                driveFolderId: driveParentId || att.driveFolderId || null,
            },
        },
        { new: true }
    );

    // Cập nhật counters (tránh double-count với hook: hook chỉ chạy khi create)
    try {
        if (fromTaskId && fromTaskId !== toTaskId) {
            await Task.findByIdAndUpdate(O(fromTaskId), { $inc: { attachmentsCount: -1 } });
        }
        if (!fromTaskId && toTaskId) {
            // project -> task
            await incProjectAttachments(projectId, -1);
        }

        if (toTaskId && fromTaskId !== toTaskId) {
            await Task.findByIdAndUpdate(O(toTaskId), { $inc: { attachmentsCount: 1 } });
        }
        if (!toTaskId && fromTaskId) {
            // task -> project
            await incProjectAttachments(projectId, 1);
        }
    } catch {
        // swallow
    }

    return updated ? asPlainAttachment(updated) : null;
}

/**
 * Xóa: soft (deletedAt) hoặc hard (remove doc).
 * Side-effects: giảm counters tương ứng.
 * Trả về plain + {_hard:boolean}
 */
export async function deleteAttachment(attachmentId, { hard = false } = {}) {
    const att = await Attachment.findById(O(attachmentId)).lean();
    if (!att) return null;

    const projectId = String(att.project);
    const taskId = att.task ? String(att.task) : null;

    let result;
    if (hard) {
        await Attachment.findByIdAndDelete(O(attachmentId));
        result = { ...asPlainAttachment(att), _hard: true };
    } else {
        const updated = await Attachment.findByIdAndUpdate(
            O(attachmentId),
            { $set: { deletedAt: new Date() } },
            { new: true }
        );
        result = { ...asPlainAttachment(updated), _hard: false };
    }

    try {
        if (taskId) {
            await Task.findByIdAndUpdate(O(taskId), { $inc: { attachmentsCount: -1 } });
        } else if (projectId) {
            await incProjectAttachments(projectId, -1);
        }
    } catch {
        // swallow
    }

    return result;
}
