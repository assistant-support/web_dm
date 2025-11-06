import { notFound, redirect } from 'next/navigation';
import TaskList from '@/components/tasks/TaskList.client';
import CreateTaskButton from '@/components/tasks/CreateTaskButton.client';
import { getProjectDetail } from '@/data/project/actions/list';
import { listByProject } from '@/data/task/actions/server';
import { getCurrentUser } from '@/lib/request-user';
import { getUsersDisplayInfo } from '@/lib/user-display';

// Revalidate every 3 seconds for real-time updates
export const revalidate = 3; 

export default async function ProjectTasksPage({ params }) {
    const { projectId } = await params;

    // Get current user
    const user = await getCurrentUser();
    if (!user || !user.externalUserId) {
        redirect('/login');
    }

    // Get project details and tasks in parallel
    const [result, tasksResult] = await Promise.all([
        getProjectDetail(projectId),
        listByProject(projectId, {})
    ]);
    
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

    // Get team member IDs if project has team
    const team = project.team; // Already populated by getProjectDetail
    const teamMemberIds = team?.members ? team.members.map(m => m.userId) : [];

    // Get user display info for team members only (optimize: don't fetch all users)
    const usersToFetch = teamMemberIds.length > 0 ? teamMemberIds : project.members?.map(m => m.userId) || [];
    const usersMapResult = await getUsersDisplayInfo(usersToFetch);
    
    // Convert to users array for CreateTaskButton
    const users = [];
    const allUsersWithDetails = [];
    
    if (usersMapResult) {
        usersMapResult.forEach((userInfo, userId) => {
            users.push({
                value: userId,
                label: userInfo.email,
                name: userInfo.name
            });
            allUsersWithDetails.push({
                id: userId,
                name: userInfo.name,
                email: userInfo.email,
                avatarUrl: userInfo.avatarUrl,
                label: `${userInfo.name} (${userInfo.email})`,
                jobTitle: userInfo.jobTitle || '',
                color: userInfo.color || '',
            });
        });
    }

    // Process tasks - add projectMembers to each task for permission checks
    const initialTasks = (tasksResult.ok ? tasksResult.data : []).map(task => ({
        ...task,
        projectMembers: project.members || []
    }));

    return (
        <div className="flex flex-col h-full">
            {/* Header với nút tạo task */}
            <div className="flex items-center justify-between mb-4 px-1">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Công việc</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {initialTasks.length} công việc trong dự án
                    </p>
                </div>
                <CreateTaskButton
                    projectId={projectId}
                    users={users}
                    projectMembers={project.members || []}
                    currentUserId={user.externalUserId}
                    canManage={canManage}
                />
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <TaskList
                    initialTasks={initialTasks}
                    users={users}
                    allUsersWithDetails={allUsersWithDetails}
                    currentUserId={user.externalUserId}
                    canManage={canManage}
                />
            </div>
        </div>
    );
}
