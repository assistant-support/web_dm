// components/tasks/TaskBoard.client.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TaskToolbar from './TaskToolbar';
import TaskList from './TaskList.client';
import KanbanBoard from './KanbanBoard';
import CalendarView from './CalendarView';
import GanttView from './GanttView.client';
import CreateTaskDialog from './CreateTaskDialog.client';
import { Plus } from 'lucide-react';

/**
 * TaskBoard - Wrapper component with multi-view toggle and create task
 */
export default function TaskBoard({
    projectId,
    canManage,
    currentUserId,
    initialTasks,
    projectMembers = [],
    users = []
}) {
    const router = useRouter();
    const [view, setView] = useState('list'); // 'list', 'kanban', 'calendar', 'gantt'
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [tasks, setTasks] = useState(initialTasks);

    // Sync tasks với initialTasks khi server refresh
    useEffect(() => {
        setTasks(initialTasks);
    }, [initialTasks]);

    const handleTaskCreated = async (newTask) => {
        // Refresh từ server để lấy data mới nhất
        router.refresh();
    };

    const handleTaskUpdated = async (updatedTask) => {
        // Refresh từ server để lấy data mới nhất
        router.refresh();
    };
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Quản lý công việc trong dự án
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateDialog(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Tạo nhiệm vụ</span>
                </button>
            </div>
            <TaskList
                projectId={projectId}
                canManage={canManage}
                currentUserId={currentUserId}
                initialTasks={tasks}
                users={users}
                projectMembers={projectMembers}
                onTaskUpdated={handleTaskUpdated}
            />
            {/* Create Task Dialog */}
            {showCreateDialog && (
                <CreateTaskDialog
                    open={showCreateDialog}
                    onClose={() => setShowCreateDialog(false)}
                    projectId={projectId}
                    currentUserId={currentUserId}
                    projectMembers={projectMembers}
                    users={users}
                    canManage={canManage}
                    onSuccess={handleTaskCreated}
                />
            )}
        </div>
    );
}
