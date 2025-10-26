// app/(auth)/(main)/tasks/[taskId]/workflow/page.js
// Workflow Editor Page - Drag & drop subtasks to create workflow

import { notFound, redirect } from 'next/navigation';
import { getTaskDetail } from '@/data/task/actions/server.js';
import { listSubtasks } from '@/data/task/actions/subtasks.server.js';
import { getTaskWorkflow } from '@/data/workflow/actions/server.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { getDetailAction } from '@/data/project/actions/server.js';
import { canManageProject } from '@/lib/permissions.js';
import { listForPicker } from '@/data/appUser/actions';
import WorkflowEditor from '@/components/tasks/WorkflowEditor.client.js';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function WorkflowEditorPage({ params }) {
    const { taskId } = await params;
    if (!taskId) return notFound();

    const user = await getCurrentUser();

    // Get task
    const taskResult = await getTaskDetail(taskId);
    console.log(taskResult);
    
    if (!taskResult.ok) return notFound();
    const task = taskResult.data;

    // Must be parent task (not subtask)
    if (task.parentTask) {
        redirect(`/tasks/${task.parentTask}/workflow`);
    }

    // Check permissions
    let canManage = false;
    // Ensure projectId is a string before validation
    const projectId = typeof task.project === 'object' ? String(task.project.$oid) : task.project;
    const projectResult = await getDetailAction(projectId);
    if (projectResult.ok) {
        canManage = canManageProject(projectResult.data, user.externalUserId);
    }
    canManage = task.assignee.externalUserId == user.externalUserId || canManage;
    // Must have manage permission
    if (!canManage) {
        redirect(`/tasks/${taskId}`);
    }

    // Load subtasks
    const subtasksResult = await listSubtasks(taskId);
    const subtasks = subtasksResult.ok ? subtasksResult.data : [];

    // Load existing workflow (if any)
    const workflowResult = await getTaskWorkflow(taskId);
    const workflow = workflowResult.ok ? workflowResult.data : null;

    // Load users for assignment
    const usersResult = await listForPicker();
    const users = usersResult.ok ? usersResult.data : [];

    // Work types (hardcoded for now)
    const workTypes = [
        { _id: '1', name: 'Thiết kế', code: 'design' },
        { _id: '2', name: 'Phát triển', code: 'development' },
        { _id: '3', name: 'Kiểm thử', code: 'testing' },
        { _id: '4', name: 'Triển khai', code: 'deployment' },
    ];

    return (
        <div className="bg-gray-50 w-full h-full flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link
                                href={`/tasks/${taskId}`}
                                className="text-gray-600 hover:text-gray-900"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">
                                    Workflow Editor
                                </h1>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {task.title}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                                {subtasks.length} subtasks
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Editor */}
            <WorkflowEditor
                task={task}
                subtasks={subtasks}
                workflow={workflow}
                users={users}
                workTypes={workTypes}
            />
        </div>
    );
}
