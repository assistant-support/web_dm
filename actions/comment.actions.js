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
    content: z.string().min(1, 'Nội dung bình luận không được để trống.'),
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
    if (!user) return { success: false, error: 'Bạn chưa đăng nhập.' };

    const validation = AddCommentSchema.safeParse(Object.fromEntries(formData));
    if (!validation.success) {
        return { success: false, error: 'Dữ liệu bình luận không hợp lệ.' };
    }

    const { content, targetId, targetType } = validation.data;

    try {
        // Permission Check
        if (targetType === 'task') {
            const task = await taskData.findTaskById(targetId);
            if (!task || !canViewTask(task, user)) {
                return { success: false, error: 'Bạn không có quyền bình luận.' };
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
        return { success: false, error: 'Thêm bình luận thất bại.' };
    }
}

/**
 * Deletes a comment.
 * @param {string} commentId - The ID of the comment to delete.
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteComment(commentId) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: 'Bạn chưa đăng nhập.' };

    try {
        const comment = await commentData.findCommentById(commentId);
        if (!comment) return { success: false, error: 'Bình luận không tồn tại hoặc đã bị xóa.' };

        // Permission Check: Author HOẶC PM/Owner của project
        const isAuthor = comment.author.toString() === user.id;
        
        // Nếu không phải author, kiểm tra quyền PM/Owner
        if (!isAuthor) {
            // Nếu comment trên task, lấy task để check project permission
            if (comment.targetType === 'task') {
                const task = await taskData.findTaskById(comment.targetId);
                if (task && task.project) {
                    const { canManageProject } = await import('@/lib/permissions.js');
                    const canDelete = await canManageProject(task.project, user);
                    if (!canDelete) {
                        return { success: false, error: 'Bạn không có quyền xóa bình luận này.' };
                    }
                } else {
                    // Task không có project hoặc không tìm thấy
                    return { success: false, error: 'Bạn không có quyền xóa bình luận này.' };
                }
            } else {
                // Comment trên project - cần implement logic tương tự
                return { success: false, error: 'Bạn không có quyền xóa bình luận này.' };
            }
        }

        await commentData.deleteCommentById(commentId);

        revalidateTag(`comments-${comment.targetId}`);

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: 'Xóa bình luận thất bại.' };
    }
}
