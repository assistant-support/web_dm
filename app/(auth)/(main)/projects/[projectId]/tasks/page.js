import { notFound, redirect } from 'next/navigation';
import TaskList from '@/components/tasks/TaskList.client';
import CreateTaskButton from '@/components/tasks/CreateTaskButton.client';
import { getProjectDetail } from '@/data/project/actions/list';
import { listByProject } from '@/data/task/actions/server';
import { getCurrentUser } from '@/lib/request-user';
import { getUsersDisplayInfo } from '@/lib/user-display';
import { canCreateTask } from '@/lib/permissions.js';

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

    const isAdmin = user.role === 'admin'; // [NEW] Kiểm tra quyền admin

    // Check if user can manage (owner hoặc manager trong dự án, hoặc admin hệ thống)
    const userMember = project.members?.find(m => m.userId === user.externalUserId);
    const canManage = isAdmin || (userMember && (userMember.role === 'owner' || userMember.role === 'manager'));
    
    // Check if user can create root tasks
    // Admin luôn có quyền tạo task, kể cả khi không phải member/manager
    const canCreate = isAdmin || canCreateTask(project, user.externalUserId);

    // Build list of user IDs to fetch display info for.
    // Use the union of project members and team members (deduplicated) so dropdowns see all relevant users.
    const projectMemberIds = project.members?.map(m => m.userId) || [];
    const team = project.team; // Already populated by getProjectDetail
    const teamMemberIds = team?.members ? team.members.map(m => m.userId) : [];

    const usersToFetch = Array.from(new Set([...(projectMemberIds || []), ...(teamMemberIds || [])]));
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
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="p-6 space-y-6">
                {/* Header với nút tạo task */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Công việc</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {initialTasks.length} công việc trong dự án
                        </p>
                    </div>
                    <CreateTaskButton
                        projectId={projectId}
                        users={users}
                        allUsersWithDetails={allUsersWithDetails}
                        projectMembers={project.members || []}
                        currentUserId={user.externalUserId}
                        canManage={canManage}
                        canCreate={canCreate}
                        isActive={project.isActive}
                    />
                </div>

                {/* Task List */}
                <TaskList
                    initialTasks={initialTasks}
                    users={users}
                    allUsersWithDetails={allUsersWithDetails}
                    currentUserId={user.externalUserId}
                    canManage={canManage}
                    isAdmin={isAdmin} // [NEW] Truyền quyền admin
                />
            </div>
        </div>
    );
}
