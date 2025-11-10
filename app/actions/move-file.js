'use server';

import { move as moveAttachment } from '@/data/attachment/actions/server.js';

function normalizeDestination({ projectId, taskId }) {
    if (!projectId) {
        throw new Error('Thiếu projectId đích khi di chuyển file.');
    }
    const normalizedProjectId = String(projectId);
    const normalizedTaskId = taskId ? String(taskId) : null;
    const scope = normalizedTaskId ? 'task' : 'project';
    return {
        scope,
        projectId: normalizedProjectId,
        taskId: normalizedTaskId,
    };
}

export async function moveFileAction({ attachmentId, projectId, taskId = null }) {
    if (!attachmentId) {
        throw new Error('Thiếu attachmentId khi di chuyển file.');
    }

    const destination = normalizeDestination({ projectId, taskId });

    return moveAttachment({
        attachmentId: String(attachmentId),
        to: destination,
    });
}
