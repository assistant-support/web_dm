// data/task/actions/server.js
// Mục đích: Server Actions cho Task trong Project (basic CRUD)

'use server';

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { canManageProject, canCreateTask } from '@/lib/permissions.js';
import { logActivity } from '@/lib/activity.js';
import * as tags from '@/data/_shared/tags.js';
import Task from '@/model/task.model.js';
import Project from '@/model/project.model.js';
import Team from '@/model/team.model.js';
import { TASK_STATUS, TASK_SCOPE } from '@/model/common/enums.js';
import { asPlainTask } from '@/lib/serialize.js';
import { revalidatePath } from 'next/cache';
import { sendZalo } from '@/lib/noti';
import { notifyTaskAssignment } from '@/lib/noti-helpers.js';
import { buildTaskUrl } from '@/lib/url.js';
import { resolveMonthlyDriveFolderId } from '@/lib/drive-utils.js';
/**
 * List tasks by project
 */
export async function listByProject(projectId, filters = {}) {
    await connectDB();
    try {
        return runAction(async ({ user }) => {
            const uid = user.externalUserId;
            const project = await Project.findById(projectId)
                .select({ members: 1, team: 1 })
                .lean();
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const isProjectMember = (project.members || []).some(
                (m) => String(m.userId) === String(uid)
            );

            let isMember = isProjectMember;
            if (!isMember && project.team) {
                const teamMembershipExists = await Team.exists({
                    _id: project.team,
                    'members.userId': uid,
                });
                isMember = Boolean(teamMembershipExists);
            }

            const isAdmin = user.role === 'admin';
            assert(isMember || isAdmin, 'FORBIDDEN', 'FORBIDDEN', 403);
            const query = {
                project: new mongoose.Types.ObjectId(projectId),
                scope: TASK_SCOPE.PROJECT,
                deletedAt: null,
                parentTask: null,
            };

            if (filters.status) {
                query.status = Array.isArray(filters.status)
                    ? { $in: filters.status }
                    : filters.status;
            }
            const matchStage = { $match: query };
            const tasks = await Task.aggregate([
                matchStage,
                {
                    $lookup: {
                        from: 'projects',
                        localField: 'project',
                        foreignField: '_id',
                        as: 'projectData'
                    }
                },
                {
                    $lookup: {
                        from: 'worktypes',
                        let: { workTypeCode: '$workType' },
                        pipeline: [
                            { 
                                $match: { 
                                    $expr: { $eq: ['$code', '$$workTypeCode'] } 
                                } 
                            },
                            {
                                $project: {
                                    name: 1,
                                    code: 1,
                                    _id: 0
                                }
                            }
                        ],
                        as: 'workTypeData'
                    }
                },
                {
                    $lookup: {
                        from: 'platforms',
                        localField: 'platforms',
                        foreignField: '_id',
                        pipeline: [
                            {
                                $project: {
                                    _id: 1,
                                    name: 1,
                                    code: 1,
                                    icon: 1,
                                    color: 1
                                }
                            }
                        ],
                        as: 'platformsData'
                    }
                },
                {
                    $addFields: {
                        projectName: { $arrayElemAt: ['$projectData.name', 0] },
                        workTypeInfo: { $arrayElemAt: ['$workTypeData', 0] },
                        platformsInfo: '$platformsData'
                    }
                },
                {
                    $lookup: {
                        from: 'tasks',
                        let: { taskId: '$_id' },
                        pipeline: [
                            { $match: { $expr: { $and: [{ $eq: ['$parentTask', '$$taskId'] }, { $eq: ['$deletedAt', null] }] } } },
                            { $count: 'count' }
                        ],
                        as: 'subtaskCountArray'
                    }
                },
                { $addFields: { subtaskCount: { $ifNull: [{ $arrayElemAt: ['$subtaskCountArray.count', 0] }, 0] } } },
                { $project: { subtaskCountArray: 0, projectData: 0, workTypeData: 0, platformsData: 0 } },
                { $sort: { listOrder: 1, createdAt: -1 } },
                { $limit: filters.limit || 100 }
            ]);
            return tasks.map(asPlainTask);

        }, { requireAuth: true });

    } catch (err) {
        return []; // Trả về mảng rỗng nếu assert lỗi
    }
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

        // Execute query with project info (with members), subtask count AND full subtasks data
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
                        { $sort: { createdAt: 1 } } // Sort subtasks by creation date
                    ],
                    as: 'subtasks'
                }
            },
            {
                $addFields: {
                    projectName: { $arrayElemAt: ['$projectInfo.name', 0] },
                    projectMembers: { $arrayElemAt: ['$projectInfo.members', 0] },
                    subtaskCount: { $size: '$subtasks' }
                }
            },
            { $project: { projectInfo: 0 } },
            { $sort: { createdAt: -1 } },
            { $limit: filters.limit || 200 }
        ]);

        return tasks.map(task => {
            const plainTask = asPlainTask(task);
            // Include pre-loaded subtasks
            plainTask.subtasks = (task.subtasks || []).map(asPlainTask);
            // Include project members for permission checks
            plainTask.projectMembers = task.projectMembers || [];
            return plainTask;
        });
    }, { requireAuth: true });
}

/**
 * Get task detail
 */
export async function getTaskDetail(taskId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        // --- Bắt đầu Aggregation Pipeline ---
        const tasks = await Task.aggregate([
            // 1. Tìm Task chính
            { $match: { _id: new mongoose.Types.ObjectId(taskId) } },

            // 2. Populate 'project' (lấy object Project)
            {
                $lookup: {
                    from: 'projects', // Tên collection của Project
                    localField: 'project',
                    foreignField: '_id',
                    as: 'project'
                }
            },

            // 3. Populate 'team' (lấy object Team)
            {
                $lookup: {
                    from: 'teams', // Tên collection của Team
                    localField: 'team',
                    foreignField: '_id',
                    as: 'team'
                }
            },

            // 4. Populate 'platforms' (lấy mảng Platforms)
            {
                $lookup: {
                    from: 'platforms', // Tên collection của Platform
                    localField: 'platforms',
                    foreignField: '_id',
                    as: 'platforms'
                }
            },

            // 5. Populate thông tin 'createdBy' (User)
            // Giả định: collection User là 'appusers'
            // Giả định: trường ID trong 'appusers' là 'externalUserId'
            {
                $lookup: {
                    from: 'appusers',
                    localField: 'createdBy',
                    foreignField: 'externalUserId',
                    pipeline: [
                        // Chỉ lấy các trường cần thiết
                        { $project: { _id: 0, name: 1, email: 1, avatar: 1, externalUserId: 1 } }
                    ],
                    as: 'createdBy'
                }
            },

            // 6. Populate thông tin 'assignee' (User)
            {
                $lookup: {
                    from: 'appusers',
                    localField: 'assignee',
                    foreignField: 'externalUserId',
                    pipeline: [
                        { $project: { _id: 0, name: 1, email: 1, avatar: 1, externalUserId: 1 } }
                    ],
                    as: 'assignee'
                }
            },

            // 7. Populate 'parentTask' (lấy tên)
            {
                $lookup: {
                    from: 'tasks',
                    localField: 'parentTask',
                    foreignField: '_id',
                    pipeline: [
                        { $project: { _id: 1, title: 1 } } // Chỉ lấy title
                    ],
                    as: 'parentTask'
                }
            },

            // 8. Đếm Subtasks (Giữ nguyên từ code cũ của bạn)
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

            // 9. Xử lý dữ liệu (Unwind các mảng lookup)
            {
                $addFields: {
                    // Chuyển mảng [object] thành object (hoặc null nếu không tìm thấy)
                    project: { $arrayElemAt: ['$project', 0] },
                    team: { $arrayElemAt: ['$team', 0] },
                    createdBy: { $arrayElemAt: ['$createdBy', 0] },
                    assignee: { $arrayElemAt: ['$assignee', 0] },
                    parentTask: { $arrayElemAt: ['$parentTask', 0] },

                    // Lấy subtask count (Giữ nguyên)
                    subtaskCount: {
                        $ifNull: [
                            { $arrayElemAt: ['$subtaskCountArray.count', 0] },
                            0
                        ]
                    }
                }
            },

            // 10. Dọn dẹp
            { $project: { subtaskCountArray: 0 } }
        ]);
        // --- Kết thúc Aggregation Pipeline ---

        const task = tasks[0];
        assert(task, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        // --- Cập nhật Kiểm tra quyền truy cập ---
        // Giờ đây 'task.project' và 'task.team' đã là object
        if (task.scope === TASK_SCOPE.PROJECT) {
            assert(task.project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            // Do we have a team? team may be null (project can be 'free').
            // Permission to view: admin OR creator OR assignee OR project member OR team member.
            const isAdmin = user.role === 'admin';
            const isCreator = String(task.createdBy) === String(uid);

            // `task.assignee` may be an object (populated) or a string externalUserId
            let isAssignee = false;
            if (task.assignee) {
                if (typeof task.assignee === 'object' && task.assignee.externalUserId) {
                    isAssignee = String(task.assignee.externalUserId) === String(uid);
                } else {
                    isAssignee = String(task.assignee) === String(uid);
                }
            }

            const isProjectMember = (task.project?.members || []).some((m) => String(m.userId) === String(uid));
            const isTeamMember = (task.team?.members || []).some((m) => String(m.userId) === String(uid));

            assert(
                isAdmin || isCreator || isAssignee || isProjectMember || isTeamMember,
                'FORBIDDEN',
                'FORBIDDEN',
                403
            );
        }

        // Không cần asPlainTask nếu aggregation đã trả về POJO (Plain Old JavaScript Object)
        // Nếu `aggregate` trả về Mongoose document, bạn có thể cần `JSON.parse(JSON.stringify(task))`
        // nhưng thông thường `aggregate` trả về POJO.

        // Trả về task đã được populate đầy đủ
        return JSON.parse(JSON.stringify(task))

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
    // No need to connect DB here, runAction likely handles it or it's done inside
    return runAction(async ({ user }) => {
        await connectDB(); // Ensure DB is connected within the action scope
        const uid = user.externalUserId; // Creator's ID

        // Verify project and team membership
        const project = await Project.findById(projectId); // Don't use lean, we need to save
        assert(project, 'PROJECT_NOT_FOUND', 'Dự án không tồn tại.', 404);

        const projectMembers = project.members || [];
        const isProjectMember = projectMembers.some((m) => String(m.userId) === String(uid));

        let team = null;
        if (project.team) {
            team = await Team.findById(project.team).lean();
            assert(team, 'TEAM_NOT_FOUND', 'Nhóm không tồn tại.', 404);
        }

        let isMember = isProjectMember;
        if (!isMember && team) {
            isMember = (team.members || []).some((m) => String(m.userId) === String(uid));
        }

        const isAdmin = user.role === 'admin';
        assert(isMember || isAdmin, 'FORBIDDEN', 'Bạn không có quyền tạo công việc trong dự án này.', 403);

        // **Kiểm tra quyền tạo ROOT TASK - chỉ Project Manager mới được tạo**
        assert(
            canCreateTask(project, user),
            'Chỉ quản lý dự án mới được tạo công việc gốc',
            'FORBIDDEN',
            403
        );

        const hasManagePermission = canManageProject(project, user);

        // **THÊM MỚI: Thêm assignee vào project nếu chưa có.**
        // Bỏ qua việc chặn nếu assignee không nằm trong team — cho phép giao cho người ngoài team.
        if (payload.assignee && payload.assignee !== uid) {
            let assigneeInTeam = false;
            if (team) {
                assigneeInTeam = (team.members || []).some((m) => String(m.userId) === String(payload.assignee));
                // Do NOT assert; allow assigning to users not in the team.
            }

            const assigneeInProject = (project.members || []).some((m) => String(m.userId) === String(payload.assignee));

            if (!assigneeInProject) {
                project.members = project.members || [];
                project.members.push({
                    userId: payload.assignee,
                    role: 'member',
                    joinedAt: new Date()
                });
                await project.save();

                await logActivity({
                    actor: uid,
                    team: project.team,
                    project: projectId,
                    type: 'project.member.added',
                    payload: {
                        addedUserId: payload.assignee,
                        reason: 'auto_added_on_task_assignment'
                    },
                });

                revalidatePath(`/projects/${projectId}/members`);
                await revalidateMany([tags.project(projectId)]);
            }

            // If assignee is not a member of the team, log an activity to make it visible
            if (team && !assigneeInTeam) {
                await logActivity({
                    actor: uid,
                    team: project.team,
                    project: projectId,
                    type: 'task.assignee.outside_team',
                    payload: {
                        assigneeId: payload.assignee,
                        note: 'Assignee does not belong to project team; assignment allowed but will not count as team member for team reports.'
                    }
                });
            }
        }

        // Determine status and workflow based on permissions
        let status = TASK_STATUS.DRAFT;
        let approval = { required: false, status: 'none' };
        let assigneeConfirm = { required: false };
        let initialPoints = Number(payload.initialPoints) || 0; // Allow points always, but might be 0
        let shouldNotifyAssignee = false; // Flag to check if notification is needed

        if (!hasManagePermission) {
            // Member creates task -> needs approval
            status = TASK_STATUS.PENDING_APPROVAL;
            approval = { required: true, status: 'pending' };
            initialPoints = 0; // Member cannot set points initially
        } else {
            // Manager creates task
            if (payload.assignee && payload.assignee !== uid) {
                // Assigned to someone else -> needs confirmation
                status = TASK_STATUS.WAITING_ASSIGNEE_CONFIRM;
                assigneeConfirm = { required: true };
                shouldNotifyAssignee = true; // Set flag to notify
            } else if (payload.assignee && payload.assignee === uid) {
                // Manager assigns to self -> In Progress directly
                status = TASK_STATUS.IN_PROGRESS;
            } else {
                // Manager creates unassigned task -> Draft or as specified
                status = payload.status || TASK_STATUS.DRAFT; // Allow overriding status if manager creates
            }
            // Manager can always set initial points
            initialPoints = Number(payload.initialPoints) || 0;
        }

        // Create task
        const task = new Task({ // Use 'new Task' and 'task.save()' for potential middleware/hooks
            title: payload.title,
            description: payload.description || '',
            priority: payload.priority || 'medium', // Default to medium
            workType: payload.workType || null,
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
            // Ensure docs object exists if needed later
            docs: payload.createTaskFolder ? {} : undefined,
        });

        await task.save(); // Save the new task document

        // Create Google Drive folder if requested
        if (payload.createTaskFolder && !task.parentTask) {
            try {
                const projectMeta =
                    (await Project.findById(projectId)
                        .select('monthlyDriveFolders driveFolderId rootDriveFolderId')
                        .lean()) ||
                    {
                        monthlyDriveFolders: project?.monthlyDriveFolders ?? [],
                        driveFolderId: project?.driveFolderId ?? null,
                        rootDriveFolderId: project?.rootDriveFolderId ?? null,
                    };

                const referenceDate =
                    task.plannedStartAt ||
                    task.plannedDueAt ||
                    payload.plannedStartAt ||
                    payload.plannedDueAt ||
                    new Date();

                const monthlyFolderId = resolveMonthlyDriveFolderId(projectMeta, referenceDate);
                const rootFolderId =
                    projectMeta?.rootDriveFolderId ||
                    projectMeta?.driveFolderId ||
                    project.driveFolderId ||
                    null;
                const parentFolderId = monthlyFolderId || rootFolderId;

                if (!parentFolderId) {
                    console.warn(`[createTask ${task._id}] Missing Drive parent folder metadata. Skip folder creation.`);
                } else {
                    const folderName = (task.title || 'Task').trim() || `Task-${task._id}`;
                    const { createTaskFolder } = await import('@/lib/drive.js');
                    const folderResult = await createTaskFolder(folderName, parentFolderId);

                    await Task.findByIdAndUpdate(task._id, {
                        $set: {
                            'docs.enabled': true,
                            'docs.driveFolderId': folderResult.id,
                            'docs.driveFolderName': folderResult.name,
                        },
                    });
                }

            } catch (driveErr) {
                console.error(`[createTask ${task._id}] Failed to create Drive folder:`, driveErr);
                // Log error but don't fail task creation
            }
        }

        // --- Send Zalo Notification ---
        if (shouldNotifyAssignee && payload.assignee) {
            // Sử dụng helper function để gửi notification đơn giản
            notifyTaskAssignment(task.title, String(payload.assignee), String(task._id)).catch(err => {
                console.error(`[createTask ${task._id}] Failed to send Zalo notification to ${payload.assignee}:`, err);
            });
        }

        // [NEW] Notify Project Manager (if creator is not PM)
        // Find PMs
        const projectManagers = (project.members || [])
            .filter(m => m.role === 'owner' || m.role === 'manager')
            .map(m => String(m.userId));
        
        // Filter out creator
        const pmsToNotify = projectManagers.filter(pmId => pmId !== uid);

        if (pmsToNotify.length > 0) {
             const { notifyEvent } = await import('@/lib/noti.js');
             notifyEvent('task.created', {
                taskId: String(task._id),
                projectId: String(project._id),
                byUserId: uid,
                toUserIds: pmsToNotify,
                taskTitle: task.title
             }).catch(err => console.error('Failed to notify PMs about new task:', err));
        }
        
        // -----------------------------

        await logActivity({
            actor: uid,
            team: project.team,
            project: projectId,
            task: task._id,
            type: 'task.created',
            payload: { title: task.title, status: task.status },
        });

        // Revalidate paths and tags
        revalidatePath(`/projects/${projectId}/tasks`);
        revalidatePath(`/projects/${projectId}`);
        revalidatePath(`/tasks`);
        // Revalidate specific tags if using tag-based caching elsewhere
        await revalidateMany([
            tags.project(projectId),
            tags.task(task._id),
        ]);

        // Fetch the created task again with populated project name for the return value
        const createdTask = await Task.findById(task._id)
            .populate('project', 'name') // Only populate necessary fields
            .lean();

        return asPlainTask(createdTask); // Ensure plain object is returned

    }, { requireAuth: true });
}

/**
 * Update task
 */
export async function updateTask(taskId, payload) {
    'use server';
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const task = await Task.findById(taskId);
        assert(task, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        // Load project if applicable and determine permission
        let project = null;
        if (task.scope === TASK_SCOPE.PROJECT) {
            project = await Project.findById(task.project);
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        }

        const hasManagePermission = project ? canManageProject(project, user) : false;
        const isAssigneeUser = String(task.assignee) === String(uid);

        // If not project manager nor assignee, forbid
        assert(hasManagePermission || isAssigneeUser, 'FORBIDDEN', 'FORBIDDEN', 403);

        // If current user is assignee (not manager), restrict editable fields to safe list
        if (!hasManagePermission && isAssigneeUser) {
            const allowedFields = new Set([
                'title', 'description', 'priority', 'workType', 'plannedStartAt', 'plannedDueAt',
                'platforms', 'tags', 'estimatedHours', 'initialPoints'
            ]);
            const invalidKeys = Object.keys(payload).filter(k => !allowedFields.has(k));
            assert(
                invalidKeys.length === 0,
                `Bạn không có quyền sửa các trường: ${invalidKeys.join(', ')}`,
                'FORBIDDEN',
                403
            );
        }

        // Validate finalPoints nếu được cập nhật
        if (payload.finalPoints !== undefined && payload.finalPoints !== null) {
            // 1. Tìm các subtask đã hoàn thành
            const completedSubtasks = await Task.find({
                parentTask: taskId,
                status: TASK_STATUS.COMPLETED,
                deletedAt: null
            }).lean();

            // 2. Tính tổng điểm subtask (chỉ tính finalPoints)
            const totalSubtaskPoints = completedSubtasks.reduce((sum, st) => 
                sum + (st.finalPoints || 0), 0
            );

            // 3. Validate: finalPoints mới phải >= tổng điểm subtask
            assert(
                Number(payload.finalPoints) >= totalSubtaskPoints,
                `Điểm chốt mới (${payload.finalPoints}) phải lớn hơn hoặc bằng tổng điểm subtask đã chốt (${totalSubtaskPoints}).`,
                'BAD_REQUEST',
                400
            );
        }

        // Validate quyền hủy task (cancel)
        if (payload.status === TASK_STATUS.CANCELLED && task.status !== TASK_STATUS.CANCELLED) {
            // Đang chuyển sang CANCELLED - kiểm tra quyền
                const canCancel = 
                (project ? canManageProject(project, user) : false) ||
                String(task.createdBy) === String(uid) ||
                String(task.assignee) === String(uid);
            
            assert(
                canCancel,
                'Bạn không có quyền hủy task này. Chỉ quản lý dự án, người tạo hoặc người được giao task mới có quyền hủy.',
                'FORBIDDEN',
                403
            );
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

        // Populate project to get name
        const updatedTask = await Task.findById(task._id)
            .populate('project', 'name')
            .lean();

        return asPlainTask(updatedTask);
    }, { requireAuth: true });
}

/**
 * Delete task (soft delete)
 */
export async function deleteTask(taskId) {
    'use server';
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const task = await Task.findById(taskId);
        assert(task, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        // Verify permission
        if (task.scope === TASK_SCOPE.PROJECT) {
            const project = await Project.findById(task.project);
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const hasManagePermission = canManageProject(project, user);
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
    'use server';
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
            const isAdmin = user.role === 'admin';
            assert(isMember || isAdmin, 'FORBIDDEN', 'FORBIDDEN', 403);
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
    'use server';
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;

        const task = await Task.findById(taskId);
        assert(task, 'TASK_NOT_FOUND', 'NOT_FOUND', 404);

        // Verify permission: allow project managers, task assignee, or task creator to reassign
        if (task.scope === TASK_SCOPE.PROJECT) {
            const project = await Project.findById(task.project);
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const hasManagePermission = canManageProject(project, user);
            const isAssigneeUser = String(task.assignee) === String(uid);
            const isCreatorUser = String(task.createdBy) === String(uid);

            assert(hasManagePermission || isAssigneeUser || isCreatorUser, 'FORBIDDEN', 'FORBIDDEN', 403);
        }

        const oldAssignee = task.assignee;

        // Ensure assignee is a member of the project so they can view parent task/subtasks
        if (task.scope === TASK_SCOPE.PROJECT) {
            const project = await Project.findById(task.project);
            if (project) {
                const assigneeInProject = (project.members || []).some((m) => String(m.userId) === String(assigneeId));
                if (!assigneeInProject) {
                    project.members = project.members || [];
                    project.members.push({ userId: assigneeId, role: 'member', joinedAt: new Date() });
                    await project.save();

                    await logActivity({
                        actor: uid,
                        team: project.team,
                        project: project._id,
                        type: 'project.member.added',
                        payload: {
                            addedUserId: assigneeId,
                            reason: 'auto_added_on_task_assignment'
                        }
                    });

                    revalidatePath(`/projects/${String(project._id)}/members`);
                    await revalidateMany([tags.project(String(project._id))]);

                    // If team exists and assignee not in team, log an outside-team assignment
                    if (project.team) {
                        const team = await Team.findById(project.team).lean();
                        const assigneeInTeam = team && (team.members || []).some(m => String(m.userId) === String(assigneeId));
                        if (!assigneeInTeam) {
                            await logActivity({
                                actor: uid,
                                team: project.team,
                                project: project._id,
                                type: 'task.assignee.outside_team',
                                payload: {
                                    assigneeId,
                                    note: 'Assignee does not belong to project team; assignment allowed but will not count as team member for team reports.'
                                }
                            });
                        }
                    }
                }
            }
        }

        task.assignee = assigneeId;

        // [THÊM] Logic tự động cho subtask
        if (task.parentTask && assigneeId) {
            // Lấy parent task để check parent owner
            const parentTask = await Task.findById(task.parentTask).lean();

            // Chỉ tự động IN_PROGRESS khi assignee chính là parent owner
            if (parentTask && parentTask.assignee && String(parentTask.assignee) === String(assigneeId)) {
                // Parent owner tự giao cho mình → Tự động chuyển IN_PROGRESS
                task.status = TASK_STATUS.IN_PROGRESS;
                task.startedAt = new Date();
                task.assigneeConfirm = {
                    required: false,
                    confirmedBy: assigneeId,
                    confirmedAt: new Date()
                };
            } else {
                // TẤT CẢ trường hợp khác → Cần xác nhận
                task.status = TASK_STATUS.WAITING_ASSIGNEE_CONFIRM;
                task.assigneeConfirm = {
                    required: true
                };
            }
        }

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
 * List all subtasks of a parent task
 */
export async function listSubtasks(parentTaskId) {
    'use server';
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
