// app/(auth)/(main)/tasks/[taskId]/page.js
// Mục đích: Trang chi tiết task (SSR) - Đã cập nhật layout cuộn độc lập

import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/request-user.js';
import { canManageProject, getUserId, canCreateSubtask } from '@/lib/permissions.js';
// Actions
import { getTaskDetail, listSubtasks } from '@/data/task/actions';
import { getDetailAction as getProjectDetail } from '@/data/project/actions/server.js';
import { listForPicker } from '@/data/appUser/actions';
import { getTaskWorkflow } from '@/data/workflow/actions/server.js';
import { listByTaskAction, remove as removeComment } from '@/data/comment/actions/server';

// Placeholders
const getWorkTypes = async () => Promise.resolve([]);
const getPlatforms = async () => Promise.resolve([]);

// Components MỚI
import TaskHeader from './ui/TaskHeader.client';
import TaskMainContent from './ui/TaskMainContent.client';
import TaskSidebar from './ui/TaskSidebar';
import { AlertTriangle } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Helper for error display (Giữ nguyên)
const ErrorDisplay = ({ message }) => (
    <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
            <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Lỗi tải dữ liệu</h3>
                <div className="mt-2 text-sm text-red-700">
                    <p>{message || 'Không thể tải chi tiết nhiệm vụ.'}</p>
                </div>
            </div>
        </div>
    </div>
);

export default async function TaskDetailPage({ params }) {
    const { taskId } = await params;
    if (!taskId) return notFound();

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return <ErrorDisplay message="Người dùng chưa được xác thực." />;
    }

    // --- [SỬA] BƯỚC 1: Fetch dữ liệu chính (Task) và các dữ liệu độc lập ---
    const [
        taskResult,
        usersResult,
        workTypes,
        platforms,
        workflowResult,
        commentsResult,
    ] = await Promise.all([
        getTaskDetail(taskId),
        listForPicker(),
        getWorkTypes(),
        getPlatforms(),
        getTaskWorkflow(taskId),
        listByTaskAction({ taskId }),
    ]);

    // --- Handle Task Fetching Error ---
    if (!taskResult.ok) {
        if (taskResult.code === 'NOT_FOUND' || taskResult.message?.includes('NOT_FOUND')) {
            return notFound();
        }
        return <ErrorDisplay message={taskResult.message} />;
    }

    // Đã có task
    const task = JSON.parse(JSON.stringify(taskResult.data));
    const workflow = workflowResult || null;
    const comments = commentsResult.ok ? commentsResult.data : [];

    // Note: Attachments sẽ được fetch bởi AttachmentList component (client-side)


    // --- Standardize User Data (Giữ nguyên) ---
    const allUsersWithDetails = usersResult.ok
        ? usersResult.data.items.map(u => ({
            id: u.value,
            name: u.name,
            email: u.email,
            avatarUrl: u.avatar,
            label: u.label,
            jobTitle: u.jobTitle,
            color: u.color,
        }))
        : [];
    const usersForPickerProp = usersResult.ok ? usersResult.data : { items: [], count: 0 };
    console.log(commentsResult);

    // --- Fetch Parent Task, Subtasks (Sử dụng task đã được populate) ---
    const project = task.project; // Lấy project object
    const team = task.team; // Lấy team object
    let parentTask = null;
    let subtasks = [];

    const parentTaskPromise = task.parentTask?._id
        ? getTaskDetail(task.parentTask._id).then(res => res.ok ? JSON.parse(JSON.stringify(res.data)) : null)
        : Promise.resolve(null);

    const subtasksPromise = !task.parentTask?._id
        ? listSubtasks(task._id).then(res => res.ok ? JSON.parse(JSON.stringify(res.data || [])) : [])
        : Promise.resolve([]);

    const [fetchedParentTask, fetchedSubtasks] = await Promise.all([
        parentTaskPromise,
        subtasksPromise
    ]);

    parentTask = fetchedParentTask;
    subtasks = fetchedSubtasks;

    // --- Calculate Permissions & Prepare Props (Giữ nguyên) ---
    const currentUserId = currentUser.externalUserId;
    const hasManagePermission = project ? canManageProject(project, currentUserId) : false;
    console.log(task,currentUser);
    const isAssignee = getUserId(task.assignee) === currentUserId;
    const isCreator = getUserId(task.createdBy) === currentUserId;
    const canEditTask = hasManagePermission || isCreator;
    
    // Check if user can create subtasks for this task
    const canCreateSubtaskForThisTask = project ? canCreateSubtask(task, project, currentUserId) : false;
    
    const projectName = project?.name || '';
    const projectMembers = team?.members || [];

    // --- Render the Client Component ---
    return (
        <div className="flex flex-col h-full overflow-hidden w-full">
            {/* 1. Header Component */}
            <TaskHeader
                task={task}
                parentTask={parentTask}
                projectName={projectName}
                canManage={hasManagePermission}
                canEditTask={canEditTask}
                isAssignee={isAssignee}
                isCreator={isCreator}
                currentUser={currentUser}
                allUsersWithDetails={allUsersWithDetails}
                projectMembers={projectMembers}
                users={usersForPickerProp}
                workTypes={workTypes}
                platforms={platforms}
                subtasksCount={subtasks.length}
            />
            {/* 2. Main Content & Sidebar */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden pb-6 pt-6 bg-gray-50/50">
                <div className="flex-1 min-w-0 overflow-y-auto h-full custom-scrollbar">
                    <TaskMainContent
                        task={task}
                        subtasks={subtasks}
                        workflow={workflow.data}
                        currentUser={currentUser}
                        canManage={hasManagePermission}
                        canCreateSubtask={canCreateSubtaskForThisTask}
                        isAssignee={isAssignee}
                        isCreator={isCreator}
                        allUsersWithDetails={allUsersWithDetails}
                        projectMembers={projectMembers}
                        users={usersForPickerProp}
                        workTypes={workTypes}
                        platforms={platforms}
                        comments={comments}
                    />
                </div>
                <div className="lg:w-80 xl:w-96 flex-shrink-0 overflow-y-auto h-full custom-scrollbar">
                    <TaskSidebar
                        task={task}
                        allUsersWithDetails={allUsersWithDetails}
                        workTypes={workTypes}
                        platforms={platforms}
                        currentUser={currentUser}
                        canManage={hasManagePermission}
                    />
                </div>
            </div>
        </div>
    );
}