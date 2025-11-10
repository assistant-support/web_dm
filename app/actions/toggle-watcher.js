'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import Task from '@/model/task.model.js';
import Project from '@/model/project.model.js';
import * as tags from '@/data/_shared/tags.js';
import { TASK_SCOPE } from '@/model/common/enums.js';
import { canViewProject } from '@/lib/permissions.js';

/**
 * Server action: toggle watcher state for a task.
 * Ensures the current user has sufficient permission before mutating the watcher list.
 *
 * @param {string} taskId - ID of the task to update.
 * @param {boolean} watching - Desired watcher state (true to watch, false to unwatch).
 * @returns {Promise<{ success: boolean, watching: boolean, watcherCount: number }>} Result payload.
 */
export async function toggleWatcherAction(taskId, watching) {
    if (!taskId) {
        throw new Error('Thiếu taskId khi cập nhật trạng thái theo dõi.');
    }
    if (typeof watching !== 'boolean') {
        throw new Error('Tham số watching phải là boolean.');
    }

    await connectDB();
    return runAction(async ({ user }) => {
        const uid = String(user.externalUserId);

        const task = await Task.findById(taskId);
        assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);

        const watcherSet = new Set(
            Array.isArray(task.watchers) ? task.watchers.map(String) : []
        );
        const alreadyWatching = watcherSet.has(uid);

        if (alreadyWatching === watching) {
            return {
                success: true,
                watching: alreadyWatching,
                watcherCount: watcherSet.size,
            };
        }

        let canToggle = false;

        if (!watching && alreadyWatching) {
            // Always allow users to stop watching their own subscription.
            canToggle = true;
        }

        if (!canToggle && watching) {
            const isCreator = task.createdBy && String(task.createdBy) === uid;
            const isAssignee = task.assignee && String(task.assignee) === uid;
            const isCollaborator = Array.isArray(task.collaborators)
                ? task.collaborators.some((c) => String(c.userId) === uid && !!c.acceptedAt)
                : false;
            const isPublishedPublic = task.scope === TASK_SCOPE.PUBLIC && task.public?.published;

            if (isCreator || isAssignee || isCollaborator || isPublishedPublic) {
                canToggle = true;
            }

            if (!canToggle && task.project) {
                const project = await Project.findById(task.project).select({ members: 1 }).lean();
                if (project && canViewProject(project, uid)) {
                    canToggle = true;
                }
            }
        }

        assert(canToggle, 'Bạn không có quyền cập nhật trạng thái theo dõi của task này', 'FORBIDDEN', 403);

        if (watching) {
            watcherSet.add(uid);
        } else {
            watcherSet.delete(uid);
        }

        task.watchers = Array.from(watcherSet);
        await task.save();

        await revalidateMany([
            tags.task(task._id),
            tags.project(task.project),
        ].filter(Boolean));

        return {
            success: true,
            watching,
            watcherCount: task.watchers.length,
        };
    }, { requireAuth: true });
}
