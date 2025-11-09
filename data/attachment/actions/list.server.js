// data/attachment/actions/list.server.js
// Server actions để list và filter attachments

'use server';

import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
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
import { getFileExtension, canPreviewInBrowser } from '@/lib/file-display.js';
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

        const accessContext = await resolveAccessContext(uid);
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
            .populate({
                path: 'project',
                select: 'name team members',
            })
            .populate({
                path: 'task',
                select: 'title parentTask scope project',
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
        const teamIds = new Set();

        for (const item of items) {
            if (!item.publicToken) {
                const newToken = randomUUID();
                tokenUpdates.push(
                    Attachment.updateOne(
                        { _id: item._id },
                        { $set: { publicToken: newToken } }
                    )
                );
                item.publicToken = newToken;
            }

            if (item.author) userIds.add(String(item.author));
            if (item.lastModifiedBy) userIds.add(String(item.lastModifiedBy));
            if (item.deletedBy) userIds.add(String(item.deletedBy));
            if (item.project?.team) teamIds.add(String(item.project.team));
        }

        if (tokenUpdates.length) {
            await Promise.all(tokenUpdates);
        }

        const [userDisplayMap, teamDisplayMap] = await Promise.all([
            getUsersDisplayInfo(Array.from(userIds)),
            resolveTeamDisplay(Array.from(teamIds), teams),
        ]);

        await warmDrivePreviews(items);

        const serializedItems = items.map((item) =>
            serializeAttachmentItem({
                item,
                uid,
                userDisplayMap,
                teamDisplayMap,
                managerTeamIds,
            })
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
            .filter((item) =>
                item?.driveFileId &&
                (item.kind && item.kind !== 'other' || canPreviewInBrowser(item.mimeType)))
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

async function resolveAccessContext(uid) {
    const Team = (await import('@/model/team.model.js')).default;

    const teams = await Team.find({
        'members.userId': uid,
        deletedAt: null,
    }).select('_id name members').lean();

    const teamIds = teams.map((team) => team._id);
    const managerTeamIds = teams
        .filter((team) => isTeamManager(team, uid))
        .map((team) => String(team._id));

    const projectCriteria = {
        deletedAt: null,
        $or: [
            teamIds.length ? { team: { $in: teamIds } } : null,
            { 'members.userId': uid },
        ].filter(Boolean),
    };

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

        if (canManageProject(project, uid)) {
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

        let project = projectMap.get(String(projectId));
        if (!project) {
            project = await Project.findById(projectId).lean();
        }
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
        const task = await Task.findById(taskId).populate('project').lean();
        if (!task) {
            return { type: 'empty' };
        }
        if (!canViewTask(task, uid)) {
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

function serializeAttachmentItem({ item, uid, userDisplayMap, teamDisplayMap, managerTeamIds }) {
    const project = item.project
        ? {
            id: String(item.project._id),
            name: item.project.name || null,
            teamId: item.project.team ? String(item.project.team) : null,
        }
        : null;

    const team = project?.teamId
        ? teamDisplayMap.get(project.teamId) || { id: project.teamId, name: null }
        : null;

    const task = item.task
        ? {
            id: String(item.task._id),
            title: item.task.title || null,
            parentTaskId: item.task.parentTask ? String(item.task.parentTask) : null,
            scope: item.task.scope || null,
        }
        : null;

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
    const isTeamMgr = project?.teamId ? managerTeamIds.includes(project.teamId) : false;
    const canManage =
        (item.project ? canManageProject(item.project, uid) : false) || isTeamMgr;

    const kind = item.kind || 'other';
    const isImageKind = kind === 'image';

    return {
        id: String(item._id),
        name: item.driveName,
        extension: getFileExtension(item.driveName, item.mimeType),
        mime: item.mimeType,
        size: item.size || 0,
        kind,
        label: item.label || null,
        createdAt: item.createdAt ? item.createdAt.toISOString() : null,
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
        project: project ? { id: project.id, name: project.name } : null,
        task,
        team: team ? { id: team.id, name: team.name } : null,
        uploadedBy,
        modifiedBy,
        deletedBy,
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
        },
    };
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

        const accessContext = await resolveAccessContext(uid);
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

    if (!missingIds.length) {
        return map;
    }

    const docs = await Project.find({
        _id: { $in: missingIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
        .select('name')
        .lean();

    for (const doc of docs) {
        map.set(String(doc._id), doc.name || '');
    }

    return map;
}
