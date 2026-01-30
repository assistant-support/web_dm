// components/tasks/KanbanBoard.js
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    rectIntersection, // [FIX] Dùng rectIntersection để nhận diện tốt hơn
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
        title: 'Đã gửi Task',
        statuses: ['draft', 'pending_approval', 'waiting_confirm'],
    },
    {
        id: 'in_progress',
        title: 'Đang làm',
        statuses: ['in_progress'],
    },
    {
        id: 'review',
        title: 'Chờ duyệt',
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
    projectMembers = [],
    isAdmin = false, // [NEW] Admin có đầy đủ quyền
    canManageKanban = false // [NEW] Quyền thao tác kanban (admin, manager, owner)
}) {
    const [tasks, setTasks] = useState(initialTasks);
    const [activeTask, setActiveTask] = useState(null);
    const [overColumnId, setOverColumnId] = useState(null); // [NEW] Track column đang được drag over để highlight
    const pendingOrderUpdate = useRef(null); // [FIX] Lưu pending order update để tránh gọi trong render
    const dragOverInfo = useRef(null); // [FIX] Lưu thông tin drag over cuối cùng để update khi drag end
    
    // [NEW] State để track số lượng task hiển thị cho mỗi cột (mặc định 5)
    const [visibleTasksCount, setVisibleTasksCount] = useState(() => {
        const initial = {};
        COLUMNS.forEach(col => {
            initial[col.id] = 5; // Mặc định hiển thị 5 task đầu tiên
        });
        return initial;
    });

    // [NEW] Sync tasks khi initialTasks (filteredTasks) thay đổi
    useEffect(() => {
        setTasks(initialTasks);
        // Reset visibleTasksCount khi filters thay đổi để bắt đầu lại từ đầu
        setVisibleTasksCount(() => {
            const initial = {};
            COLUMNS.forEach(col => {
                initial[col.id] = 5;
            });
            return initial;
        });
    }, [initialTasks]);

    // [NEW] Chỉ enable drag nếu có quyền thao tác kanban
    const canDrag = isAdmin || canManageKanban;
    
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required to start drag
            },
            disabled: !canDrag, // [NEW] Disable sensors nếu không có quyền
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
        dragOverInfo.current = null; // Reset khi bắt đầu drag mới
        pendingOrderUpdate.current = null; // Reset pending order update
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!over) {
            setOverColumnId(null);
            dragOverInfo.current = null;
            return;
        }

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const activeTask = tasks.find((t) => t._id === activeId);
        if (!activeTask) return;

        // Determine if dropping on a column or a task
        const overData = over.data.current;
        const isOverColumn = overData?.type === 'column';
        const isOverTask = overData?.type === 'task';

        // [NEW] Update overColumnId để highlight column
        let targetColumnId = null;
        if (isOverColumn) {
            targetColumnId = overId;
            setOverColumnId(overId);
            // [FIX] Lưu thông tin để update khi drag end
            dragOverInfo.current = {
                activeId,
                activeTask,
                targetColumnId: overId,
                targetStatus: getDefaultStatusForColumn(overId),
                isOverColumn: true
            };
        } else if (isOverTask) {
            const overTask = overData.task;
            targetColumnId = getColumnIdFromStatus(overTask.status);
            setOverColumnId(targetColumnId);
            // [FIX] Lưu thông tin để update khi drag end
            dragOverInfo.current = {
                activeId,
                activeTask,
                targetColumnId,
                targetStatus: overTask.status,
                overTaskId: overId,
                isOverColumn: false
            };
        }

        // [FIX] Chỉ preview visual (reorder trong cùng column), không update status
        // Status sẽ chỉ được update khi drag end
        if (isOverTask && !isOverColumn) {
            const overTask = overData.task;
            const activeColumnId = getColumnIdFromStatus(activeTask.status);
            const overColumnIdFromTask = getColumnIdFromStatus(overTask.status);

            // Chỉ preview reorder trong cùng column
            if (activeColumnId === overColumnIdFromTask) {
                setTasks((prevTasks) => {
                    const oldIndex = prevTasks.findIndex((t) => t._id === activeId);
                    const newIndex = prevTasks.findIndex((t) => t._id === overId);
                    
                    // Chỉ update nếu index thực sự thay đổi
                    if (oldIndex === newIndex) {
                        return prevTasks;
                    }
                    
                    const newTasks = arrayMove(prevTasks, oldIndex, newIndex);
                    // Lưu taskIds để update sau khi drag end
                    pendingOrderUpdate.current = newTasks.map(t => t._id);

                    return newTasks;
                });
            }
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        
        setActiveTask(null);
        setOverColumnId(null); // [NEW] Reset highlight khi drag end
        
        if (!over || !active) {
            // Không có target, reset và return
            dragOverInfo.current = null;
            pendingOrderUpdate.current = null;
            return;
        }

        const activeId = active.id;
        const activeTask = tasks.find((t) => t._id === activeId);
        if (!activeTask) {
            dragOverInfo.current = null;
            return;
        }

        const overData = over.data.current;
        const isOverColumn = overData?.type === 'column';
        const isOverTask = overData?.type === 'task';

        let targetColumnId = null;
        let targetStatus = null;

        // [FIX] Xác định target column và status từ over event
        if (isOverColumn) {
            // Kéo vào column trực tiếp
            targetColumnId = over.id;
            targetStatus = getDefaultStatusForColumn(targetColumnId);
        } else if (isOverTask) {
            // Kéo vào task - lấy column từ task đó
            const overTask = overData.task;
            targetColumnId = getColumnIdFromStatus(overTask.status);
            targetStatus = overTask.status;
        }

        const oldColumnId = getColumnIdFromStatus(activeTask.status);

        // [FIX] Chỉ update status nếu thay đổi column
        if (targetColumnId && targetColumnId !== oldColumnId && targetStatus) {
            // Update status trong state
            setTasks((prevTasks) => {
                return prevTasks.map((task) => {
                    if (task._id === activeId) {
                        return { ...task, status: targetStatus };
                    }
                    return task;
                });
            });

            // Update on server
            updateTask(activeId, { status: targetStatus }).catch((err) => {
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
        } else if (targetColumnId === oldColumnId && isOverTask) {
            // [FIX] Reordering trong cùng column - chỉ update order, không update status
            // Logic này đã được xử lý trong handleDragOver và pendingOrderUpdate
        }
        
        // [FIX] Update kanban order sau khi drag end, không trong quá trình render
        if (pendingOrderUpdate.current) {
            const taskIds = pendingOrderUpdate.current;
            pendingOrderUpdate.current = null;
            
            // Sử dụng setTimeout để đảm bảo không gọi trong render phase
            setTimeout(() => {
                updateKanbanOrder(taskIds).catch((err) => {
                    console.error('Failed to update kanban order:', err);
                });
            }, 0);
        }
        
        // Reset drag over info
        dragOverInfo.current = null;
    };

    // [NEW] Hàm để load thêm 5 task cho một cột
    const handleLoadMore = (columnId) => {
        setVisibleTasksCount(prev => ({
            ...prev,
            [columnId]: (prev[columnId] || 5) + 5
        }));
    };

    // [NEW] Hàm để thu gọn về 5 task đầu tiên
    const handleCollapse = (columnId) => {
        setVisibleTasksCount(prev => ({
            ...prev,
            [columnId]: 5
        }));
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection} // [FIX] Dùng rectIntersection để nhận diện tốt hơn khi kéo vào column
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto pb-4">
                {COLUMNS.map((column) => {
                    const allTasksInColumn = tasksByColumn[column.id] || [];
                    const visibleCount = visibleTasksCount[column.id] || 5;
                    const visibleTasks = allTasksInColumn.slice(0, visibleCount);
                    const hasMore = allTasksInColumn.length > visibleCount;
                    
                    return (
                        <KanbanColumn
                            key={column.id}
                            column={column}
                            tasks={visibleTasks}
                            allTasksCount={allTasksInColumn.length} // [NEW] Tổng số task trong cột
                            visibleCount={visibleCount} // [NEW] Số lượng task đang hiển thị
                            projectId={projectId}
                            canManage={canManage}
                            currentUserId={currentUserId}
                            users={users}
                            projectMembers={projectMembers}
                            isAdmin={isAdmin} // [NEW] Truyền quyền admin
                            isOver={overColumnId === column.id} // [NEW] Highlight khi drag over
                            canDrag={canDrag} // [NEW] Truyền quyền drag
                            hasMore={hasMore} // [NEW] Còn task để load thêm
                            onLoadMore={() => handleLoadMore(column.id)} // [NEW] Hàm load thêm
                            onCollapse={() => handleCollapse(column.id)} // [NEW] Hàm thu gọn
                        />
                    );
                })}
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

