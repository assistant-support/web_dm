/**
 * API endpoint: Get task statistics (count by status)
 * GET /api/tasks/my/stats
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/request-user';
import { connectDB } from '@/lib/db';
import Task from '@/model/task.model';
import { TASK_SCOPE, TASK_STATUS } from '@/model/common/enums';

export const runtime = 'nodejs';

export async function GET(request) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.externalUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const uid = user.externalUserId;
        const isAdmin = user.role === 'admin';

        // Build base query (same logic as listMyTasks)
        const baseQuery = {
            scope: TASK_SCOPE.PROJECT,
            deletedAt: null,
        };

        // Permission filter (same as listMyTasks)
        if (!isAdmin) {
            baseQuery.$or = [
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

        // Get counts for each status using aggregation
        const stats = await Task.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Initialize all status counts to 0
        const result = {
            total: 0,
            inProgress: 0,
            waitingConfirm: 0,
            rejected: 0,
            completedAwaitReview: 0,
            completed: 0,
            cancelled: 0,
        };

        // Map aggregation results to status counts
        stats.forEach(stat => {
            const count = stat.count || 0;
            result.total += count;

            switch (stat._id) {
                case TASK_STATUS.IN_PROGRESS:
                    result.inProgress = count;
                    break;
                case TASK_STATUS.WAITING_ASSIGNEE_CONFIRM:
                    result.waitingConfirm = count;
                    break;
                case TASK_STATUS.REJECTED:
                    result.rejected = count;
                    break;
                case TASK_STATUS.COMPLETED_AWAIT_REVIEW:
                    result.completedAwaitReview = count;
                    break;
                case TASK_STATUS.COMPLETED:
                    result.completed = count;
                    break;
                case TASK_STATUS.CANCELLED:
                    result.cancelled = count;
                    break;
            }
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Get task stats error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

