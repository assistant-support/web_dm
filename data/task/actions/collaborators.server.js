// data/task/actions/collaborators.server.js
// Mục đích: Server Actions cho quản lý collaborators (mời người vào task)

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { canManageProject, canViewProject } from '@/lib/permissions.js';
import { logActivity } from '@/lib/activity.js';
import { notifyEvent } from '@/lib/noti.js';
import * as tags from '@/data/_shared/tags.js';

import Task from '@/model/task.model.js';
import Project from '@/model/project.model.js';
import { asPlainTask } from '@/lib/serialize.js';

import {
    addCollaborator,
    acceptCollaboration,
    removeCollaborator,
} from '@/data/task/processors/collaborators.js';

/**
 * ACTION: Mời người vào task (collaborator)
 * Chỉ assignee hoặc manager project mới mời được
 * @param {string} taskId - Task ID
 * @param {Object} params - { userId: string, role?: 'contributor' | 'reviewer' }
 * @returns {Promise<Object>} - Plain task object
 */
export async function inviteCollaborator(taskId, { userId, role = 'contributor' }) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        
        const task = await Task.findById(taskId);
        assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);
        
        // Check permission: chỉ assignee hoặc manager mới mời được
        let canInvite = false;
        if (task.assignee === uid) {
            canInvite = true;
        } else if (task.project) {
            const project = await Project.findById(task.project);
            if (project && canManageProject(project, user)) {
                canInvite = true;
            }
        }
        
        assert(canInvite, 'Bạn không có quyền mời collaborator', 'FORBIDDEN', 403);
        
        // Add collaborator
        const updated = await addCollaborator(taskId, { 
            userId: String(userId), 
            invitedBy: uid, 
            role: role || 'contributor'
        });
        
        await logActivity({
            actor: uid,
            team: task.team,
            project: task.project,
            task: task._id,
            type: 'task.collaborator.invited',
            payload: { userId: String(userId), role },
        });
        
        await notifyEvent('task.collaborator.invited', {
            taskId: String(task._id),
            projectId: task.project ? String(task.project) : null,
            byUserId: uid,
            toUserIds: [String(userId)],
        });
        
        await revalidateMany([
            tags.task(task._id),
            tags.project(task.project),
        ].filter(Boolean));
        
        return asPlainTask(updated.toObject());
    }, { requireAuth: true });
}

/**
 * ACTION: Chấp nhận lời mời collaborator
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} - Plain task object
 */
export async function acceptCollaboratorInvite(taskId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        
        const updated = await acceptCollaboration(taskId, uid);
        
        await logActivity({
            actor: uid,
            project: updated.project,
            task: updated._id,
            type: 'task.collaborator.accepted',
        });
        
        await notifyEvent('task.collaborator.accepted', {
            taskId: String(updated._id),
            projectId: updated.project ? String(updated.project) : null,
            byUserId: uid,
            toUserIds: [String(updated.assignee)].filter(Boolean),
        });
        
        await revalidateMany([
            tags.task(taskId),
        ]);
        
        return asPlainTask(updated.toObject());
    }, { requireAuth: true });
}

/**
 * ACTION: Xoá collaborator khỏi task
 * Chỉ assignee hoặc manager mới xoá được
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID to remove
 * @returns {Promise<Object>} - Plain task object
 */
export async function removeCollaboratorFromTask(taskId, userId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        
        const task = await Task.findById(taskId);
        assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);
        
        // Check permission
        let canRemove = false;
        if (task.assignee === uid) {
            canRemove = true;
        } else if (task.project) {
            const project = await Project.findById(task.project);
            if (project && canManageProject(project, user)) {
                canRemove = true;
            }
        }
        
        assert(canRemove, 'Bạn không có quyền xoá collaborator', 'FORBIDDEN', 403);
        
        const updated = await removeCollaborator(taskId, userId);
        
        await logActivity({
            actor: uid,
            team: task.team,
            project: task.project,
            task: task._id,
            type: 'task.collaborator.removed',
            payload: { userId: String(userId) },
        });
        
        await revalidateMany([
            tags.task(task._id),
        ]);
        
        return asPlainTask(updated.toObject());
    }, { requireAuth: true });
}

/**
 * ACTION: List collaborators của task
 * @param {string} taskId - Task ID
 * @returns {Promise<Array>} - Array of collaborators
 */
export async function listTaskCollaborators(taskId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const task = await Task.findById(taskId).lean();
        assert(task, 'Task không tồn tại', 'NOT_FOUND', 404);
        
        const userId = String(uid);
        const watchers = Array.isArray(task.watchers) ? task.watchers.map(String) : [];
        const collaborators = Array.isArray(task.collaborators) ? task.collaborators : [];
        const isCreator = task.createdBy && String(task.createdBy) === userId;
        const isAssignee = task.assignee && String(task.assignee) === userId;
        const isWatcher = watchers.includes(userId);
        const isCollaborator = collaborators.some((c) => String(c.userId) === userId && !!c.acceptedAt);
        const isPublicPublished = task.scope === 'public' && task.public?.published;

        let canView = isCreator || isAssignee || isWatcher || isCollaborator || isPublicPublished;

        if (!canView && task.project) {
            const project = await Project.findById(task.project).select({ members: 1 }).lean();
            if (project) {
                canView = canViewProject(project, user);
            }
        }

        assert(canView, 'Bạn không có quyền xem danh sách cộng tác viên của task này', 'FORBIDDEN', 403);
        
        return (task.collaborators || []).map(c => ({
            userId: String(c.userId),
            invitedBy: String(c.invitedBy),
            invitedAt: c.invitedAt ? c.invitedAt.toISOString() : null,
            acceptedAt: c.acceptedAt ? c.acceptedAt.toISOString() : null,
            role: c.role,
        }));
    }, { requireAuth: true });
}
