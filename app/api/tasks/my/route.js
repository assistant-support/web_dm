/**
 * API endpoint: Get my tasks with pagination
 * GET /api/tasks/my?skip=0&limit=12&status=&priority=&projectId=
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/request-user';
import { connectDB } from '@/lib/db';
import Task from '@/model/task.model';
import { TASK_SCOPE } from '@/model/common/enums';
import { asPlainTask } from '@/lib/serialize';
import { toPlainDate } from '@/lib/serialize';

export const runtime = 'nodejs';

export async function GET(request) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.externalUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const skip = parseInt(searchParams.get('skip') || '0', 10);
        const limit = parseInt(searchParams.get('limit') || '12', 10);
        const status = searchParams.get('status') || '';
        const priority = searchParams.get('priority') || '';
        const projectId = searchParams.get('projectId') || '';

        await connectDB();
        const uid = user.externalUserId;
        const isAdmin = user.role === 'admin';

        // Build query
        const query = {
            scope: TASK_SCOPE.PROJECT,
            deletedAt: null,
        };

        // Permission filter
        if (!isAdmin) {
            query.$or = [
                {
                    parentTask: null,
                    $or: [
                        { createdBy: uid },
                        { assignee: uid },
                    ]
                },
                {
                    parentTask: { $ne: null },
                    assignee: uid
                }
            ];
        }

        // Apply filters
        if (status) {
            query.status = status;
        }
        if (priority) {
            query.priority = priority;
        }
        if (projectId) {
            query.project = projectId;
        }

        // Get total count (for hasMore calculation)
        const totalCount = await Task.countDocuments(query);

        // Get paginated tasks with aggregation
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
                    localField: 'parentTask',
                    foreignField: '_id',
                    pipeline: [{ $project: { title: 1 } }],
                    as: 'parentTaskInfo'
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
                        { $sort: { createdAt: 1 } }
                    ],
                    as: 'subtasks'
                }
            },
            {
                $addFields: {
                    projectName: { $arrayElemAt: ['$projectInfo.name', 0] },
                    projectMembers: { $arrayElemAt: ['$projectInfo.members', 0] },
                    parentTaskTitle: { $arrayElemAt: ['$parentTaskInfo.title', 0] },
                    subtaskCount: { $size: '$subtasks' }
                }
            },
            { $project: { projectInfo: 0, parentTaskInfo: 0 } },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        // Transform tasks
        const transformedTasks = tasks.map(task => {
            const plainTask = asPlainTask(task);
            plainTask.subtasks = (task.subtasks || []).map(asPlainTask);
            plainTask.projectMembers = Array.isArray(task.projectMembers)
                ? task.projectMembers.map((m) => ({
                      userId: String(m.userId),
                      role: m.role,
                      createdAt: toPlainDate(m.createdAt),
                      updatedAt: toPlainDate(m.updatedAt),
                  }))
                : [];
            plainTask.parentTaskTitle = task.parentTaskTitle || null;
            return plainTask;
        });

        const hasMore = skip + limit < totalCount;

        return NextResponse.json({
            tasks: transformedTasks,
            total: totalCount,
            skip,
            limit,
            hasMore
        });
    } catch (error) {
        console.error('Get my tasks error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

