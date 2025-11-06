// components/tasks/TaskList.client.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import TaskItem from './TaskItem.client';
import EditTaskDialog from './EditTaskDialog.client'; // Giả định component tồn tại
import CreateSubtaskDialog from './CreateSubtaskDialog.client'; // Giả định component tồn tại
import CompletedTasksSection from './CompletedTasksSection.client'; // Import component mới
import { ListTodo } from 'lucide-react';
import { useTaskBoardActions } from '@/hooks/task-board.hook'; // Giả định hook tồn tại
import { TASK_STATUS } from '@/model/common/enums'; // Giả định enums tồn tại

export default function TaskList({
    initialTasks = [],
    users = [], // Danh sách rút gọn cho dropdown Assignee trong TaskItem
    allUsersWithDetails = [], // Danh sách đầy đủ chi tiết user (id, name, avatarUrl, email)
    workTypes = [], // Truyền xuống TaskItem/SubtaskListSimple nếu cần
    platforms = [], // Truyền xuống TaskItem/SubtaskListSimple nếu cần
    currentUserId = '',
    canManage = false, // Quyền quản lý chung (có thể không chính xác cho mọi task)
    onTaskUpdated = null, // Callback khi task được cập nhật (qua Edit/Create Subtask)
    // [THÊM] Prop mới để tắt điều hướng khi click vào item
    disableItemNavigation = false,
    parentTask = null // [THÊM] Parent task cho subtask list
}) {
    const router = useRouter();
    const taskActions = useTaskBoardActions();

    // State cho Dialogs
    const [editDialog, setEditDialog] = useState({ open: false, task: null });
    const [createSubtaskDialog, setCreateSubtaskDialog] = useState({ open: false, parentTask: null });

    /**
     * Tách tasks thành: hoạt động + hoàn thành gần đây (<1 ngày) VÀ hoàn thành cũ (>1 ngày).
     */
    const { activeAndRecentTasks, olderCompletedTasks } = useMemo(() => {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const activeTasks = [];
        const recentlyCompletedTasks = [];
        const olderCompletedTasks = [];

        initialTasks.forEach(task => {
            const isCompleted = task.status === TASK_STATUS.COMPLETED;
            if (isCompleted) {
                const completedDate = task.completedAt ? new Date(task.completedAt) : null;
                if (completedDate && completedDate >= oneDayAgo) {
                    recentlyCompletedTasks.push(task);
                } else {
                    olderCompletedTasks.push(task);
                }
            } else {
                activeTasks.push(task);
            }
        });

        const activeAndRecentTasks = [...activeTasks, ...recentlyCompletedTasks];

        return { activeAndRecentTasks, olderCompletedTasks };
    }, [initialTasks]);

    // Handlers cho Dialogs
    const handleEdit = (taskId) => {
        const task = initialTasks.find(t => t._id === taskId);
        if (!task) return;
        setEditDialog({ open: true, task });
    };

    const handleCloseEditDialog = () => {
        setEditDialog({ open: false, task: null });
    };

    const handleAddSubtask = (parentTaskId) => {
        const parentTask = initialTasks.find(t => t._id === parentTaskId);
        if (!parentTask) return;
        setCreateSubtaskDialog({ open: true, parentTask });
    };

    const handleCloseCreateSubtaskDialog = () => {
        setCreateSubtaskDialog({ open: false, parentTask: null });
    };

    // Callback chung khi task được tạo/sửa thành công từ dialog
    const handleSuccess = (updatedOrNewTask) => {
        if (onTaskUpdated) {
            onTaskUpdated(updatedOrNewTask); // Gọi callback được truyền từ parent
        } else {
            router.refresh(); // Fallback: refresh lại trang nếu không có callback
        }
        handleCloseEditDialog(); // Đảm bảo đóng dialog edit
        handleCloseCreateSubtaskDialog(); // Đảm bảo đóng dialog tạo subtask
    };

    // useEffect để cập nhật dữ liệu task trong dialog nếu `initialTasks` thay đổi
    useEffect(() => {
        if (editDialog.open && editDialog.task) {
            const updatedTask = initialTasks.find(t => t._id === editDialog.task._id);
            if (updatedTask && JSON.stringify(updatedTask) !== JSON.stringify(editDialog.task)) {
                setEditDialog(prev => ({ ...prev, task: updatedTask }));
            }
        }
    }, [initialTasks, editDialog.open, editDialog.task]);

    useEffect(() => {
        if (createSubtaskDialog.open && createSubtaskDialog.parentTask) {
            const updatedParentTask = initialTasks.find(t => t._id === createSubtaskDialog.parentTask._id);
            if (updatedParentTask && JSON.stringify(updatedParentTask) !== JSON.stringify(createSubtaskDialog.parentTask)) {
                setCreateSubtaskDialog(prev => ({ ...prev, parentTask: updatedParentTask }));
            }
        }
    }, [initialTasks, createSubtaskDialog.open, createSubtaskDialog.parentTask]);

    // Gộp các actions từ hook và các handlers mở dialog
    const extendedActions = {
        ...taskActions, // Bao gồm onAssign, onUpdateStatus, onDelete (nếu hook cung cấp)
        onEdit: handleEdit,
        onAddSubtask: handleAddSubtask,
    };

    // Trạng thái rỗng
    if (activeAndRecentTasks.length === 0 && olderCompletedTasks.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg">
                <ListTodo className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-700">
                    Không tìm thấy nhiệm vụ
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                    Thử thay đổi bộ lọc của bạn hoặc tạo một nhiệm vụ mới.
                </p>
            </div>
        );
    }

    return (
        <>
            {/* Render danh sách task hoạt động và hoàn thành gần đây */}
            <div className="space-y-2">
                {activeAndRecentTasks.map((task) => {
                    // Lấy project members từ task nếu có
                    const projectMembersForTask = task.projectMembers || [];
                    // Xác định quyền quản lý cho task cụ thể này
                    const member = projectMembersForTask.find(m => String(m.userId) === String(currentUserId));
                    let canManageTask = member && (member.role === 'owner' || member.role === 'manager');
                    // Nếu không tìm thấy member trong projectMembers của task (VD: subtask không có), dùng quyền chung
                    if (member === undefined) {
                        canManageTask = canManage
                    }

                    return (
                        <TaskItem
                            key={task._id}
                            task={task}
                            users={users} // Dùng cho dropdown assignee
                            allUsersWithDetails={allUsersWithDetails} // Dùng cho avatar group
                            projectMembers={projectMembersForTask} // Truyền members cụ thể của project này (có thể rỗng)
                            workTypes={workTypes}
                            platforms={platforms}
                            currentUserId={currentUserId}
                            canManage={canManageTask} // Truyền quyền quản lý cụ thể
                            actions={extendedActions} // Truyền các hàm actions
                            onRefresh={onTaskUpdated ? onTaskUpdated : router.refresh} // Ưu tiên callback, fallback refresh
                            // [THAY ĐỔI] Truyền prop disableNavigation xuống TaskItem
                            disableNavigation={disableItemNavigation}
                            // [THÊM] Props cho subtask
                            isSubtask={!!parentTask}
                            parentTaskAssignee={parentTask?.assignee || null}
                        />
                    );
                })}
            </div>

            {/* Render khu vực task hoàn thành cũ */}
            <CompletedTasksSection
                tasks={olderCompletedTasks}
                users={users}
                allUsersWithDetails={allUsersWithDetails}
                workTypes={workTypes}
                platforms={platforms}
                currentUserId={currentUserId}
                canManage={canManage} // Quyền quản lý chung có thể đủ cho việc xem task cũ
                actions={extendedActions}
                onRefresh={onTaskUpdated ? onTaskUpdated : router.refresh}
                // [THAY ĐỔI] Truyền prop disableNavigation xuống TaskItem trong CompletedTasksSection
                disableItemNavigation={disableItemNavigation}
                // [THÊM] Truyền parentTask cho subtask
                parentTask={parentTask}
            />

            {/* Dialog Sửa Task */}
            {editDialog.task && (
                <EditTaskDialog
                    open={editDialog.open}
                    onClose={handleCloseEditDialog}
                    mode='edit'
                    task={editDialog.task}
                    users={users}
                    projectMembers={editDialog.task.projectMembers || []}
                    workTypes={workTypes}
                    platforms={platforms}
                    onSuccess={handleSuccess}
                />
            )}

            {/* Dialog Tạo Subtask */}
            {createSubtaskDialog.parentTask && (
                <CreateSubtaskDialog
                    open={createSubtaskDialog.open}
                    onClose={handleCloseCreateSubtaskDialog}
                    parentTask={createSubtaskDialog.parentTask}
                    // Lấy projectMembers của task cha để truyền vào đây
                    projectMembers={createSubtaskDialog.parentTask.projectMembers || []}
                    users={users}
                    workTypes={workTypes}
                    platforms={platforms}
                    currentUserId={currentUserId}
                    onSuccess={handleSuccess}
                />
            )}
        </>
    );
}