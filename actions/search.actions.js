'use server';

import { connectDB } from '@/lib/db';
import Task from '@/model/task.model';
import Project from '@/model/project.model';
import Team from '@/model/team.model';
import { getRequestUser } from '@/lib/request-user';

/**
 * Global search across Tasks, Projects, and Teams
 * @param {string} query - Search keyword
 * @returns {Promise<Array>} List of search results
 */
export async function searchGlobal(query) {
    if (!query || query.trim().length === 0) return [];

    const user = await getRequestUser();
    if (!user) return [];

    await connectDB();
    const regex = new RegExp(query, 'i');

    // 1. Search Teams (User must be a member)
    const teamsPromise = Team.find({
        name: regex,
        'members.userId': user.id,
        isActive: true
    })
    .select('name _id')
    .limit(10) // Increased limit to allow filling the quota
    .lean();

    // 2. Search Projects (User must be a member)
    const projectsPromise = Project.find({
        name: regex,
        'members.userId': user.id,
        isActive: true
    })
    .select('name _id team')
    .populate('team', 'name')
    .limit(10) // Increased limit
    .lean();

    // 3. Search Tasks (User must be related: assignee, creator, or in project)
    const tasksPromise = Task.find({
        title: regex,
        $or: [
            { 'assignees.userId': user.id },
            { 'createdBy': user.id },
        ]
    })
    .select('title _id project')
    .populate('project', 'name')
    .limit(10) // Increased limit
    .lean();

    const [teams, projects, tasks] = await Promise.all([teamsPromise, projectsPromise, tasksPromise]);

    const results = [];

    // Format Teams
    teams.forEach(t => results.push({
        type: 'team',
        id: t._id.toString(),
        title: t.name,
        subtitle: 'Nhóm',
        url: `/teams/${t._id}`
    }));

    // Format Projects
    projects.forEach(p => results.push({
        type: 'project',
        id: p._id.toString(),
        title: p.name,
        subtitle: p.team?.name ? `Nhóm: ${p.team.name}` : 'Dự án',
        url: `/projects/${p._id}`
    }));

    // Format Tasks
    tasks.forEach(t => results.push({
        type: 'task',
        id: t._id.toString(),
        title: t.title,
        subtitle: t.project?.name ? `Dự án: ${t.project.name}` : 'Công việc',
        url: `/tasks/${t._id}`
    }));

    // Return top 10 results
    return results.slice(0, 10);
}
