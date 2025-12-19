// components/tasks/KanbanCard.js
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, MessageSquare, Paperclip, User } from 'lucide-react';
import Badge from '@/components/ui/badge';
import UserDisplay from '@/components/ui/user-display';
import { getUserId } from '@/lib/permissions.js';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

/**
 * KanbanCard - Draggable task card for Kanban board
 */
export default function KanbanCard({ task }) {
    const router = useRouter();
    
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task._id,
        data: {
            type: 'task',
            task,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'low':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getPriorityLabel = (priority) => {
        switch (priority) {
            case 'urgent': return 'Khẩn cấp';
            case 'high': return 'Cao';
            case 'medium': return 'Bình thường';
            case 'low': return 'Thấp';
            default: return priority;
        }
    };

    const isOverdue = task.plannedDueAt && new Date(task.plannedDueAt) < new Date() && task.status !== 'completed';

    const handleClick = () => {
        router.push(`/tasks/${task._id}`);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                bg-white border border-gray-200 rounded-lg p-3 mb-2 cursor-pointer
                hover:shadow-md transition-shadow group
                ${isDragging ? 'shadow-lg' : ''}
            `}
        >
            {/* Drag handle + Title */}
            <div className="flex items-start gap-2 mb-2">
                <button
                    {...attributes}
                    {...listeners}
                    className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing mt-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className="w-4 h-4" />
                </button>
                
                <div className="flex-1 min-w-0" onClick={handleClick}>
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                        {task.title}
                    </h4>
                    {task.parentTask && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <span className="rotate-90 inline-block">↳</span>
                            <span className="truncate">{task.parentTaskTitle || 'Task cha'}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Description preview */}
            {task.description && (
                <div className="text-xs text-gray-600 line-clamp-2 mb-2 ml-6" onClick={handleClick}>
                    {task.description}
                </div>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-2 ml-6 flex-wrap" onClick={handleClick}>
                {/* Priority badge */}
                {task.priority && task.priority !== 'medium' && (
                    <span className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                    </span>
                )}

                {/* Due date */}
                {task.plannedDueAt && (
                    <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        <Calendar className="w-3 h-3" />
                        {format(new Date(task.plannedDueAt), 'dd/MM')}
                    </span>
                )}

                {/* Comments count */}
                {task.commentsCount > 0 && (
                    <span className="text-xs flex items-center gap-1 text-gray-500">
                        <MessageSquare className="w-3 h-3" />
                        {task.commentsCount}
                    </span>
                )}

                {/* Attachments count */}
                {task.attachmentsCount > 0 && (
                    <span className="text-xs flex items-center gap-1 text-gray-500">
                        <Paperclip className="w-3 h-3" />
                        {task.attachmentsCount}
                    </span>
                )}
            </div>

            {/* Assignee */}
            {task.assignee && (
                <div className="mt-2 ml-6" onClick={handleClick}>
                    <UserDisplay userId={getUserId(task.assignee)} variant="avatar" size="sm" />
                </div>
            )}
        </div>
    );
}
