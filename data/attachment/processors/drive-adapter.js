// /data/attachment/processors/drive-adapter.js
'use server';

import {
    uploadFile as _uploadFile,
    renameFile as _renameFile,
    moveFile as _moveFile,
    deleteFile as _deleteFile,
    createProjectFolder,
    createTaskFolder,
} from '@/lib/drive.js';
import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';

/**
 * Upload buffer/base64 to Drive
 * @returns {{driveFileId:string, webViewLink?:string, webContentLink?:string, parentId:string, size?:number, name?:string}}
 */
export async function uploadToDrive({ buffer, base64, name, mime, parentId }) {
    let data = buffer;
    if (!data && base64) {
        data = Buffer.from(base64, 'base64');
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
    await _moveFile(driveFileId, newParentId);
}

export async function deleteDriveFile({ driveFileId, hard = false }) {
    await _deleteFile(driveFileId, hard);
}

/** Ensure project folder exists → return parentId */
export async function ensureProjectFolder(project) {
    if (project?.driveFolderId) return project.driveFolderId;
    const created = await createProjectFolder(project?.name || 'Project', project?.driveParentId || null);
    if (created?.id) {
        await Project.findByIdAndUpdate(project._id, {
            $set: { driveFolderId: created.id, driveFolderName: created.name },
        }, { lean: true });
        return created.id;
    }
    return '';
}

/** Ensure task folder exists (fallback: project folder) → return parentId */
export async function ensureTaskFolder({ project, task }) {
    const projectFolder = await ensureProjectFolder(project);
    const t = await Task.findById(task._id).lean();
    const currentId = t?.docs?.driveFolderId;
    if (currentId) return currentId;

    try {
        const created = await createTaskFolder(task.title || 'Task', projectFolder);
        if (created?.id) {
            await Task.findByIdAndUpdate(task._id, {
                $set: { 'docs.driveFolderId': created.id, 'docs.driveFolderName': created.name },
            }, { lean: true });
            return created.id;
        }
    } catch {
        // no-op, fall back
    }
    return projectFolder;
}
