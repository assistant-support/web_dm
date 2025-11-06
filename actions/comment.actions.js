/**
 * @file actions/comment.actions.js
 * @description Server Actions for comment-related business logic.
 */

'use server';

import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { getRequestUser } from '@/lib/request-user';
import { logActivity } from '@/lib/activity';
import * as commentData from '@/data/comment.data';
import * as taskData from '@/data/task.data';
import { canViewTask } from '@/lib/permissions'; // Assuming canView implies canComment

const AddCommentSchema = z.object({
    content: z.string().min(1, 'Comment cannot be empty.'),
    targetId: z.string(),
    targetType: z.enum(['task', 'project']),
});

/**
 * Adds a new comment to a target (task or project).
 * @param {FormData} formData - Must contain content, targetId, and targetType.
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function addComment(formData) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const validation = AddCommentSchema.safeParse(Object.fromEntries(formData));
    if (!validation.success) {
        return { success: false, error: 'Invalid comment data.' };
    }

    const { content, targetId, targetType } = validation.data;

    try {
        // Permission Check
        if (targetType === 'task') {
            const task = await taskData.findTaskById(targetId);
            if (!task || !canViewTask(task, user.id)) {
                return { success: false, error: 'Permission denied.' };
            }
        } // Add similar check for 'project' if needed

        const newComment = await commentData.createComment({
            author: user.id,
            content,
            targetId,
            targetType,
        });

        revalidateTag(`comments-${targetId}`);

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: 'Failed to add comment.' };
    }
}

/**
 * Deletes a comment.
 * @param {string} commentId - The ID of the comment to delete.
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteComment(commentId) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
        const comment = await commentData.findCommentById(commentId);
        if (!comment) return { success: false, error: 'Comment not found.' };

        // Permission Check: only author or a project manager can delete
        // (A more complex check might be needed for project managers)
        if (comment.author.toString() !== user.id) {
            return { success: false, error: 'Permission denied.' };
        }

        await commentData.deleteCommentById(commentId);

        revalidateTag(`comments-${comment.targetId}`);

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: 'Failed to delete comment.' };
    }
}
