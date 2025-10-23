// components/tasks/TaskList.client.js
// Mục đích: Hiển thị danh sách tasks (div-based) dạng list, hỗ trợ expand/collapse subtasks.

'use client';

import { useRouter } from 'next/navigation';
import TaskItem from './TaskItem.client'; // <-- Import component mới
import { ListTodo } from 'lucide-react';
import { useTaskBoardActions } from '@/hooks/task-board.hook'; // Hook actions vẫn cần thiết

/**
 * TaskList - List view (Dumb component, div-based)
 * @param {Object} props
 * @param {Array} props.initialTasks - Mảng tasks đã được lọc từ component cha
 * @param {Array} props.users - Danh sách users để chọn assignee
 * @param {Array} props.projectMembers - Danh sách members của project
 * @param {Array} props.workTypes - Danh sách loại công việc
 * @param {Array} props.platforms - Danh sách platforms
 * @param {string} props.currentUserId - ID của user hiện tại
 * @param {boolean} props.canManage - Có quyền manage không
 */
export default function TaskList({ 
    initialTasks = [], 
    users = [], 
    projectMembers = [],
    workTypes = [],
    platforms = [],
    currentUserId = '',
    canManage = false 
}) {
    const router = useRouter();
    // Lấy các actions từ hook để truyền xuống TaskItem nếu cần
    const taskActions = useTaskBoardActions();

    const totalTasks = initialTasks.length;

    // --- Render ---

    // Trạng thái rỗng
    if (totalTasks === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg">
                <ListTodo className="mx-auto h-12 w-12 text-muted-300" />
                <h3 className="mt-2 text-sm font-medium text-heading">
                    Không tìm thấy nhiệm vụ
                </h3>
                <p className="mt-1 text-sm text-muted">
                    Thử thay đổi bộ lọc của bạn hoặc tạo một nhiệm vụ mới.
                </p>
            </div>
        );
    }

    // Hiển thị danh sách tasks
    return (
        <div className="space-y-2">
            {initialTasks.map((task) => (
                <TaskItem
                    key={task._id}
                    task={task}
                    users={users}
                    projectMembers={projectMembers}
                    workTypes={workTypes}
                    platforms={platforms}
                    currentUserId={currentUserId}
                    canManage={canManage}
                    // Truyền các actions cần thiết xuống TaskItem
                    actions={taskActions}
                    // Truyền router refresh nếu TaskItem cần trigger refresh sau action
                    onRefresh={router.refresh}
                />
            ))}
        </div>
    );
}