// app/(auth)/page.js
// Trang chủ - hiển thị nhiệm vụ cá nhân

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/request-user';
import PersonalTasksClient from '@/components/tasks/PersonalTasksClient.client';
import { listMyTasks } from '@/data/task/actions/server';
import { listMyProjects } from '@/data/project/actions/list';
import { listForPicker } from '@/data/appUser/actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
    // Get current user
    const user = await getCurrentUser();
    if (!user || !user.externalUserId) {
        redirect('/login');
    }

    // Get user's tasks (tasks created by user or assigned to user)
    const tasksResult = await listMyTasks();
    const initialTasks = tasksResult.ok ? tasksResult.data : [];

    // Get user's projects for create task dialog
    const projectsResult = await listMyProjects();
    const projects = projectsResult.ok ? (projectsResult.data?.projects || projectsResult.data || []) : [];

    // Get users for assignee picker
    const usersResult = await listForPicker();
    const users = usersResult.ok ? usersResult.data : [];
    return (
        <PersonalTasksClient
            initialTasks={initialTasks}
            projects={projects}
            users={users.items}
            currentUserId={user.externalUserId}
        />
    );
}
