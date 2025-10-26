// app/(auth)/page.js
// Trang chủ - hiển thị nhiệm vụ cá nhân

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/request-user'; // Assuming this exists
import PersonalTasksClient from '@/components/tasks/PersonalTasksClient.client';
// Assuming these actions exist and return the specified structure
import { listMyTasks } from '@/data/task/actions';
import { listMyProjects } from '@/data/project/actions/list';
import { listForPicker } from '@/data/appUser/actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Ensure data is fresh on each request

export default async function HomePage() {
    const user = await getCurrentUser();
    if (!user || !user.externalUserId) {
        redirect('/login');
    }

    // 1. Get user's tasks (tasks created by user or assigned to user)
    // listMyTasks should return tasks with user IDs (createdBy, assignee)
    // And potentially pre-fetched projectMembers for permission checks within TaskItem
    const tasksResult = await listMyTasks();
    const initialTasks = tasksResult.ok ? tasksResult.data : []; // Assuming data is the array of tasks

    // 2. Get user's projects for create task dialog
    // projectsResult = { ok: true, data: { projects: [...] } }
    const projectsResult = await listMyProjects();
    // Correctly access the nested 'projects' array
    const projects = projectsResult.ok ? projectsResult.data.projects : [];

    // 3. Get all necessary user details
    const usersResult = await listForPicker();
    // 4. Standardize user data format for components
    const allUsersWithDetails = usersResult.ok
        ? usersResult.data.items.map(u => ({
            id: u.value,         // Standardize ID field
            name: u.name,
            email: u.email,
            avatarUrl: u.avatar, // Standardize avatar field name
            label: u.label,      // Keep original label if needed
            // Include other fields if UserInfoPopup needs them
            jobTitle: u.jobTitle,
            color: u.color,
        }))
        : [];

    // 5. Prepare simplified user list for pickers (like in CreateTaskDialog)
    const usersForPicker = allUsersWithDetails.map(u => ({
        value: u.id,
        label: u.label || u.name, // Use label, fallback to name
        name: u.name
    }));
    return (
        <PersonalTasksClient
            initialTasks={initialTasks}
            projects={projects} // Pass the correct projects array
            allUsersWithDetails={allUsersWithDetails} // Pass standardized user details
            currentUserId={user.externalUserId}
            users={usersForPicker} // Pass simplified list for pickers
        />
    );
}