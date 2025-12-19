// /data/comment/actions/server.js
// Cấu trúc: /data/comment/actions/*
// Mục đích: Server Actions cho Comments & Mentions (task-only) theo conventions B0→B7.
// - 'use server' + await connectDB() + runAction(..., { requireAuth:true })
// - Quyền: create/list = project member (canViewProject); delete = author hoặc manager (canManageProject)
// - Notify: comment.added (mentions + assignee + managers), comment.removed (managers)
// - Revalidate: task-level => [tags.task(taskId), tags.project(projectId)]
// - Activity: comment.added, comment.removed
// - Trả PlainComment (serialize) — không trả Mongoose raw.

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { notifyEvent } from '@/lib/noti.js';
import { logActivity } from '@/lib/activity.js';
import * as tags from '@/data/_shared/tags.js';

import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';
import Comment from '@/model/comment.model.js';
import User from '@/model/user.model.js';

import { canViewProject, canManageProject } from '@/lib/permissions.js';
import { PROJECT_ROLE } from '@/model/common/enums.js';

import {
    validate,
    commentCreateSchema,
    commentListByTaskSchema,
    commentDeleteSchema,
} from '@/data/comment/processors/validators.js';

import { extractMentions } from '@/data/comment/processors/mentions.js';

import {
    createComment,
    listByTask,
    deleteComment,
} from '@/data/comment/processors/repo.js';

/** Helper: lấy danh sách managerIds của project */
function getProjectManagerIds(project) {
    return (project?.members || [])
        .filter((m) => [PROJECT_ROLE.OWNER, PROJECT_ROLE.MANAGER].includes(m.role))
        .map((m) => String(m.userId));
}

/**
 * Action: Tạo comment cho Task (task-only).
 * - Quyền: project member (canViewProject)
 * - Mentions: @{externalUserId} → notify tới mentions + assignee + managers (loại trừ tác giả)
 */
export async function create(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const input = validate(commentCreateSchema, payload);
            const uid = user.externalUserId;

            const task = await Task.findById(input.taskId).lean();
            assert(task, 'Công việc không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);

            const project = await Project.findById(task.project).lean();
            assert(project, 'Dự án không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);

            // Quyền: project member
            assert(await canViewProject(project, user), 'Bạn không có quyền bình luận trong dự án này.', 'FORBIDDEN', 403);

            // Parse mentions & loại bỏ self
            const mentionsRaw = extractMentions(input.body);
            const mentions = Array.from(new Set(mentionsRaw.filter((m) => String(m) !== String(uid))));

            // Tạo comment
            const created = await createComment({
                taskId: String(task._id),
                authorId: uid,
                body: input.body,
                mentions,
            });

            // Activity
            await logActivity({
                actor: uid,
                project: String(project._id),
                task: String(task._id),
                type: 'comment.added',
                payload: { commentId: created.id },
            });

            // Notify: mentions + assignee + managers (loại trừ tác giả)
            const recips = new Set(mentions);
            const managers = getProjectManagerIds(project);
            managers.forEach((id) => recips.add(String(id)));
            if (task?.assignee) recips.add(String(task.assignee));
            recips.delete(String(uid));

            await notifyEvent('comment.added', {
                projectId: String(project._id),
                taskId: String(task._id),
                commentId: created.id,
                byUserId: uid,
                toUserIds: Array.from(recips),
            });

            // Revalidate: task + project
            await revalidateMany([tags.task(task._id), tags.project(project._id)].filter(Boolean));

            return created;
        },
        { requireAuth: true }
    );
}

/**
 * Action: List comments theo Task (desc, paging).
 * - Quyền: project member (canViewProject)
 */
export async function listByTaskAction(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const input = validate(commentListByTaskSchema, payload);
            const uid = user.externalUserId;
            const task = await Task.findById(input.taskId).lean();
            assert(task, 'Công việc không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);

            const project = await Project.findById(task.project).lean();
            assert(project, 'Dự án không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);

            assert(await canViewProject(project, user), 'Bạn không có quyền xem bình luận của dự án này.', 'FORBIDDEN', 403);

            const items = await listByTask(input.taskId, {
                limit: input.limit ?? 30,
                beforeId: input.beforeId,
            });

            // Populate author details (name and avatar)
            const populatedItems = await Promise.all(
                items.map(async (comment) => {
                    const author = await User.findOne({ externalUserId: comment.author }).lean();
                    
                    return {
                        ...comment,
                        author: {
                            id: author._id,
                            name: author.name,
                            avatar: author.avt,
                        },
                    };
                })
            );

            // Serialize để tránh lỗi MongoDB ObjectId
            return JSON.parse(JSON.stringify(populatedItems));
        },
        { requireAuth: true }
    );
}

/**
 * Action: Xoá (hard-delete) comment.
 * - Quyền: tác giả hoặc manager (canManageProject)
 * - Side-effect: giảm Task.commentsCount -1
 */
export async function remove(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const input = validate(commentDeleteSchema, payload);
            const uid = user.externalUserId;

            const comment = await Comment.findById(input.commentId).lean();
            assert(comment, 'Bình luận không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);

            const task = await Task.findById(comment.task).lean();
            assert(task, 'Công việc không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);

            const project = await Project.findById(task.project).lean();
            assert(project, 'Dự án không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);

            const isAuthor = String(comment.author) === String(uid);
            const isMgr = await canManageProject(project, user);
            assert(isAuthor || isMgr, 'Bạn không có quyền xóa bình luận này.', 'FORBIDDEN', 403);

            const removedPlain = await deleteComment(input.commentId);

            await logActivity({
                actor: uid,
                project: String(project._id),
                task: String(task._id),
                type: 'comment.removed',
                payload: { commentId: removedPlain?.id },
            });

            await notifyEvent('comment.removed', {
                projectId: String(project._id),
                taskId: String(task._id),
                commentId: removedPlain?.id,
                byUserId: uid,
                toUserIds: getProjectManagerIds(project),
            });

            await revalidateMany([tags.task(task._id), tags.project(project._id)].filter(Boolean));

            // thêm _removed để UI tiện xử lý (không thay đổi schema trả về)
            return { ...removedPlain, _removed: true };
        },
        { requireAuth: true }
    );
}
