// components/tasks/KanbanColumn.js
'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';

/**
 * KanbanColumn - Droppable column for Kanban board
 */
export default function KanbanColumn({ 
    column, 
    tasks,
    projectId,
    canManage = false,
    currentUserId = '',
    users = [],
    projectMembers = []
}) {
    const { setNodeRef } = useDroppable({
        id: column.id,
        data: {
            type: 'column',
            column,
        },
    });

    const taskIds = tasks.map(t => t._id);

    const getColumnColor = (id) => {
        switch (id) {
            case 'todo':
                return 'bg-gray-50 border-gray-300';
            case 'in_progress':
                return 'bg-blue-50 border-blue-300';
            case 'review':
                return 'bg-yellow-50 border-yellow-300';
            case 'completed':
                return 'bg-green-50 border-green-300';
            default:
                return 'bg-gray-50 border-gray-300';
        }
    };

    return (
        <div className="flex flex-col flex-shrink-0 w-80">
            {/* Column header */}
            <div className={`p-3 rounded-t-lg border-t border-l border-r ${getColumnColor(column.id)}`}>
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-gray-900">
                        {column.title}
                    </h3>
                    <span className="text-xs font-medium text-gray-600 bg-white px-2 py-0.5 rounded">
                        {tasks.length}
                    </span>
                </div>
            </div>

            {/* Droppable area */}
            <div
                ref={setNodeRef}
                className={`flex-1 p-3 border-l border-r border-b rounded-b-lg min-h-[200px] ${getColumnColor(column.id)}`}
            >
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    {tasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            Kéo thả task vào đây
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {tasks.map((task) => (
                                <KanbanCard 
                                    key={task._id} 
                                    task={task}
                                    projectId={projectId}
                                    canManage={canManage}
                                    currentUserId={currentUserId}
                                    users={users}
                                    projectMembers={projectMembers}
                                />
                            ))}
                        </div>
                    )}
                </SortableContext>
            </div>
        </div>
    );
}
