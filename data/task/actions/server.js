// data/task/actions/server.js
// Mục đích: Server Actions cho Task trong Project (basic CRUD)

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { canManageProject } from '@/lib/permissions.js';
import { logActivity } from '@/lib/activity.js';
import * as tags from '@/data/_shared/tags.js';

import Task from '@/model/task.model.js';
import Project from '@/model/project.model.js';
import Team from '@/model/team.model.js';
import { TASK_STATUS, TASK_SCOPE } from '@/model/common/enums.js';
import { asPlainTask } from '@/lib/serialize.js';

/**
 * List tasks by project
 */
export async function listByProject(projectId, filters = {}) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        // Verify project access
        const project = await Project.findById(projectId).lean();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        const team = await Team.findById(project.team).lean();
        const isMember = (team?.members || []).some((m) => String(m.userId) === String(uid));
        assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

        // Build query
        const query = {
            project: projectId,
            scope: TASK_SCOPE.PROJECT,
            deletedAt: null,
            parentTask: null, // Only get root tasks, not subtasks
        };

        if (filters.status) {
            query.status = Array.isArray(filters.status) 
                ? { $in: filters.status }
                : filters.status;
        }

        if (filters.assignee) {
            query.assignee = filters.assignee;
        }

        if (filters.priority) {
            query.priority = filters.priority;
        }

        if (filters.tags && filters.tags.length > 0) {
            query.tags = { $in: filters.tags };
        }

        // Execute query with aggregation to get subtask count
        const tasks = await Task.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'tasks',
                    let: { taskId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$parentTask', '$$taskId'] },
                                        { $eq: ['$deletedAt', null] }
                                    ]
                                }
                            }
                        },
                        { $count: 'count' }
                    ],
                    as: 'subtaskCountArray'
                }
            },
            {
                $addFields: {
                    subtaskCount: {
                        $ifNull: [
                            { $arrayElemAt: ['$subtaskCountArray.count', 0] },
                            0
                        ]
                    }
                }
            },
            { $project: { subtaskCountArray: 0 } },
            { $sort: { listOrder: 1, createdAt: -1 } },
            { $limit: filters.limit || 100 }
        ]);

        return tasks.map(asPlainTask);
    }, { requireAuth: true });
}

/**
 * List my tasks (created by me or assigned to me)
 */
export async function listMyTasks(filters = {}) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        // Build query - tasks created by user OR assigned to user
        const query = {
            scope: TASK_SCOPE.PROJECT,
            deletedAt: null,
            parentTask: null, // Only root tasks
            $or: [
                { createdBy: uid },
                { assignee: uid },
            ],
        };

        if (filters.status) {
            query.status = Array.isArray(filters.status) 
                ? { $in: filters.status }
                : filters.status;
        }

        if (filters.priority) {
            query.priority = filters.priority;
        }

        if (filters.projectId) {
            query.project = filters.projectId;
        }

        // Execute query with project info and subtask count
        const tasks = await Task.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'projects',
                    localField: 'project',
                    foreignField: '_id',
                    as: 'projectInfo'
                }
            },
            {
                $lookup: {
                    from: 'tasks',
                    let: { taskId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$parentTask', '$$taskId'] },
                                        { $eq: ['$deletedAt', null] }
                                    ]
                                }
                            }
                        },
                        { $count: 'count' }
                    ],
                    as: 'subtaskCountArray'
                }
            },
            {
                $addFields: {
                    projectName: { $arrayElemAt: ['$projectInfo.name', 0] },
                    subtaskCount: {
                        $ifNull: [
                            { $arrayElemAt: ['$subtaskCountArray.count', 0] },
                            0
                        ]
                    }
                }
            },
            { $project: { projectInfo: 0, subtaskCountArray: 0 } },
            { $sort: { createdAt: -1 } },
            { $limit: filters.limit || 200 }
        ]);

        return tasks.map(asPlainTask);
    }, { requireAuth: true });
}

/**
 * Get task detail
 */
export async function getTaskDetail(taskId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const task = await Task.findById(taskId).lean();
        assert(task, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        // Verify access
        if (task.scope === TASK_SCOPE.PROJECT) {
            const project = await Project.findById(task.project).lean();
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const team = await Team.findById(project.team).lean();
            const isMember = (team?.members || []).some((m) => String(m.userId) === String(uid));
            assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);
        }

        return asPlainTask(task);
    }, { requireAuth: true });
}

/**
 * Create task in project
 * 
 * WORKFLOW:
 * 1. Manager creates task:
 *    - Can assign to self or team members
 *    - Can set initialPoints
 *    - If assigned to others → assigneeConfirm.required = true, status = 'waiting_confirm'
 *    - If self or no assignee → status = 'draft'
 * 
 * 2. Member creates task:
 *    - Must be approved by manager
 *    - approval.required = true, approval.status = 'pending', status = 'pending_approval'
 *    - Cannot set points (initialPoints always 0)
 */
export async function createTask(projectId, payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        // Verify project and team membership
        const project = await Project.findById(projectId);
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        const team = await Team.findById(project.team);
        assert(team, 'TEAM_NOT_FOUND', 'NOT_FOUND', 404);

        const isMember = (team.members || []).some((m) => String(m.userId) === String(uid));
        assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

        const hasManagePermission = canManageProject(project, uid);

        // Determine status and workflow based on permissions
        let status = TASK_STATUS.DRAFT;
        let approval = { required: false, status: 'none' };
        let assigneeConfirm = { required: false };
        let initialPoints = 0;

        if (!hasManagePermission) {
            // Member creates task → needs approval
            status = TASK_STATUS.PENDING_APPROVAL;
            approval = {
                required: true,
                status: 'pending',
            };
            initialPoints = 0; // Members can't set points
        } else {
            // Manager creates task
            if (payload.assignee && payload.assignee !== uid) {
                // Assigned to someone else → needs confirmation
                status = TASK_STATUS.WAITING_ASSIGNEE_CONFIRM;
                assigneeConfirm = {
                    required: true,
                };
            }
            // Manager can set points
            initialPoints = Number(payload.initialPoints) || 0;
        }

        // Override with payload if provided (for flexibility)
        if (payload.status) status = payload.status;
        if (payload.approval) approval = payload.approval;
        if (payload.assigneeConfirm) assigneeConfirm = payload.assigneeConfirm;

        // Create task
        const task = await Task.create({
            title: payload.title,
            description: payload.description || '',
            priority: payload.priority || 'normal',
            assignee: payload.assignee || null,
            plannedStartAt: payload.plannedStartAt || null,
            plannedDueAt: payload.plannedDueAt || null,
            tags: payload.tags || [],
            initialPoints,
            autoBypassForSubtask: payload.autoBypassForSubtask || false,
            project: projectId,
            team: project.team,
            scope: TASK_SCOPE.PROJECT,
            createdBy: uid,
            status,
            approval,
            assigneeConfirm,
        });

        await logActivity({
            actor: uid,
            team: project.team,
            project: projectId,
            task: task._id,
            type: 'task.created',
            payload: { title: task.title },
        });

        // Revalidate project tasks page and related paths
        const { revalidatePath } = await import('next/cache');
        revalidatePath(`/projects/${projectId}/tasks`);
        revalidatePath(`/projects/${projectId}`);
        revalidatePath(`/tasks`); // Personal tasks page

        await revalidateMany([
            tags.project(projectId),
            tags.task(task._id),
        ]);

        return asPlainTask(task.toObject());
    }, { requireAuth: true });
}

/**
 * Update task
 */
export async function updateTask(taskId, payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const task = await Task.findById(taskId);
        assert(task, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        // Verify permission
        if (task.scope === TASK_SCOPE.PROJECT) {
            const project = await Project.findById(task.project);
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const hasManagePermission = canManageProject(project, uid);
            assert(hasManagePermission, 'FORBIDDEN', 'FORBIDDEN', 403);
        }

        // Update fields
        Object.keys(payload).forEach(key => {
            if (payload[key] !== undefined) {
                task[key] = payload[key];
            }
        });

        await task.save();

        await logActivity({
            actor: uid,
            team: task.team,
            project: task.project,
            task: task._id,
            type: 'task.updated',
            payload: { fields: Object.keys(payload) },
        });

        await revalidateMany([
            tags.project(task.project),
            tags.task(task._id),
        ]);

        return asPlainTask(task.toObject());
    }, { requireAuth: true });
}

/**
 * Delete task (soft delete)
 */
export async function deleteTask(taskId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const task = await Task.findById(taskId);
        assert(task, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        // Verify permission
        if (task.scope === TASK_SCOPE.PROJECT) {
            const project = await Project.findById(task.project);
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const hasManagePermission = canManageProject(project, uid);
            assert(hasManagePermission, 'FORBIDDEN', 'FORBIDDEN', 403);
        }

        task.deletedAt = new Date();
        await task.save();

        await logActivity({
            actor: uid,
            team: task.team,
            project: task.project,
            task: task._id,
            type: 'task.deleted',
        });

        await revalidateMany([
            tags.project(task.project),
            tags.task(task._id),
        ]);

        return asPlainTask(task.toObject());
    }, { requireAuth: true });
}

/**
 * Update task status
 */
export async function updateTaskStatus(taskId, status) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const task = await Task.findById(taskId);
        assert(task, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        // Anyone in project can update status
        if (task.scope === TASK_SCOPE.PROJECT) {
            const project = await Project.findById(task.project).lean();
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const team = await Team.findById(project.team).lean();
            const isMember = (team?.members || []).some((m) => String(m.userId) === String(uid));
            assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);
        }

        const oldStatus = task.status;
        task.status = status;

        // Update timestamps based on status
        if (status === TASK_STATUS.IN_PROGRESS && !task.startedAt) {
            task.startedAt = new Date();
        }
        if (status === TASK_STATUS.COMPLETED && !task.completedAt) {
            task.completedAt = new Date();
        }

        await task.save();

        await logActivity({
            actor: uid,
            team: task.team,
            project: task.project,
            task: task._id,
            type: 'task.status.changed',
            payload: { from: oldStatus, to: status },
        });

        await revalidateMany([
            tags.project(task.project),
            tags.task(task._id),
        ]);

        return asPlainTask(task.toObject());
    }, { requireAuth: true });
}

/**
 * Assign task to user
 */
export async function assignTask(taskId, assigneeId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const task = await Task.findById(taskId);
        assert(task, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        // Verify permission
        if (task.scope === TASK_SCOPE.PROJECT) {
            const project = await Project.findById(task.project);
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const hasManagePermission = canManageProject(project, uid);
            assert(hasManagePermission, 'FORBIDDEN', 'FORBIDDEN', 403);
        }

        const oldAssignee = task.assignee;
        task.assignee = assigneeId;
        await task.save();

        await logActivity({
            actor: uid,
            team: task.team,
            project: task.project,
            task: task._id,
            type: 'task.assigned',
            payload: { from: oldAssignee, to: assigneeId },
        });

        await revalidateMany([
            tags.project(task.project),
            tags.task(task._id),
            assigneeId && tags.userInbox(assigneeId),
        ].filter(Boolean));

        return asPlainTask(task.toObject());
    }, { requireAuth: true });
}

/**
 * Bulk update kanban order for tasks
 */
export async function updateKanbanOrder(taskIds) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        // Verify all tasks belong to same project and user has access
        const tasks = await Task.find({ _id: { $in: taskIds } }).lean();
        assert(tasks.length === taskIds.length, 'INVALID_TASKS', 'BAD_REQUEST', 400);

        const projectId = tasks[0]?.project;
        assert(projectId, 'INVALID_PROJECT', 'BAD_REQUEST', 400);

        // Verify all tasks are in same project
        const allSameProject = tasks.every(t => String(t.project) === String(projectId));
        assert(allSameProject, 'TASKS_FROM_DIFFERENT_PROJECTS', 'BAD_REQUEST', 400);

        // Verify permission
        const project = await Project.findById(projectId).lean();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        const team = await Team.findById(project.team).lean();
        const isMember = (team?.members || []).some((m) => String(m.userId) === String(uid));
        assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

        // Update kanbanOrder for each task
        const updatePromises = taskIds.map((taskId, index) => 
            Task.findByIdAndUpdate(taskId, { kanbanOrder: index })
        );

        await Promise.all(updatePromises);

        await revalidateMany([
            tags.project(projectId),
        ]);

        return { ok: true, message: 'Kanban order updated' };
    }, { requireAuth: true });
}

/**
 * List subtasks of a parent task
 */
export async function listSubtasks(parentTaskId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        // Verify parent task exists and user has access
        const parentTask = await Task.findById(parentTaskId).lean();
        assert(parentTask, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        // Check if user is in the project
        const project = await Project.findById(parentTask.project).lean();
        assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        const team = await Team.findById(project.team).lean();
        assert(team, 'TEAM_NOT_FOUND', 'NOT_FOUND', 404);

        const isMember = team.members.some(m => m.userId === uid);
        assert(isMember, 'NO_ACCESS', 'FORBIDDEN', 403);

        // Get subtasks
        const subtasks = await Task.find({
            parentTask: parentTaskId,
            deletedAt: null,
        })
        .sort({ listOrder: 1, createdAt: 1 })
        .lean();

        return {
            ok: true,
            data: subtasks.map(asPlainTask),
        };
    }, { requireAuth: true });
}
