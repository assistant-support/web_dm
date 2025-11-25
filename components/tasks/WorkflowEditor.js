// components/tasks/WorkflowEditor.js
// Server entrypoint for the workflow editor with prefetching and data shaping

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUser } from '@/lib/request-user.js';
import { getTaskDetail } from '@/data/task/actions/server.js';
import { listSubtasks } from '@/data/task/actions/subtasks.server.js';
import { getTaskWorkflow } from '@/data/workflow/actions/server.js';
import { listForPicker } from '@/data/appUser/actions.js';
import { getDetailAction } from '@/data/project/actions/server.js';
import { canManageProject } from '@/lib/permissions.js';

const WorkflowEditorCanvas = dynamic(
    () => import('./WorkflowEditorCanvas.client.js'),
    {
        loading: () => (
            <div className="flex-1 flex items-center justify-center p-8 text-sm text-gray-500">
                Đang tải Workflow Editor...
            </div>
        ),
    },
);

const mapNodeType = (type = '') => {
    const typeMapping = {
        subtask: 'task',
    };
    return typeMapping[type] || type;
};

const mapNodeStatus = (status = '') => {
    const statusMapping = {
        draft: 'in_progress',
    };
    return statusMapping[status] || status;
};

function buildInitialNodes({ workflow, subtasks }) {
    if (workflow?.nodes?.length) {
        return workflow.nodes
            .filter((node) => node.type !== 'parent')
            .map((node) => ({
                key: String(node.key || node.id || node._id || ''),
                type: mapNodeType(node.type),
                label: node.label || '',
                x: Number(node.x ?? 0),
                y: Number(node.y ?? 0),
                task: node.task ? String(node.task) : null,
                status: mapNodeStatus(node.status),
            }));
    }

    return subtasks.map((sub, idx) => ({
        key: `subtask-${String(sub._id)}`,
        type: mapNodeType('subtask'),
        label: sub.title || '',
        x: 100 + (idx % 3) * 250,
        y: 100 + Math.floor(idx / 3) * 150,
        task: String(sub._id),
        status: mapNodeStatus(sub.status),
    }));
}

function buildInitialEdges({ workflow, taskId }) {
    if (!workflow?.edges?.length) {
        return [];
    }
    const parentKey = `task-${taskId}`;
    return workflow.edges
        .filter((edge) => edge.from !== parentKey && edge.to !== parentKey)
        .map((edge) => ({
            from: String(edge.from),
            to: String(edge.to),
            label: edge.label || '',
        }));
}

function extractId(value) {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        if (value._id) return String(value._id);
        if (value.id) return String(value.id);
        if (value.$oid) return String(value.$oid);
    }
    return null;
}

function extractProjectId(project) {
    if (!project) return null;
    if (typeof project === 'string') return project;
    if (typeof project === 'object' && project !== null) {
        if (project._id) return String(project._id);
        if (project.$oid) return String(project.$oid);
    }
    return null;
}

function serializeTask(task) {
    if (!task) return null;
    const clone = JSON.parse(JSON.stringify(task));
    return {
        ...clone,
        _id: String(clone._id),
        project: extractProjectId(clone.project) || clone.project,
    };
}

export default async function WorkflowEditor({ taskId }) {
    if (!taskId) {
        notFound();
    }

    const user = await getCurrentUser();
    if (!user?.externalUserId) {
        redirect('/auth/login');
    }

    const taskResult = await getTaskDetail(taskId);
    if (!taskResult.ok || !taskResult.data) {
        notFound();
    }
    const task = taskResult.data;

    const parentTaskId = extractId(task.parentTask);
    if (parentTaskId) {
        redirect(`/tasks/${parentTaskId}/workflow`);
    }

    const projectId = extractProjectId(task.project);
    let canManage = false;
    if (projectId) {
        const projectResult = await getDetailAction(projectId);
        if (projectResult.ok && projectResult.data) {
            canManage = await canManageProject(
                projectResult.data,
                user.externalUserId,
            );
        }
    }

    const assigneeExternalId =
        typeof task.assignee === 'object'
            ? task.assignee?.externalUserId || task.assignee?.userId || extractId(task.assignee)
            : task.assignee;

    if (assigneeExternalId) {
        canManage =
            canManage || String(assigneeExternalId) === String(user.externalUserId);
    }

    if (!canManage) {
        redirect(`/tasks/${taskId}`);
    }

    const [subtasksResult, workflowResult, usersResult] = await Promise.all([
        listSubtasks(taskId),
        getTaskWorkflow(taskId),
        listForPicker(),
    ]);

    const subtasks = subtasksResult.ok && Array.isArray(subtasksResult.data)
        ? subtasksResult.data
        : [];
    const workflow = workflowResult.ok ? workflowResult.data : null;
    const users = usersResult.ok && Array.isArray(usersResult.data?.items)
        ? usersResult.data.items
        : [];

    // Prepare full user details for client components (allUsersWithDetails)
    const allUsersWithDetails = Array.isArray(users)
        ? users.map(u => ({
            id: u.value,
            name: u.name,
            email: u.email,
            avatarUrl: u.avatar,
            label: u.label,
            jobTitle: u.jobTitle,
            color: u.color,
        }))
        : [];

    const initialNodes = buildInitialNodes({ workflow, subtasks });
    const initialEdges = buildInitialEdges({ workflow, taskId });

    const workTypes = [
        { _id: '1', name: 'Thiết kế', code: 'design' },
        { _id: '2', name: 'Phát triển', code: 'development' },
        { _id: '3', name: 'Kiểm thử', code: 'testing' },
        { _id: '4', name: 'Triển khai', code: 'deployment' },
    ];

    const taskForClient = serializeTask(task);

    return (
        <div className="bg-gray-50 w-full h-full flex flex-col">
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

            <WorkflowEditorCanvas
                task={taskForClient}
                users={users}
                allUsersWithDetails={allUsersWithDetails}
                initialNodes={initialNodes}
                initialEdges={initialEdges}
                workflowId={workflow?._id ? String(workflow._id) : null}
                workTypes={workTypes}
                subtasksCount={subtasks.length}
            />
        </div>
    );
}
