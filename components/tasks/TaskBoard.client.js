/**
 * @file components/tasks/TaskBoard.client.js
 * @description The main client component for the interactive Kanban board.
 * Manages DND context and renders task columns and cards.
 */
'use client';

import { DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useTaskBoard } from '@/hooks/task-board.hook';
import TaskColumn from './KanbanColumn';
import TaskCard from './KanbanCard';
import { createPortal } from 'react-dom';

export default function TaskBoard({ initialProject, initialTasks }) {
    const {
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        columns,
        tasks,
        activeTask,
    } = useTaskBoard(initialProject, initialTasks);

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full gap-4 overflow-x-auto">
                <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                    {columns.map(col => (
                        <TaskColumn
                            key={col.id}
                            column={col}
                            tasks={tasks.filter(task => task.status === col.id)}
                        />
                    ))}
                </SortableContext>
            </div>

            {createPortal(
                <DragOverlay>
                    {activeTask && <TaskCard task={activeTask} isOverlay />}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
