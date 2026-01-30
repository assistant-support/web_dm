/**
 * Helper functions for search functionality
 * Implements optimized search with permission filtering
 */

import { connectDB } from './db.js';
import { normalizeText } from './text-normalize.js';
import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';
import Team from '@/model/team.model.js';

/**
 * Get allowed project IDs for a user (cache-friendly)
 * @param {string} userId - User ID
 * @param {boolean} isAdmin - Is user admin
 * @returns {Promise<Array<string>|null>} Array of project IDs or null if admin (all projects)
 */
export async function getAllowedProjectIds(userId, isAdmin) {
    if (isAdmin) return null; // Admin can see all
    
    await connectDB();
    const projects = await Project.find({
        isActive: true,
        'members.userId': userId
    }).select('_id').lean();
    
    return projects.map(p => p._id.toString());
}

/**
 * Search projects with permission filtering
 * @param {string} keyword - Search keyword (normalized)
 * @param {string} userId - User ID
 * @param {boolean} isAdmin - Is user admin
 * @param {object} options - Options (limit, cursor)
 * @returns {Promise<{items: Array, hasMore: boolean, nextCursor: string|null}>}
 */
export async function searchProjects(keyword, userId, isAdmin, options = {}) {
    await connectDB();
    const { limit = 3, cursor = null } = options;
    
    const query = {
        isActive: true,
        $or: [
            { name_normalized: { $regex: `^${keyword}` } },
            // Fallback: search in name if normalized not available
            { name_normalized: { $exists: false }, name: { $regex: new RegExp(`^${keyword}`, 'i') } }
        ]
    };
    
    // Permission filter
    if (!isAdmin) {
        query['members.userId'] = userId;
    }
    
    // Cursor pagination
    if (cursor) {
        query.createdAt = { $lt: new Date(cursor) };
    }
    
    // Debug logging
    console.log('[Search Projects]', {
        keyword,
        userId,
        isAdmin,
        query: JSON.stringify(query, null, 2)
    });
    
    const results = await Project.find(query)
        .select('_id name createdAt members')
        .sort({ createdAt: -1 })
        .limit(limit + 1) // Fetch one extra to check hasMore
        .lean();
    
    // Debug: log results
    console.log('[Search Projects] Found:', results.length, 'results');
    if (results.length > 0) {
        console.log('[Search Projects] First result:', {
            id: results[0]._id.toString(),
            name: results[0].name,
            members: results[0].members?.map(m => m.userId) || []
        });
    }
    
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    
    return {
        items: items.map(p => ({
            id: p._id.toString(),
            name: p.name,
            createdAt: p.createdAt
        })),
        hasMore,
        nextCursor: hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null
    };
}

/**
 * Search tasks with permission filtering
 * @param {string} keyword - Search keyword (normalized)
 * @param {string} userId - User ID
 * @param {boolean} isAdmin - Is user admin
 * @param {object} options - Options (limit, cursor, allowedProjectIds)
 * @returns {Promise<{items: Array, hasMore: boolean, nextCursor: string|null}>}
 */
export async function searchTasks(keyword, userId, isAdmin, options = {}) {
    await connectDB();
    const { limit = 3, cursor = null, allowedProjectIds = null } = options;
    
    const query = {
        deletedAt: null,
        $or: [
            { title_normalized: { $regex: `^${keyword}` } },
            // Fallback: search in title if normalized not available
            { title_normalized: { $exists: false }, title: { $regex: new RegExp(`^${keyword}`, 'i') } }
        ]
    };
    
    // Permission filter
    if (isAdmin) {
        // Admin can see all tasks
    } else {
        // Member: must be in allowed projects OR assignee OR creator
        if (allowedProjectIds && allowedProjectIds.length > 0) {
            query.$or = [
                { project: { $in: allowedProjectIds } },
                { assignee: userId },
                { createdBy: userId }
            ];
        } else {
            // No allowed projects, only own tasks
            query.$or = [
                { assignee: userId },
                { createdBy: userId }
            ];
        }
    }
    
    // Cursor pagination
    if (cursor) {
        query.createdAt = { $lt: new Date(cursor) };
    }
    
    const results = await Task.find(query)
        .select('_id title project createdAt')
        .populate('project', 'name')
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .lean();
    
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    
    return {
        items: items.map(t => ({
            id: t._id.toString(),
            title: t.title,
            projectName: t.project?.name || null,
            createdAt: t.createdAt
        })),
        hasMore,
        nextCursor: hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null
    };
}

/**
 * Search teams with permission filtering
 * @param {string} keyword - Search keyword (normalized)
 * @param {string} userId - User ID
 * @param {boolean} isAdmin - Is user admin
 * @param {object} options - Options (limit, cursor)
 * @returns {Promise<{items: Array, hasMore: boolean, nextCursor: string|null}>}
 */
export async function searchTeams(keyword, userId, isAdmin, options = {}) {
    await connectDB();
    const { limit = 3, cursor = null } = options;
    
    const query = {
        $or: [
            { name_normalized: { $regex: `^${keyword}` } },
            // Fallback: search in name if normalized not available
            { name_normalized: { $exists: false }, name: { $regex: new RegExp(`^${keyword}`, 'i') } }
        ]
    };
    
    // Permission filter
    if (!isAdmin) {
        query['members.userId'] = userId;
    }
    
    // Cursor pagination
    if (cursor) {
        query.createdAt = { $lt: new Date(cursor) };
    }
    
    const results = await Team.find(query)
        .select('_id name createdAt')
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .lean();
    
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    
    return {
        items: items.map(t => ({
            id: t._id.toString(),
            name: t.name,
            createdAt: t.createdAt
        })),
        hasMore,
        nextCursor: hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null
    };
}

