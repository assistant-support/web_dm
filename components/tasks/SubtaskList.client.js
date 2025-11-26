// components/tasks/SubtaskList.client.js
// Mục đích: Hiển thị và quản lý subtasks của một parent task

'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import CreateSubtaskDialog from './CreateSubtaskDialog.client';
import SubtaskCard from './SubtaskCard.client';
import { 
    listSubtasks, 
    createSubtask, 
    updateSubtask, 
    deleteSubtask,
    getSubtaskStatsAction 
} from '@/data/task/actions/subtasks.server';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { reorderSubtasksAction } from '@/app/actions/reorder-subtasks';

/**
 * SubtaskList Component
 */
export default function SubtaskList({ 
    parentTaskId, 
    parentTask = null,
    projectMembers = [],
    users = [],
    workTypes = [],
    platforms = [],
    currentUserId = '',
    canManage = false,
    canCreateSubtask = false,
    allUsersWithDetails = []
}) {
    const [subtasks, setSubtasks] = useState([]);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [error, setError] = useState('');
    const [isSavingOrder, startSavingOrder] = useTransition();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const loadSubtasks = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [subtasksResult, statsResult] = await Promise.all([
                listSubtasks(parentTaskId),
                getSubtaskStatsAction(parentTaskId)
            ]);

            if (subtasksResult.ok) {
                setSubtasks(subtasksResult.data);
            }
            if (statsResult.ok) {
                setStats(statsResult.data);
            }
        } catch (err) {
            console.error('Failed to load subtasks:', err);
            setError('Không thể tải danh sách subtasks. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    }, [parentTaskId]);

    useEffect(() => {
        loadSubtasks();
    }, [loadSubtasks]);

    // Determine whether parent task's project is active (if provided)
    const projectActive = (() => {
        const t = parentTask;
        if (!t) return true;
        if (t.project && typeof t.project === 'object' && 'isActive' in t.project) return t.project.isActive;
        if ('projectIsActive' in t) return t.projectIsActive;
        return true;
    })();

    const handleSubtaskCreated = () => {
        loadSubtasks(); // Refresh list
    };

    const handleUpdateSubtask = async (subtaskId, updates) => {
        try {
            const result = await updateSubtask(subtaskId, updates);
            if (result.ok) {
                loadSubtasks();
            }
        } catch (err) {
            console.error('Failed to update subtask:', err);
        }
    };

    const handleDeleteSubtask = async (subtaskId) => {
        if (!confirm('Bạn có chắc muốn xóa subtask này?')) return;

        try {
            const result = await deleteSubtask(subtaskId);
            if (result.ok) {
                loadSubtasks();
            }
        } catch (err) {
            console.error('Failed to delete subtask:', err);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = subtasks.findIndex(t => t._id === active.id);
        const newIndex = subtasks.findIndex(t => t._id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const previousState = subtasks;
            const reordered = [...subtasks];
            const [moved] = reordered.splice(oldIndex, 1);
            reordered.splice(newIndex, 0, moved);
            setSubtasks(reordered);

            setError('');
            const orderedIds = reordered.map((item) => item._id);

            startSavingOrder(async () => {
                try {
                    await reorderSubtasksAction(parentTaskId, orderedIds);
                } catch (err) {
                    console.error('Failed to persist subtask order:', err);
                    setError('Không thể lưu thứ tự subtask. Vui lòng thử lại.');
                    setSubtasks(previousState);
                }
            });
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 text-center text-sm text-gray-500">
                Đang tải subtasks...
            </div>
        );
    }

    return (
        <div className="space-y-4" aria-busy={isSavingOrder}>
            {/* Header with stats */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                        Subtasks
                    </h3>
                    {stats && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600">{stats.completed} / {stats.total}</span>
                            {stats.completionRate > 0 && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                    {stats.completionRate}%
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            {stats && stats.total > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${stats.completionRate}%` }}
                    />
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    {error}
                </div>
            )}

            {/* Add subtask button */}
            <button
                onClick={() => {
                    if (!canCreateSubtask) return;
                    if (!projectActive) {
                        alert('Dự án đã lưu trữ — không thể thêm việc con');
                        return;
                    }
                    setShowCreateDialog(true);
                }}
                disabled={!canCreateSubtask || !projectActive}
                title={!canCreateSubtask ? 'Bạn không có quyền tạo công việc con cho task này' : !projectActive ? 'Dự án đã lưu trữ — không thể thêm việc con' : 'Thêm công việc con'}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-2 border-dashed rounded-lg transition-colors ${
                    canCreateSubtask
                        ? 'text-[var(--brand-600)] bg-[var(--brand-50)] border-[var(--brand-200)] hover:bg-[var(--brand-100)] hover:border-[var(--brand-300)] cursor-pointer'
                        : 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
                }`}
            >
                <Plus className="h-4 w-4" />
                Thêm công việc con
            </button>

            {/* Subtasks list */}
            {subtasks.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500 border border-gray-200 rounded-lg border-dashed">
                    Chưa có subtask nào. {canCreateSubtask && 'Click nút trên để thêm công việc con với đầy đủ thông tin.'}
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={subtasks.map(t => t._id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                            {subtasks.map((subtask) => (
                                <SubtaskCard
                                    key={subtask._id}
                                    subtask={subtask}
                                    onUpdate={handleUpdateSubtask}
                                    onDelete={handleDeleteSubtask}
                                    users={users}
                                    workTypes={workTypes}
                                    platforms={platforms}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
            
            {/* Create Subtask Dialog */}
            {canCreateSubtask && showCreateDialog && parentTask && projectActive && (
                <CreateSubtaskDialog
                    open={showCreateDialog}
                    onClose={() => setShowCreateDialog(false)}
                    parentTask={parentTask}
                    projectMembers={projectMembers}
                    users={users}
                    allUsersWithDetails={allUsersWithDetails}
                    workTypes={workTypes}
                    platforms={platforms}
                    currentUserId={currentUserId}
                    onSuccess={handleSubtaskCreated}
                    isActive={projectActive}
                />
            )}
        </div>
    );
}
