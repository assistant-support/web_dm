// components/tasks/TaskBoard.client.js
'use client';

import { useState } from 'react';
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
export default function TaskBoard({ projectId, canManage, currentUserId, initialTasks, projectMembers = [] }) {
    const router = useRouter();
    const [view, setView] = useState('list'); // 'list', 'kanban', 'calendar', 'gantt'
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [tasks, setTasks] = useState(initialTasks);

    const handleTaskCreated = (newTask) => {
        // Add to local state
        setTasks(prev => [newTask, ...prev]);
        
        // Force refresh from server to get latest data
        router.refresh();
    };

    return (
        <div className="space-y-4">
            {/* Header with Toolbar and Create Button */}
            <div className="flex items-center justify-between">
                <TaskToolbar view={view} onViewChange={setView} />
                
                <button
                    onClick={() => setShowCreateDialog(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Tạo nhiệm vụ</span>
                </button>
            </div>

            {/* Render view tương ứng */}
            {view === 'list' && (
                <TaskList
                    projectId={projectId}
                    canManage={canManage}
                    initialTasks={tasks}
                />
            )}

            {view === 'kanban' && (
                <KanbanBoard tasks={tasks} />
            )}

            {view === 'calendar' && (
                <CalendarView tasks={tasks} />
            )}

            {view === 'gantt' && (
                <GanttView tasks={tasks} />
            )}

            {/* Create Task Dialog */}
            {showCreateDialog && (
                <CreateTaskDialog
                    open={showCreateDialog}
                    onClose={() => setShowCreateDialog(false)}
                    projectId={projectId}
                    currentUserId={currentUserId}
                    projectMembers={projectMembers}
                    canManage={canManage}
                    onSuccess={handleTaskCreated}
                />
            )}
        </div>
    );
}
