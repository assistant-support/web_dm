import { notFound, redirect } from 'next/navigation';
import TaskBoard from '@/components/tasks/TaskBoard.client';
import { getProjectDetail } from '@/data/project/actions/list';
import { listByProject } from '@/data/task/actions/server';
import { getCurrentUser } from '@/lib/request-user';
import { listForPicker } from '@/data/appUser/actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0; 

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

    // Get all users for assignee selection
    const usersResult = await listForPicker();
    const allUsers = usersResult.ok ? usersResult.data.items : [];
    const users = allUsers.map(u => ({
        value: u.value,
        label: u.email,
        name: u.name
    }));
    return (
        <div className="space-y-4">
            <TaskBoard
                projectId={projectId}
                canManage={canManage}
                currentUserId={user.externalUserId}
                initialTasks={initialTasks}
                projectMembers={project.members || []}
                users={users}
            />
        </div>
    );
}
