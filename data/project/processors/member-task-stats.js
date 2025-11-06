// data/project/processors/member-task-stats.js
// Processor tính toán stats task theo member trong project

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { connectDB } from '@/lib/db';
import Task from '@/model/task.model';
import * as tags from '@/data/_shared/tags';
import { TASK_STATUS } from '@/model/common/enums';

/**
 * Lấy task stats cho nhiều members trong 1 project
 * Trả về: Map userId -> { statusCounts, points, totalTasks }
 * 
 * CHÚ Ý: Bao gồm cả task con (subtasks) nếu member làm task con trong task cha
 */
async function _getBatchMemberTaskStats(projectId, userIds) {
    await connectDB();

    if (!userIds || userIds.length === 0) return {};

    // Convert projectId to ObjectId for MongoDB query
    const mongoose = await import('mongoose');
    const projectObjectId = new mongoose.Types.ObjectId(projectId);
    
    console.log('   - MongoDB ObjectId:', projectObjectId);
    console.log('   - Query conditions:');
    console.log('     • project (ObjectId):', projectObjectId);
    console.log('     • assignee in:', userIds);
    console.log('     • deletedAt: null');
    console.log('     • status not in: [CANCELLED, REJECTED]');

    // Aggregation để đếm task theo status và tính tổng điểm
    const results = await Task.aggregate([
        {
            $match: {
                project: projectObjectId, // ✅ FIX: Use 'project' field (ObjectId)
                assignee: { $in: userIds },
                deletedAt: null, // Only count non-deleted tasks
                // Không tính task đã hủy hoặc từ chối
                status: {
                    $nin: [TASK_STATUS.CANCELLED, TASK_STATUS.REJECTED]
                }
            }
        },
        {
            $group: {
                _id: {
                    userId: '$assignee',
                    status: '$status'
                },
                count: { $sum: 1 },
                totalPoints: { $sum: { $ifNull: ['$points', 0] } }
            }
        },
        {
            $group: {
                _id: '$_id.userId',
                statusCounts: {
                    $push: {
                        status: '$_id.status',
                        count: '$count'
                    }
                },
                points: { $sum: '$totalPoints' },
                totalTasks: { $sum: '$count' }
            }
        }
    ]);

    // Convert results to map
    const statsMap = {};
    
    results.forEach(result => {
        const userId = result._id;
        const statusCounts = {};
        
        result.statusCounts.forEach(({ status, count }) => {
            statusCounts[status] = count;
        });

        statsMap[userId] = {
            statusCounts,
            points: result.points || 0,
            totalTasks: result.totalTasks || 0
        };
    });

    // Ensure all userIds have an entry (even if no tasks)
    userIds.forEach(userId => {
        if (!statsMap[userId]) {
            statsMap[userId] = {
                statusCounts: {},
                points: 0,
                totalTasks: 0
            };
        }
    });

    return statsMap;
}

/**
 * Cached version - lấy task stats cho nhiều members
 * Cache 3 giây, revalidate khi có thay đổi project/task
 */
export const getBatchMemberTaskStats = cache(
    async (projectId, userIds) => {
        return await _getBatchMemberTaskStats(projectId, userIds);
    },
    ['project-member-task-stats'],
    {
        revalidate: 3,
        tags: (projectId) => [
            tags.project(projectId),
            tags.tasks(),
            'project-member-task-stats'
        ]
    }
);

// Export wrapped version with unstable_cache
export const getCachedBatchMemberTaskStats = (projectId, userIds) => {
    return unstable_cache(
        async () => _getBatchMemberTaskStats(projectId, userIds),
        [`project-member-task-stats-${projectId}`],
        {
            revalidate: 3,
            tags: [
                tags.project(projectId),
                tags.tasks(),
                'project-member-task-stats'
            ]
        }
    )();
};
