// data/project/actions/list.js
// Actions để list projects của user

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction } from '@/lib/action-utils.js';
import { unstable_cache } from 'next/cache';
import Project from '@/model/project.model.js';
import * as tags from '@/data/_shared/tags.js';

/**
 * List all projects where user is a member
 */
export async function listMyProjects({ search = '', teamId = null } = {}) {
    return runAction(
        async ({ user }) => {
            await connectDB();

            const query = {
                'members.userId': user.externalUserId,
            };

            // Filter by team if provided
            if (teamId) {
                query.team = teamId;
            }

            // Search by name or code
            if (search && search.trim()) {
                query.$or = [
                    { name: { $regex: search.trim(), $options: 'i' } },
                    { code: { $regex: search.trim(), $options: 'i' } },
                ];
            }

            const projects = await Project.find(query)
                .populate('team', 'name')
                .sort({ updatedAt: -1 })
                .limit(100)
                .lean();

            // Serialize để tránh lỗi MongoDB ObjectId
            return JSON.parse(JSON.stringify({ projects, count: projects.length }));
        },
        { requireAuth: true }
    );
}

/**
 * Get project detail - only if user is a member
 */
export async function getProjectDetail(projectId) {
    return runAction(
        async ({ user }) => {
            await connectDB();

            const project = await Project.findById(projectId)
                .populate('team', 'name')
                .lean();

            if (!project) {
                return { ok: false, code: 'NOT_FOUND', message: 'Dự án không tồn tại' };
            }

            // Check if user is a member
            const isMember = project.members.some(
                m => String(m.userId) === String(user.externalUserId)
            );

            if (!isMember) {
                return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền xem dự án này' };
            }

            // Serialize để tránh lỗi MongoDB ObjectId
            return JSON.parse(JSON.stringify(project));
        },
        { requireAuth: true }
    );
}
