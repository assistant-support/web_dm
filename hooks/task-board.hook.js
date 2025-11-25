/**
 * @file hooks/task-board.hook.js
 * @description Core logic for the Kanban board, including DND handlers and state management.
 * Implements optimistic updates and calls server actions on drag end.
 * Also exports a helper hook for task actions used in list views.
 */
'use client';

import { useState, useMemo, useTransition } from 'react';
import { useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { updateTaskStatus, updateTask, deleteTask } from '@/actions/task.actions';
import { useRouter } from 'next/navigation';
import { updateTaskStatus as serverUpdateTaskStatus } from '@/data/task/actions/server.js';
import { assignTask } from '@/data/task/actions/server.js';

/**
 * Hook for Kanban board with drag-and-drop functionality.
 */
export function useTaskBoard(initialProject = {}, initialTasks = []) {
    const [tasks, setTasks] = useState(initialTasks);
    const [activeTask, setActiveTask] = useState(null);
    const [isPending, startTransition] = useTransition();

    const columns = useMemo(() => {
        const statuses = initialProject?.statuses || ['todo', 'inprogress', 'done'];
        return statuses.map(status => ({ id: status, title: status }));
    }, [initialProject?.statuses]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const handleDragStart = (event) => {
        const { active } = event;
        setActiveTask(tasks.find(t => t._id === active.id) || null);
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const isActiveATask = active.data.current?.type === 'Task';
        const isOverAColumn = over.data.current?.type === 'Column';

        if (isActiveATask && isOverAColumn) {
            setTasks(prev => {
                const activeIndex = prev.findIndex(t => t._id === active.id);
                if (prev[activeIndex].status !== over.id) {
                    prev[activeIndex].status = over.id;
                    return arrayMove(prev, activeIndex, activeIndex);
                }
                return prev;
            });
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            setActiveTask(null);
            return;
        }

        const originalTask = tasks.find(t => t._id === active.id);
        const newStatus = over.data.current?.type === 'Column' ? over.id : over.data.current?.task.status;
        
        // Create a new sorted array for optimistic update
        const newTasks = [...tasks];
        const activeIndex = newTasks.findIndex(t => t._id === active.id);
        const overIndex = newTasks.findIndex(t => t._id === over.id);

        // Update status and perform optimistic reordering
        newTasks[activeIndex].status = newStatus;
        const reorderedTasks = arrayMove(newTasks, activeIndex, overIndex);
        
        // Final tasks for the new column to determine the order
        const tasksInNewColumn = reorderedTasks.filter(t => t.status === newStatus);
        const finalIndexInColumn = tasksInNewColumn.findIndex(t => t._id === active.id);

        // --- OPTIMISTIC UPDATE ---
        // Update the local state immediately for a smooth user experience.
        setTasks(reorderedTasks);
        setActiveTask(null);

        // --- SERVER ACTION ---
        // Fire and forget the server action inside a transition.
        // The UI is already updated. The server will catch up.
        // RevalidateTag will ensure data consistency if the user reloads or another user makes a change.
        startTransition(() => {
            updateTaskStatus(active.id, {
                status: newStatus,
                order: finalIndexInColumn, // Send the new order to the server
            });
        });
    };

    return {
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        columns,
        tasks,
        activeTask,
    };
}

/**
 * Hook that provides task action handlers for list/calendar views.
 * These actions call server actions with optimistic updates.
 * 
 * ✅ FIX: Changed onUpdateStatus to use serverUpdateTaskStatus instead of updateTask
 * - serverUpdateTaskStatus: Allows any project member to update status
 * - updateTask: Only allows PM to update (causes 403 for regular members)
 */
export function useTaskBoardActions() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const onAssign = async (taskId, assigneeId) => {
        startTransition(async () => {
            try {
                // Use assignTask server action which handles permissive assignment
                const result = await assignTask(taskId, assigneeId);
                if (result && result.ok === false) {
                    console.error('Failed to assign task:', result.message || result.error);
                }
            } catch (err) {
                console.error('Failed to assign task:', err);
            }
            router.refresh();
        });
    };

    /**
     * ✅ FIXED: Use serverUpdateTaskStatus for status updates
     * This function allows any project member to update task status,
     * while updateTask requires PM permission.
     */
    const onUpdateStatus = async (taskId, newStatus) => {
        try {
            // Call the correct server action that allows members to update status
            const result = await serverUpdateTaskStatus(taskId, newStatus);
            
            // Check if result indicates failure
            if (result && result.ok === false) {
                console.error('Failed to update status:', result.message || result.error);
                throw new Error(result.message || 'Cập nhật trạng thái thất bại');
            }
            
            // Refresh to show updated data
            router.refresh();
            return result;
        } catch (error) {
            console.error('Error in onUpdateStatus:', error);
            // Re-throw to allow useAsyncNotifier to catch and display error
            throw {
                ok: false,
                message: error.message || 'Không thể cập nhật trạng thái task',
                code: error.code || 'UPDATE_STATUS_ERROR',
                status: error.status || 500
            };
        }
    };

    const onDelete = async (taskId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa task này?')) return;
        
        startTransition(async () => {
            const result = await deleteTask(taskId);
            if (result.error) {
                console.error('Failed to delete task:', result.error);
                alert('Không thể xóa task: ' + result.error);
            } else {
                router.refresh();
            }
        });
    };

    return {
        onAssign,
        onUpdateStatus,
        onDelete,
        isPending,
    };
}
