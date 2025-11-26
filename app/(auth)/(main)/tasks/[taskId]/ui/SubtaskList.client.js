// app/(auth)/(main)/tasks/[taskId]/ui/SubtaskList.client.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListTodo, PlusCircle } from 'lucide-react';
import TaskList from '@/components/tasks/TaskList.client';
import CreateSubtaskDialog from '@/components/tasks/CreateSubtaskDialog.client';
import Button from '@/components/ui/button';

export default function SubtaskList({
    parentTask,
    subtasks = [],
    currentUser,
    canManage,
    canCreateSubtask = false,
    isCreator,
    allUsersWithDetails,
    projectMembers,
    users,
    workTypes,
    platforms,
    isAssignee,
    remainingPoints = null // [NEW]
}) {
    const router = useRouter();
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Determine project active state from parentTask (UI-level)
    const projectActive = (() => {
        const t = parentTask;
        if (!t) return true;
        if (t.project && typeof t.project === 'object' && 'isActive' in t.project) return t.project.isActive;
        if ('projectIsActive' in t) return t.projectIsActive;
        return true;
    })();

    const hasSubtasks = subtasks && subtasks.length > 0;
    const currentUserId = currentUser?.externalUserId;

    const handleSubtaskCreated = (newSubtask) => {
        router.refresh(); // Refresh để lấy danh sách subtask mới nhất
        setShowCreateDialog(false);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-md">
            {/* Header: Title và Nút tạo */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-800">
                    Nhiệm vụ con ({subtasks.length})
                </h3>
                {canCreateSubtask && (
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={PlusCircle}
                        onClick={() => {
                            if (!projectActive) return alert('Dự án đã lưu trữ — không thể thêm việc con');
                            setShowCreateDialog(true);
                        }}
                        disabled={!projectActive}
                        title={!projectActive ? 'Dự án đã lưu trữ — không thể thêm việc con' : undefined}
                        className="text-[var(--brand-600)] hover:bg-[var(--brand-50)]"
                    >
                        Thêm việc con
                    </Button>
                )}
            </div>

            {/* Phần thân: Hiển thị TaskList hoặc thông báo rỗng */}
            {/* [SỬA] Bỏ p-4 ở đây vì TaskList thường đã có padding hoặc margin riêng */}
            <div>
                {hasSubtasks ? (
                    <div className="p-4"> {/* Giữ lại padding nếu TaskList không tự cách lề */}
                        <TaskList
                            initialTasks={subtasks}
                            users={users?.items || []}
                            allUsersWithDetails={allUsersWithDetails}
                            workTypes={workTypes}
                            platforms={platforms}
                            currentUserId={currentUserId}
                            canManage={canManage}
                            onTaskUpdated={router.refresh} // Refresh khi subtask được cập nhật
                            // [THAY ĐỔI] Truyền prop để tắt điều hướng
                            disableItemNavigation={true}
                            // [THÊM] Truyền parentTask để TaskList có thể truyền xuống TaskItem
                            parentTask={parentTask}
                        />
                    </div>
                ) : (
                    <div className="text-center py-6 px-4">
                        <ListTodo className="mx-auto h-10 w-10 text-gray-300" />
                        <h3 className="mt-2 text-sm font-medium text-gray-700">
                            Không có nhiệm vụ con
                        </h3>
                        {canCreateSubtask && (
                            <p className="mt-1 text-sm text-gray-500">
                                Nhấn nút &quot;Thêm việc con&quot; để bắt đầu.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Dialog Tạo Subtask */}
            {showCreateDialog && (
                <CreateSubtaskDialog
                    open={showCreateDialog}
                    onClose={() => setShowCreateDialog(false)}
                    parentTask={parentTask}
                    projectMembers={projectMembers}
                    users={users?.items || []} // Đảm bảo truyền mảng users
                    allUsersWithDetails={allUsersWithDetails}
                    workTypes={workTypes}
                    platforms={platforms}
                    currentUserId={currentUserId}
                    onSuccess={handleSubtaskCreated}
                    remainingPoints={remainingPoints} // [NEW]
                    isActive={projectActive}
                />
            )}
        </div>
    );
}