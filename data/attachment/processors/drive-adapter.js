// /data/attachment/processors/drive-adapter.js
// Adapter trung gian giữa actions/repo và lib/drive (thực thi thật).
// - KHÔNG dùng 'use server' tại processors.
// - Chuẩn hoá buffer từ arrayBuffer/base64 → Buffer.
// - Khi thiếu parentId hoặc tạo folder thất bại: ném AppError(code, { status }) để UI/log đồng nhất.

import { uploadFile as _uploadFile } from '@/lib/drive.js';
import { renameFile as _renameFile } from '@/lib/drive.js';
import { moveFile as _moveFile } from '@/lib/drive.js';
import { deleteFile as _deleteFile } from '@/lib/drive.js';
import { createProjectFolder, createTaskFolder } from '@/lib/drive.js';
import { resolveMonthlyDriveFolderId } from '@/lib/drive-utils.js';
import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';
import { AppError } from '@/lib/errors.js';

export async function uploadToDrive({ buffer, base64, name, mime, parentId }) {
    let data = null;

    if (buffer instanceof Buffer) {
        data = buffer;
    } else if (buffer && typeof buffer === 'object' && typeof buffer.byteLength === 'number') {
        // ArrayBuffer-like
        data = Buffer.from(new Uint8Array(buffer));
    } else if (buffer?.arrayBuffer && typeof buffer.arrayBuffer === 'function') {
        // Blob/File-like
        const ab = await buffer.arrayBuffer();
        data = Buffer.from(new Uint8Array(ab));
    } else if (!buffer && base64) {
        data = Buffer.from(base64, 'base64');
    }

    if (!parentId) {
        throw new AppError('DRIVE_PARENT_NOT_FOUND', { status: 400 });
    }
    if (!data) {
        data = Buffer.alloc(0);
    }

    const result = await _uploadFile({ name, mime, parentId, buffer: data });
    return {
        driveFileId: result.id,
        webViewLink: result.webViewLink,
        webContentLink: result.webContentLink,
        parentId: result.parents?.[0] || parentId,
        size: result.size,
        name: result.name || name,
    };
}

export async function renameDriveFile({ driveFileId, name }) {
    await _renameFile(driveFileId, name);
}

export async function moveDriveFile({ driveFileId, newParentId }) {
    if (!newParentId) throw new AppError('DRIVE_PARENT_NOT_FOUND', { status: 400 });
    await _moveFile(driveFileId, newParentId);
}

export async function deleteDriveFile({ driveFileId, hard = false }) {
    await _deleteFile(driveFileId, hard);
}

export async function ensureProjectFolder(project) {
    if (project?.driveFolderId) return project.driveFolderId;
    if (project?.rootDriveFolderId) return project.rootDriveFolderId;
    const created = await createProjectFolder(project?.name || 'Project', project?.driveParentId || null);
    if (created?.id) {
        await Project.findByIdAndUpdate(project._id, {
            $set: {
                driveFolderId: created.id,
                driveFolderName: created.name,
                rootDriveFolderId: created.id,
                rootDriveFolderName: created.name,
            },
        });
        if (project && typeof project === 'object') {
            project.driveFolderId = created.id;
            project.driveFolderName = created.name;
            project.rootDriveFolderId = created.id;
            project.rootDriveFolderName = created.name;
        }
        return created.id;
    }
    throw new AppError('CREATE_PROJECT_FOLDER_FAILED', { status: 500 });
}

export async function ensureTaskFolder({ project, task }) {
    const projectFolder = await ensureProjectFolder(project);
    const t = await Task.findById(task._id).lean();
    if (t?.docs?.driveFolderId) return t.docs.driveFolderId;

    const effectiveTask = t || task;
    const isSubtask = Boolean(effectiveTask?.parentTask);
    let parentFolderId = projectFolder;

    let projectMeta = project;
    if (!projectMeta?.monthlyDriveFolders || !Array.isArray(projectMeta.monthlyDriveFolders)) {
        const projectId = project?._id || project?.id;
        if (projectId) {
            projectMeta = await Project.findById(projectId).lean();
        }
    }
    const rootFolderId =
        projectMeta?.rootDriveFolderId ||
        projectMeta?.driveFolderId ||
        projectFolder;

    if (isSubtask) {
        const parentTask = await Task.findById(effectiveTask.parentTask).lean();
        if (parentTask?.docs?.driveFolderId) {
            parentFolderId = parentTask.docs.driveFolderId;
        }
    } else {
        const referenceDate =
            effectiveTask?.plannedStartAt ||
            effectiveTask?.plannedDueAt ||
            effectiveTask?.createdAt ||
            new Date();
        const monthlyFolderId = resolveMonthlyDriveFolderId(projectMeta, referenceDate);
        parentFolderId = monthlyFolderId || rootFolderId;
    }

    try {
        const created = await createTaskFolder(task.title || 'Task', parentFolderId);
        if (created?.id) {
            await Task.findByIdAndUpdate(task._id, {
                $set: {
                    'docs.enabled': true,
                    'docs.driveFolderId': created.id,
                    'docs.driveFolderName': created.name,
                },
            });
            return created.id;
        }
    } catch {
        // no-op
    }
    if (projectFolder) return projectFolder;
    throw new AppError('CREATE_TASK_FOLDER_FAILED', { status: 500 });
}
