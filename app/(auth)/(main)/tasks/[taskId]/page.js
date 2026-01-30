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
import UserInfoBadge from '@/components/ui/UserInfoBadge.client'; // [NEW] Component hiển thị thông tin user

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
    
    // [DEBUG] Log thông tin tài khoản và quyền
    console.log('[TASK DETAIL PAGE]', {
        userId: currentUser.externalUserId,
        userName: currentUser.name || currentUser.email || 'Unknown',
        userRole: currentUser.role || 'member',
        taskId: taskId,
        isAdmin: currentUser.role === 'admin'
    });

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

    // [NEW] Fetch siblings if parent exists (để tính giới hạn điểm khi duyệt)
    const siblingsPromise = task.parentTask?._id
        ? listSubtasks(task.parentTask._id).then(res => res.ok ? JSON.parse(JSON.stringify(res.data || [])) : [])
        : Promise.resolve([]);

    const [fetchedParentTask, fetchedSubtasks, fetchedSiblings] = await Promise.all([
        parentTaskPromise,
        subtasksPromise,
        siblingsPromise
    ]);

    parentTask = fetchedParentTask;
    subtasks = fetchedSubtasks;
    const siblings = fetchedSiblings;

    // [NEW] Tính toán giới hạn điểm
    // 1. Max Points cho task hiện tại (khi duyệt hoàn thành) - Chỉ áp dụng nếu là subtask
    let maxPointsForApproval = null;
    if (parentTask) {
        const parentTotal = parentTask.initialPoints || 0;
        const otherSiblingsPoints = siblings
            .filter(s => s._id !== task._id)
            .reduce((sum, s) => {
                const p = (s.status === 'COMPLETED' || s.status === 'COMPLETED_AWAIT_REVIEW')
                    ? (s.finalPoints ?? s.initialPoints ?? 0)
                    : (s.initialPoints ?? 0);
                return sum + p;
            }, 0);
        maxPointsForApproval = Math.max(0, parentTotal - otherSiblingsPoints);
    }

    // 2. Remaining Points cho việc tạo subtask mới (nếu task hiện tại là cha)
    let remainingPointsForCreation = null;
    if (!task.parentTask?._id) {
        const thisTaskTotal = task.initialPoints || 0;
        const currentSubtasksPoints = subtasks.reduce((sum, s) => {
            const p = (s.status === 'COMPLETED' || s.status === 'COMPLETED_AWAIT_REVIEW')
                ? (s.finalPoints ?? s.initialPoints ?? 0)
                : (s.initialPoints ?? 0);
            return sum + p;
        }, 0);
        remainingPointsForCreation = Math.max(0, thisTaskTotal - currentSubtasksPoints);
    }

    // --- Calculate Permissions & Prepare Props (Giữ nguyên) ---
    const currentUserId = currentUser.externalUserId;
    const isAdmin = currentUser.role === 'admin'; // [NEW] Kiểm tra quyền admin
    // Admin luôn có quyền quản lý project
    const hasManagePermission = project ? canManageProject(project, isAdmin ? currentUser : currentUserId) : false;
    
    const isAssignee = getUserId(task.assignee) === currentUserId;
    const isCreator = getUserId(task.createdBy) === currentUserId;
    const canEditTask = isAdmin || hasManagePermission || isCreator;

    // Check if user can create subtasks for this task
    const canCreateSubtaskForThisTask = project ? canCreateSubtask(task, project, isAdmin ? currentUser : currentUserId) : false;

    const projectName = project?.name || '';
    const projectMembers = team?.members || [];

    // --- Render the Client Component ---
    return (
        <div className="flex-1 min-h-0 flex flex-col w-full gap-4 overflow-y-auto min-[1600px]:overflow-hidden">
            {/* [NEW] Hiển thị thông tin tài khoản và quyền */}
            <UserInfoBadge
                userName={currentUser.name || currentUser.email || 'Unknown'}
                userRole={isAdmin ? 'admin' : (currentUser.role || 'member')}
                userId={currentUserId}
            />
            
            {/* 1. Header Component */}
            <div className="flex-shrink-0">
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
                    maxPoints={maxPointsForApproval}
                    isAdmin={isAdmin} // [NEW] Truyền quyền admin
                />
            </div>
            {/* 2. Main Content & Sidebar */}
            <div className="flex-1 flex flex-col min-[1600px]:flex-row gap-4 bg-gray-50/50 h-fit min-[1600px]:h-full min-[1600px]:overflow-hidden">

                {/* CỘT 1: Main Content */}
                {/* - Mobile: h-fit (dài tự nhiên), bỏ overflow, bỏ flex-1 (để không ép height) */}
                {/* - Desktop: flex-1, h-full, overflow-y-auto (để cuộn riêng), min-h-0 */}
                <div className="w-full h-fit min-[1600px]:flex-1 min-[1600px]:h-full min-[1600px]:min-h-0 min-[1600px]:overflow-y-auto custom-scrollbar min-[1600px]:p-0">
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
                        isAdmin={isAdmin} // [NEW] Truyền quyền admin
                        remainingPoints={remainingPointsForCreation}
                    />
                </div>

                {/* CỘT 2: Sidebar */}
                {/* - Mobile: h-fit (dài tự nhiên), w-full */}
                {/* - Desktop: h-full, w-96, overflow-y-auto */}
                <div className="w-full h-fit min-[1600px]:w-96 min-[1600px]:h-full flex-shrink-0 min-[1600px]:overflow-y-auto custom-scrollbar min-[1600px]:px-0">
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