// app/(auth)/(main)/projects/[projectId]/tasks/page.js

import { notFound, redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import TaskBoard from '@/components/tasks/TaskBoard.client';
import { getProjectDetail } from '@/data/project/actions/list';
import { listByProject } from '@/data/task/actions/server';
import { getCurrentUser } from '@/lib/request-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Always revalidate

// Main page component
export default async function ProjectTasksPage({ params }) {
    const { projectId } = await params;

    // Get current user
    const user = await getCurrentUser();
    if (!user || !user.externalUserId) {
        redirect('/login');
    }

    // Get project details
    const result = await getProjectDetail(projectId);
    if (!result.ok) {
        notFound();
    }
    
    const project = result.data;
    if (!project) {
        notFound();
    }

    // Check if user can manage (owner or manager)
    const userMember = project.members?.find(m => m.userId === user.externalUserId);
    const canManage = userMember && (userMember.role === 'owner' || userMember.role === 'manager');

    // Get initial tasks
    const tasksResult = await listByProject(projectId, {});
    const initialTasks = tasksResult.ok ? tasksResult.data : [];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Quản lý công việc trong dự án
                    </p>
                </div>
            </div>

            {/* Task Board */}
            <TaskBoard
                projectId={projectId}
                canManage={canManage}
                currentUserId={user.externalUserId}
                initialTasks={initialTasks}
                projectMembers={project.members || []}
            />
        </div>
    );
}
