// components/tasks/KanbanBoard.js
'use client';

import { useState, useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { updateTask, updateKanbanOrder } from '@/data/task/actions/server';

/**
 * Kanban columns configuration
 */
const COLUMNS = [
    {
        id: 'todo',
        title: 'Cần làm',
        statuses: ['draft', 'pending_approval', 'waiting_confirm'],
    },
    {
        id: 'in_progress',
        title: 'Đang làm',
        statuses: ['in_progress'],
    },
    {
        id: 'review',
        title: 'Chờ review',
        statuses: ['completed_await_review'],
    },
    {
        id: 'completed',
        title: 'Hoàn thành',
        statuses: ['completed', 'rejected', 'cancelled', 'on_hold'],
    },
];

/**
 * Get default status for column
 */
function getDefaultStatusForColumn(columnId) {
    switch (columnId) {
        case 'todo':
            return 'draft';
        case 'in_progress':
            return 'in_progress';
        case 'review':
            return 'completed_await_review';
        case 'completed':
            return 'completed';
        default:
            return 'draft';
    }
}

/**
 * Get column ID from task status
 */
function getColumnIdFromStatus(status) {
    for (const column of COLUMNS) {
        if (column.statuses.includes(status)) {
            return column.id;
        }
    }
    return 'todo'; // Default
}

/**
 * KanbanBoard - Drag and drop Kanban board for tasks
 */
export default function KanbanBoard({ 
    tasks: initialTasks,
    projectId,
    canManage = false,
    currentUserId = '',
    users = [],
    projectMembers = []
}) {
    const [tasks, setTasks] = useState(initialTasks);
    const [activeTask, setActiveTask] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required to start drag
            },
        })
    );

    // Group tasks by column
    const tasksByColumn = useMemo(() => {
        const groups = {};
        COLUMNS.forEach((col) => {
            groups[col.id] = [];
        });

        tasks.forEach((task) => {
            const columnId = getColumnIdFromStatus(task.status);
            groups[columnId].push(task);
        });

        return groups;
    }, [tasks]);

    const handleDragStart = (event) => {
        const { active } = event;
        const task = tasks.find((t) => t._id === active.id);
        setActiveTask(task);
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const activeTask = tasks.find((t) => t._id === activeId);
        if (!activeTask) return;

        // Determine if dropping on a column or a task
        const overData = over.data.current;
        const isOverColumn = overData?.type === 'column';
        const isOverTask = overData?.type === 'task';

        if (isOverColumn) {
            // Moving to a different column
            const newColumnId = overId;
            const oldColumnId = getColumnIdFromStatus(activeTask.status);

            if (newColumnId !== oldColumnId) {
                const newStatus = getDefaultStatusForColumn(newColumnId);

                setTasks((prevTasks) => {
                    return prevTasks.map((task) => {
                        if (task._id === activeId) {
                            return { ...task, status: newStatus };
                        }
                        return task;
                    });
                });

                // Update on server (silent - no loading indicator)
                updateTask(activeId, { status: newStatus }).catch((err) => {
                    console.error('Failed to update task status:', err);
                    // Revert on error
                    setTasks((prevTasks) => {
                        return prevTasks.map((task) => {
                            if (task._id === activeId) {
                                return { ...task, status: activeTask.status };
                            }
                            return task;
                        });
                    });
                });
            }
        } else if (isOverTask) {
            // Reordering within column or moving to another column
            const overTask = overData.task;
            const activeColumnId = getColumnIdFromStatus(activeTask.status);
            const overColumnId = getColumnIdFromStatus(overTask.status);

            if (activeColumnId !== overColumnId) {
                // Moving to different column
                const newStatus = overTask.status;

                setTasks((prevTasks) => {
                    return prevTasks.map((task) => {
                        if (task._id === activeId) {
                            return { ...task, status: newStatus };
                        }
                        return task;
                    });
                });

                // Update on server (silent - no loading indicator)
                updateTask(activeId, { status: newStatus }).catch((err) => {
                    console.error('Failed to update task status:', err);
                    // Revert on error
                    setTasks((prevTasks) => {
                        return prevTasks.map((task) => {
                            if (task._id === activeId) {
                                return { ...task, status: activeTask.status };
                            }
                            return task;
                        });
                    });
                });
            } else {
                // Reordering within same column
                setTasks((prevTasks) => {
                    const oldIndex = prevTasks.findIndex((t) => t._id === activeId);
                    const newIndex = prevTasks.findIndex((t) => t._id === overId);
                    const newTasks = arrayMove(prevTasks, oldIndex, newIndex);

                    // Update kanbanOrder on server
                    const taskIds = newTasks.map(t => t._id);
                    updateKanbanOrder(taskIds).catch((err) => {
                        console.error('Failed to update kanban order:', err);
                    });

                    return newTasks;
                });
            }
        }
    };

    const handleDragEnd = () => {
        setActiveTask(null);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto pb-4">
                {COLUMNS.map((column) => (
                    <KanbanColumn
                        key={column.id}
                        column={column}
                        tasks={tasksByColumn[column.id] || []}
                        projectId={projectId}
                        canManage={canManage}
                        currentUserId={currentUserId}
                        users={users}
                        projectMembers={projectMembers}
                    />
                ))}
            </div>

            {/* Drag overlay */}
            <DragOverlay>
                {activeTask ? (
                    <div className="opacity-80">
                        <KanbanCard task={activeTask} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

