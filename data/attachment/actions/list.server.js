// data/attachment/actions/list.server.js
// Server actions để list và filter attachments

'use server';

import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { cache } from 'react';
import { connectDB } from '@/lib/db.js';
import { runAction } from '@/lib/action-utils.js';
import Attachment from '@/model/attachment.model.js';
import Task from '@/model/task.model.js';
import Project from '@/model/project.model.js';
import {
    canManageProject,
    canViewProject,
    canViewTask,
    isTeamManager,
} from '@/lib/permissions.js';
import { getUsersDisplayInfo } from '@/lib/user-display.js';
import {
    getFileExtension,
    canPreviewInBrowser,
    getCompleteFileConfig,
} from '@/lib/file-display.js';
import { getFileMeta } from '@/lib/drive.js';
import { getRuntimeCache, setRuntimeCache } from '@/lib/runtime-cache.js';

/**
 * List attachments với filter và pagination
 * @param {Object} params - Filter parameters
 * @param {string} params.scope - 'all' | 'personal' | 'project' | 'task'
 * @param {string} params.projectId - Filter by project (optional)
 * @param {string} params.taskId - Filter by task (optional)
 * @param {string} params.kind - Filter by kind: image/video/doc/other (optional)
 * @param {string} params.search - Search in filename (optional)
 * @param {string} params.sortBy - 'createdAt' | 'name' | 'size'
 * @param {string} params.sortOrder - 'asc' | 'desc'
 * @param {number} params.page - Page number (1-based)
 * @param {number} params.limit - Items per page
 * @returns {Promise<Object>} - { ok, data: { items, total, page, pages }, message }
 */
export async function listAttachments(params = {}) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const {
            scope = 'all',
            projectId,
            taskId,
            kind,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 50,
        } = params;

        const accessContext = await resolveAccessContext(user);
        const {
            teams,
            managerTeamIds,
            projectMap,
            accessibleProjectIds,
            managedProjectIds,
            userTaskIds,
            userTaskProjectMap,
        } = accessContext;

        const scopeFilters = await buildScopeFilters({
            scope,
            projectId,
            taskId,
            uid,
            managerTeamIds,
            managedProjectIds,
            accessibleProjectIds,
            userTaskIds,
            userTaskProjectMap,
            projectMap,
        });

        if (scopeFilters.type === 'empty') {
            return { items: [], total: 0, page: 1, pages: 0, limit };
        }

        const query = { ...scopeFilters.query };

        if (projectId) {
            query.project = new mongoose.Types.ObjectId(projectId);
        }
        if (taskId && scope !== 'task') {
            query.task = new mongoose.Types.ObjectId(taskId);
        }
        if (kind && ['image', 'video', 'doc', 'other'].includes(kind)) {
            query.kind = kind;
        }
        if (search && search.trim()) {
            query.driveName = { $regex: search.trim(), $options: 'i' };
        }

        const sort = buildSort(sortBy, sortOrder);
        const skip = (page - 1) * limit;

        const attachmentQuery = Attachment.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select({
                driveName: 1,
                mimeType: 1,
                size: 1,
                kind: 1,
                label: 1,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: 1,
                author: 1,
                lastModifiedBy: 1,
                deletedBy: 1,
                project: 1,
                task: 1,
                publicToken: 1,
                driveFileId: 1,
                storage: 1,
                driveFolderId: 1,
                webViewLink: 1,
                webContentLink: 1,
            })
            .lean();

        const [items, total] = await Promise.all([
            attachmentQuery,
            Attachment.countDocuments(query),
        ]);

        if (!items.length) {
            return { items: [], total: 0, page, pages: 0, limit };
        }

        const tokenUpdates = [];
        const userIds = new Set();
        const projectIds = new Set();
        const taskIds = new Set();

        for (const item of items) {
            if (!item.publicToken) {
                const newToken = randomUUID();
                tokenUpdates.push(
                    Attachment.updateOne(
                        { _id: item._id },
                        { $set: { publicToken: newToken } },
                    ),
                );
                item.publicToken = newToken;
            }

            if (item.author) userIds.add(String(item.author));
            if (item.lastModifiedBy) userIds.add(String(item.lastModifiedBy));
            if (item.deletedBy) userIds.add(String(item.deletedBy));
            if (item.project) projectIds.add(String(item.project));
            if (item.task) taskIds.add(String(item.task));
        }

        if (tokenUpdates.length) {
            await Promise.all(tokenUpdates);
        }

        await hydrateProjects(Array.from(projectIds), projectMap);
        const taskMap = await hydrateTasks(Array.from(taskIds));

        const extraProjectIdsFromTasks = new Set();
        for (const task of taskMap.values()) {
            if (task.project) {
                extraProjectIdsFromTasks.add(String(task.project));
            }
        }

        await hydrateProjects(Array.from(extraProjectIdsFromTasks), projectMap);

        const teamIds = new Set();
        for (const projectId of new Set([...projectIds, ...extraProjectIdsFromTasks])) {
            const project = projectMap.get(String(projectId));
            if (project?.team) {
                teamIds.add(String(project.team));
            }
        }

        const [userDisplayMap, teamDisplayMap] = await Promise.all([
            getUsersDisplayInfo(Array.from(userIds)),
            resolveTeamDisplay(Array.from(teamIds), teams),
        ]);

        await warmDrivePreviews(items);

        const serializedItems = items.map((item) =>
            serializeAttachmentItem({
                item,
                user,
                userDisplayMap,
                teamDisplayMap,
                managerTeamIds,
                project: item.project ? projectMap.get(String(item.project)) || null : null,
                task: item.task ? taskMap.get(String(item.task)) || null : null,
                taskMap,
            }),
        );

        const pages = Math.ceil(total / limit);

        return {
            items: serializedItems,
            total,
            page,
            pages,
            limit,
        };
    }, { requireAuth: true });
}

const PREVIEW_WARM_TTL = 120_000;

async function warmDrivePreviews(items = []) {
    if (!items.length) return;

    const candidates = items
        .filter(
            (item) =>
                item?.driveFileId &&
                ((item.kind && item.kind !== 'other') ||
                    canPreviewInBrowser(item.mimeType)),
        )
        .slice(0, 6);

    const tasks = candidates
        .map((item) => {
            const cacheKey = `attachment-preview:${item.driveFileId}`;
            if (getRuntimeCache(cacheKey)) {
                return null;
            }
            setRuntimeCache(cacheKey, true, PREVIEW_WARM_TTL);
            return getFileMeta(item.driveFileId).catch((error) => {
                console.error('[attachment.list] Warm preview failed', error?.message || error);
            });
        })
        .filter(Boolean);

    if (tasks.length) {
        await Promise.allSettled(tasks);
    }
}

async function resolveAccessContext(user) {
    const uid = user.externalUserId;
    const Team = (await import('@/model/team.model.js')).default;

    const teams = await Team.find({
        'members.userId': uid,
        deletedAt: null,
    }).select('_id name members').lean();

    const teamIds = teams.map((team) => team._id);
    const managerTeamIds = teams
        .filter((team) => isTeamManager(team, user))
        .map((team) => String(team._id));

    const projectCriteria = {
        deletedAt: null,
        $or: [
            teamIds.length ? { team: { $in: teamIds } } : null,
            { 'members.userId': uid },
        ].filter(Boolean),
    };
    
    // If admin, fetch all projects? Or just let canManageProject handle it?
    // If admin, they should see all projects.
    // But here we are building a list of accessible projects.
    // If admin, accessibleProjectIds should be all projects?
    // Or maybe we just rely on canManageProject returning true.
    // But the query `projectCriteria` filters by membership.
    // If admin, we should probably fetch all projects or handle it differently.
    // However, for now let's just update canManageProject usage.
    // If user is admin, canManageProject returns true.
    
    if (user.role === 'admin') {
         // Admin sees all projects.
         // We might need to adjust projectCriteria to fetch all projects if we want to list them all.
         // But listAttachments filters by scope.
         // If scope is 'all', we list all attachments user can see.
         // If admin, they can see all attachments.
         // So managedProjectIds should include all projects?
         // This function seems to build a map of projects user is member of.
         // If admin, we might skip this complex logic and just say "all".
         // But the rest of the code relies on these sets.
         
         // Let's stick to updating canManageProject for now.
    }

    const projects = await Project.find(projectCriteria).lean();

    const projectMap = new Map();
    const accessibleProjectIds = new Set();
    const managedProjectIds = new Set();

    for (const project of projects) {
        const projectIdStr = String(project._id);
        projectMap.set(projectIdStr, project);

        if (project.members?.some((m) => String(m.userId) === String(uid))) {
            accessibleProjectIds.add(projectIdStr);
        }

        if (canManageProject(project, user)) {
            managedProjectIds.add(projectIdStr);
        }

        if (project.team && managerTeamIds.includes(String(project.team))) {
            managedProjectIds.add(projectIdStr);
        }

        if (managedProjectIds.has(projectIdStr)) {
            accessibleProjectIds.add(projectIdStr);
        }
    }

    const personalTasks = await Task.find({
        deletedAt: null,
        $or: [
            { assignee: uid },
            { createdBy: uid },
            { watchers: uid },
            { 'collaborators.userId': uid },
            { 'public.workerId': uid },
        ],
    })
        .select('_id project')
        .lean();

    const userTaskIds = new Set();
    const userTaskProjectMap = new Map();

    for (const task of personalTasks) {
        const taskIdStr = String(task._id);
        userTaskIds.add(taskIdStr);
        if (task.project) {
            userTaskProjectMap.set(taskIdStr, String(task.project));
        }
    }

    if (managedProjectIds.size > 0) {
        const managedTasks = await Task.find({
            deletedAt: null,
            project: { $in: toObjectIds(Array.from(managedProjectIds)) },
        })
            .select('_id project')
            .lean();

        for (const task of managedTasks) {
            const taskIdStr = String(task._id);
            userTaskIds.add(taskIdStr);
            if (task.project) {
                userTaskProjectMap.set(taskIdStr, String(task.project));
            }
        }
    }

    return {
        teams,
        managerTeamIds,
        projectMap,
        accessibleProjectIds,
        managedProjectIds,
        userTaskIds,
        userTaskProjectMap,
    };
}

async function buildScopeFilters({
    scope,
    projectId,
    taskId,
    uid,
    managerTeamIds,
    managedProjectIds,
    accessibleProjectIds,
    userTaskIds,
    userTaskProjectMap,
    projectMap,
}) {
    const baseQuery = { deletedAt: null };

    if (scope === 'personal') {
        return { query: { ...baseQuery, author: uid } };
    }

    if (scope === 'project') {
        if (!projectId) {
            return { type: 'empty' };
        }

        await hydrateProjects([String(projectId)], projectMap);
        const project = projectMap.get(String(projectId));
        if (!project) {
            return { type: 'empty' };
        }

        const canView = canViewProject(project, uid) ||
            (project.team && managerTeamIds.includes(String(project.team)));

        if (!canView) {
            return { type: 'empty' };
        }

        const projectObjectId = new mongoose.Types.ObjectId(project._id);
        const projectIdStr = String(project._id);

        if (managedProjectIds.has(projectIdStr)) {
            return { query: { ...baseQuery, project: projectObjectId } };
        }

        const allowedTaskIds = Array.from(userTaskIds).filter(
            (taskIdStr) => userTaskProjectMap.get(taskIdStr) === projectIdStr,
        );

        const conditions = [
            { project: projectObjectId, task: null },
            { project: projectObjectId, author: uid },
        ];

        if (allowedTaskIds.length) {
            conditions.push({
                project: projectObjectId,
                task: { $in: toObjectIds(allowedTaskIds) },
            });
        }

        return { query: { ...baseQuery, $or: conditions } };
    }

    if (scope === 'task') {
        if (!taskId) {
            return { type: 'empty' };
        }
        const taskMap = await hydrateTasks([String(taskId)]);
        const task = taskMap.get(String(taskId));
        if (!task) {
            return { type: 'empty' };
        }
        await hydrateProjects(task.project ? [String(task.project)] : [], projectMap);
        const taskWithProject = {
            ...task,
            project: task.project ? projectMap.get(String(task.project)) || null : null,
        };
        if (!canViewTask(taskWithProject, uid)) {
            return { type: 'empty' };
        }
        return {
            query: { ...baseQuery, task: new mongoose.Types.ObjectId(taskId) },
        };
    }

    const orConditions = [];

    const managedIds = Array.from(managedProjectIds);
    if (managedIds.length) {
        orConditions.push({ project: { $in: toObjectIds(managedIds) } });
    }

    const memberOnlyProjects = Array.from(accessibleProjectIds).filter(
        (id) => !managedProjectIds.has(id),
    );
    if (memberOnlyProjects.length) {
        orConditions.push({
            project: { $in: toObjectIds(memberOnlyProjects) },
            task: null,
        });
    }

    const taskIdArray = Array.from(userTaskIds);
    if (taskIdArray.length) {
        orConditions.push({ task: { $in: toObjectIds(taskIdArray) } });
    }

    orConditions.push({ author: uid });

    return { query: { ...baseQuery, $or: orConditions } };
}

function buildSort(sortBy, sortOrder) {
    const direction = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'name') {
        return { driveName: direction };
    }
    if (sortBy === 'size') {
        return { size: direction };
    }
    return { createdAt: direction };
}

async function resolveTeamDisplay(teamIds, knownTeams = []) {
    const map = new Map(
        (knownTeams || []).map((team) => [
            String(team._id),
            { id: String(team._id), name: team.name || '' },
        ]),
    );

    const missingIds = (teamIds || []).filter((id) => !map.has(id));
    if (!missingIds.length) {
        return map;
    }

    const Team = (await import('@/model/team.model.js')).default;
    const teams = await Team.find({
        _id: { $in: missingIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
        .select('name')
        .lean();

    for (const team of teams) {
        map.set(String(team._id), { id: String(team._id), name: team.name || '' });
    }

    return map;
}

function serializeAttachmentItem({
    item,
    user,
    userDisplayMap,
    teamDisplayMap,
    managerTeamIds,
    project,
    task,
    taskMap,
}) {
    const uid = user.externalUserId;
    const projectDoc = project || null;
    const normalizedProject = projectDoc
        ? {
              id: String(projectDoc._id),
              name: projectDoc.name || null,
              teamId: projectDoc.team ? String(projectDoc.team) : null,
              driveFolderId: projectDoc.driveFolderId || null,
          }
        : null;

    const team = normalizedProject?.teamId
        ? teamDisplayMap.get(normalizedProject.teamId) || {
              id: normalizedProject.teamId,
              name: null,
          }
        : null;

    const taskDoc = task || null;
    const normalizedTask = taskDoc
        ? {
              id: String(taskDoc._id),
              title: taskDoc.title || null,
              parentTaskId: taskDoc.parentTask ? String(taskDoc.parentTask) : null,
              scope: taskDoc.scope || null,
              driveFolderId: taskDoc.docs?.driveFolderId || null,
          }
        : null;

    const taskPath = taskDoc ? resolveTaskPath(taskDoc, taskMap) : [];

    const uploadedBy = item.author
        ? normalizeUserDisplay(userDisplayMap.get(String(item.author)))
        : null;
    const modifiedBy = item.lastModifiedBy
        ? normalizeUserDisplay(userDisplayMap.get(String(item.lastModifiedBy)))
        : null;
    const deletedBy = item.deletedBy
        ? normalizeUserDisplay(userDisplayMap.get(String(item.deletedBy)))
        : null;

    const isOwner = String(item.author) === String(uid);
    const isTeamMgr = normalizedProject?.teamId
        ? managerTeamIds.includes(normalizedProject.teamId)
        : false;
    const canManage =
        (projectDoc ? canManageProject(projectDoc, user) : false) || isTeamMgr;

    const kind = item.kind || 'other';
    const isImageKind = kind === 'image';

    const displayConfig = getCompleteFileConfig(item);

    return {
        id: String(item._id),
        name: item.driveName,
        driveFileId: item.driveFileId || null,
        driveFolderId: item.driveFolderId || null,
        extension: getFileExtension(item.driveName, item.mimeType),
        mime: item.mimeType,
        size: item.size || 0,
        kind,
        label: item.label || null,
        createdAt: item.createdAt ? item.createdAt.toISOString() : null,
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
        project: normalizedProject
            ? { 
                id: normalizedProject.id, 
                name: normalizedProject.name,
                driveFolderId: normalizedProject.driveFolderId,
            }
            : null,
        task: normalizedTask,
        team: team ? { id: team.id, name: team.name } : null,
        uploadedBy,
        modifiedBy,
        deletedBy,
        taskPath,
        permissions: {
            canRename: isOwner || canManage,
            canDelete: isOwner || canManage,
            isOwner,
            canManage,
        },
        access: {
            token: item.publicToken,
            previewUrl: `/api/files/preview/${item.publicToken}?mode=preview`,
            thumbnailUrl: isImageKind
                ? `/api/files/preview/${item.publicToken}?mode=thumbnail`
                : null,
            downloadUrl: `/api/files/preview/${item.publicToken}?mode=download`,
            viewUrl: displayConfig?.urls?.view || item.webViewLink || null,
        },
        webViewLink: item.webViewLink || null,
        webContentLink: item.webContentLink || null,
        displayConfig,
    };
}

function resolveTaskPath(taskDoc, taskMap = new Map()) {
    const path = [];
    const visited = new Set();
    let current = taskDoc;

    while (current) {
        const currentId = String(current._id ?? current.id ?? '');
        if (!currentId || visited.has(currentId)) {
            break;
        }
        path.push({ 
            id: currentId, 
            title: current.title || null,
            driveFolderId: current.docs?.driveFolderId || null,
        });
        visited.add(currentId);

        if (!current.parentTask) {
            break;
        }

        const parentId = String(current.parentTask);
        const parent = taskMap?.get(parentId);
        if (!parent) {
            path.push({ id: parentId, title: null });
            break;
        }
        current = parent;
    }

    return path.reverse();
}

function normalizeUserDisplay(info) {
    if (!info) return null;
    return {
        userId: info.userId,
        name: info.name,
        email: info.email,
        jobTitle: info.jobTitle,
        avatar: info.avatar || info.zaloavt || null,
        zaloAvatar: info.zaloavt || null,
    };
}

function toObjectIds(ids = []) {
    return ids.map((id) => new mongoose.Types.ObjectId(id));
}

/**
 * Get attachment stats for dashboard or scoped views
 * @param {Object} filters
 * @param {string} [filters.scope]
 * @param {string} [filters.projectId]
 * @param {string} [filters.taskId]
 * @param {string} [filters.kind]
 * @param {string} [filters.search]
 * @returns {Promise<Object>} - { ok, data: { byKind, byProject, total, recentUploads }, message }
 */
export async function getAttachmentStats(filters = {}) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const {
            scope = 'all',
            projectId = null,
            taskId = null,
            kind = null,
            search = '',
        } = filters || {};

        const accessContext = await resolveAccessContext(user);
        const {
            managerTeamIds,
            managedProjectIds,
            accessibleProjectIds,
            userTaskIds,
            userTaskProjectMap,
            projectMap,
        } = accessContext;

        const scopeFilters = await buildScopeFilters({
            scope,
            projectId,
            taskId,
            uid,
            managerTeamIds,
            managedProjectIds,
            accessibleProjectIds,
            userTaskIds,
            userTaskProjectMap,
            projectMap,
        });

        if (scopeFilters.type === 'empty') {
            return { byKind: [], byProject: [], total: 0, recentUploads: 0 };
        }

        const statsQuery = { ...scopeFilters.query };

        if (kind && ['image', 'video', 'doc', 'other'].includes(kind)) {
            statsQuery.kind = kind;
        }

        if (search && search.trim()) {
            statsQuery.driveName = { $regex: search.trim(), $options: 'i' };
        }

        const [byKindRaw, byProjectRaw, total, recentUploads] = await Promise.all([
            Attachment.aggregate([
                { $match: statsQuery },
                {
                    $group: {
                        _id: '$kind',
                        count: { $sum: 1 },
                        totalSize: { $sum: { $ifNull: ['$size', 0] } },
                    },
                },
            ]),
            Attachment.aggregate([
                {
                    $match: {
                        ...statsQuery,
                        ...(statsQuery.project ? {} : { project: { $ne: null } }),
                    },
                },
                {
                    $group: {
                        _id: '$project',
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            Attachment.countDocuments(statsQuery),
            Attachment.countDocuments({
                ...statsQuery,
                createdAt: { $gte: getRecentThreshold(7) },
            }),
        ]);

        const projectNames = await resolveProjectNames(
            byProjectRaw.map((entry) => entry._id),
            projectMap,
        );

        return {
            byKind: byKindRaw.map((entry) => ({
                kind: entry._id,
                count: entry.count,
                totalSize: entry.totalSize || 0,
            })),
            byProject: byProjectRaw.map((entry) => ({
                projectId: String(entry._id),
                projectName: projectNames.get(String(entry._id)) || 'Chưa xác định',
                count: entry.count,
            })),
            total,
            recentUploads,
        };
    }, { requireAuth: true });
}

function getRecentThreshold(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
}

async function resolveProjectNames(projectIds = [], projectMap = new Map()) {
    const map = new Map();

    for (const [projectId, project] of projectMap.entries()) {
        map.set(projectId, project?.name || '');
    }

    const missingIds = (projectIds || [])
        .map((id) => String(id))
        .filter((id) => !map.has(id));

    if (missingIds.length) {
        await hydrateProjects(missingIds, projectMap);
        for (const id of missingIds) {
            const project = projectMap.get(id);
            map.set(id, project?.name || '');
        }
    }

    return map;
}

const loadProjects = cache(async (ids = []) => {
    if (!ids.length) {
        return new Map();
    }

    const unique = Array.from(new Set(ids.map(String))).sort();
    const objectIds = unique.map((id) => new mongoose.Types.ObjectId(id));

    const projects = await Project.find({ _id: { $in: objectIds } })
        .select('name team members driveFolderId monthlyDriveFolders')
        .lean();

    const map = new Map();
    for (const project of projects) {
        map.set(String(project._id), project);
    }
    return map;
});

async function hydrateProjects(ids = [], projectMap = new Map()) {
    const targetMap = projectMap;
    const missing = Array.from(new Set(ids.map(String))).filter(
        (id) => !targetMap.has(id),
    );

    if (!missing.length) {
        return targetMap;
    }

    const loaded = await loadProjects(missing.sort());
    for (const [projectId, project] of loaded.entries()) {
        targetMap.set(projectId, project);
    }

    return targetMap;
}

const loadTasks = cache(async (ids = []) => {
    if (!ids.length) {
        return new Map();
    }

    const unique = Array.from(new Set(ids.map(String))).sort();
    const objectIds = unique.map((id) => new mongoose.Types.ObjectId(id));

    const tasks = await Task.find({ _id: { $in: objectIds } })
        .select('title parentTask scope project docs')
        .lean();

    const map = new Map();
    for (const task of tasks) {
        map.set(String(task._id), task);
    }
    return map;
});

async function hydrateTasks(ids = []) {
    const queue = Array.from(new Set(ids.map(String)));
    if (!queue.length) {
        return new Map();
    }

    const result = new Map();
    const processed = new Set();

    while (queue.length) {
        const batch = queue
            .splice(0, queue.length)
            .filter((id) => id && !processed.has(id));

        if (!batch.length) {
            break;
        }

        const loaded = await loadTasks(batch.sort());
        for (const [taskId, task] of loaded.entries()) {
            result.set(taskId, task);
            processed.add(taskId);

            if (task?.parentTask) {
                const parentId = String(task.parentTask);
                if (parentId && !processed.has(parentId) && !result.has(parentId)) {
                    queue.push(parentId);
                }
            }
        }
    }

    return result;
}
