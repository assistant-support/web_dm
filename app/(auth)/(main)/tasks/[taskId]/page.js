// app/(auth)/(main)/tasks/[taskId]/page.js
// Mục đích: Trang chi tiết task (SSR)

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTaskDetail } from '@/data/task/actions/server.js';
import { getDetailAction } from '@/data/project/actions/server.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { canManageProject } from '@/lib/permissions.js';
import { listForPicker } from '@/data/appUser/actions';
import TaskDetail from '@/components/tasks/TaskDetail.client.js';
import { ArrowLeft } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function TaskDetailPage({ params }) {
    // Await params theo Next.js 15
    const { taskId } = await params;
    if (!taskId) return notFound();

    const user = await getCurrentUser();
    
    // Get task detail
    const taskResult = await getTaskDetail(taskId);
    if (!taskResult.ok) {
        if (taskResult.code === 'NOT_FOUND' || taskResult.message?.includes('NOT_FOUND')) {
            return notFound();
        }
        return (
            <div className="space-y-6">
                <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <div className="mt-2 text-sm text-red-700">
                                {taskResult.message || 'Failed to load task'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const task = taskResult.data;

    // Get project info for permissions
    let hasManagePermission = false;
    let projectName = '';
    let projectMembers = [];

    if (task.project) {
        const projectResult = await getDetailAction(task.project);
        if (projectResult.ok) {
            const project = projectResult.data;
            projectName = project.name;
            hasManagePermission = canManageProject(project, user.externalUserId);
            projectMembers = project.team?.members || [];
        }
    }

    // Load users for subtask creation
    const usersResult = await listForPicker();
    const users = usersResult.ok ? usersResult.data : [];

    // If this is a subtask, load parent task to get parent assignee
    let parentTask = null;
    if (task.parentTask) {
        const parentResult = await getTaskDetail(task.parentTask);
        if (parentResult.ok) {
            parentTask = parentResult.data;
        }
    }

    // If this is a parent task, load subtasks for notifications
    let subtasks = [];
    if (!task.parentTask) {
        const { listSubtasks } = await import('@/data/task/actions/subtasks.server');
        const subtasksResult = await listSubtasks(task._id);
        if (subtasksResult.ok) {
            subtasks = subtasksResult.data || [];
        }
    }

    // TODO: Replace with actual data loaders when available
    const workTypes = [
        { _id: '1', name: 'Design', code: 'design' },
        { _id: '2', name: 'Development', code: 'dev' },
        { _id: '3', name: 'Content', code: 'content' },
        { _id: '4', name: 'QA', code: 'qa' },
    ];
    const platforms = [
        { _id: '1', name: 'Facebook', code: 'facebook' },
        { _id: '2', name: 'Instagram', code: 'instagram' },
        { _id: '3', name: 'TikTok', code: 'tiktok' },
        { _id: '4', name: 'Website', code: 'website' },
    ];

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
                {task.project && (
                    <>
                        <Link
                            href={`/projects/${task.project}`}
                            className="hover:text-indigo-600 flex items-center gap-1"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {projectName || 'Back to Project'}
                        </Link>
                        <span>/</span>
                    </>
                )}
                <span className="text-gray-900">Task Detail</span>
            </div>

            {/* Task Detail */}
            <TaskDetail 
                task={task}
                parentTask={parentTask}
                projectName={projectName}
                canManage={hasManagePermission}
                currentUser={user}
                users={users}
                projectMembers={projectMembers}
                workTypes={workTypes}
                platforms={platforms}
                subtasks={subtasks}
            />
        </div>
    );
}