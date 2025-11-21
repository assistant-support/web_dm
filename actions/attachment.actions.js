/**
 * @file actions/attachment.actions.js
 * @description Server Actions for handling file attachments, including Google Drive integration.
 */

'use server';

import { revalidateTag } from 'next/cache';
import { google } from 'googleapis';
import { getRequestUser } from '@/lib/request-user';
import * as taskData from '@/data/task.data';
import * as attachmentData from '@/data/attachment.data';
import { canEditTask } from '@/lib/permissions';
import { getOauthClientForUser } from '@/lib/oauth-client'; // Assumes this helper exists

/**
 * Creates a dedicated folder for a task in Google Drive if it doesn't exist.
 * @param {string} taskId - The ID of the task.
 * @returns {Promise<{success: boolean, folderId: string|null, error: string|null}>}
 */
export async function ensureTaskDriveFolder(taskId) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: 'Unauthorized', folderId: null };

    const task = await taskData.findTaskById(taskId);
    if (!task) return { success: false, error: 'Task not found', folderId: null };

    if (!canEditTask(task, user)) {
        return { success: false, error: 'Permission denied', folderId: null };
    }

    // Check if folder already exists
    if (task.driveFolderId) {
        return { success: true, folderId: task.driveFolderId, error: null };
    }

    try {
        const oauth2Client = await getOauthClientForUser(user.id);
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // You need to know the parent folder ID (e.g., from the project or a global config)
        const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
        if (!PARENT_FOLDER_ID) throw new Error("Parent Drive folder ID is not configured.");

        const fileMetadata = {
            name: `Task-${task.title.replace(/[^a-zA-Z0-9]/g, '_')}-${taskId}`,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [PARENT_FOLDER_ID],
        };

        const folder = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });

        const folderId = folder.data.id;
        if (!folderId) throw new Error("Failed to create Drive folder.");

        // Save the new folder ID to the task
        await taskData.updateTaskById(taskId, { driveFolderId: folderId });

        revalidateTag(`task-detail-${taskId}`);
        return { success: true, folderId, error: null };

    } catch (error) {
        console.error('Google Drive folder creation failed:', error);
        return { success: false, error: 'Could not create Google Drive folder.', folderId: null };
    }
}

/**
 * Attaches a file (from Google Drive, etc.) to a task.
 * This action records the file metadata in the database.
 * @param {FormData} formData - Must contain taskId, fileName, fileUrl, mimeType, etc.
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function attachFileToTask(formData) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const taskId = formData.get('taskId');
    const fileData = {
        name: formData.get('name'),
        url: formData.get('url'),
        mimeType: formData.get('mimeType'),
        provider: formData.get('provider') || 'google-drive',
    };

    if (!taskId || !fileData.name || !fileData.url) {
        return { success: false, error: 'Invalid file data.' };
    }

    const task = await taskData.findTaskById(taskId);
    if (!task || !canEditTask(task, user)) {
        return { success: false, error: 'Permission denied.' };
    }

    try {
        await attachmentData.createAttachment({
            ...fileData,
            targetId: taskId,
            targetType: 'task',
            uploadedBy: user.id,
        });

        revalidateTag(`attachments-${taskId}`);
        revalidateTag(`task-detail-${taskId}`);

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: 'Failed to attach file.' };
    }
}
