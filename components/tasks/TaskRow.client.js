// components/tasks/TaskRow.client.js
// Mục đích: Hiển thị một task row trong list view

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/ui/badge';
import Avatar from '@/components/ui/avatar';
import Select from '@/components/ui/select';
import UserDisplay, { UserBadge } from '@/components/ui/user-display';
import { updateTaskStatus } from '@/data/task/actions/server.js';
import { Calendar, MessageSquare, Paperclip, CheckCircle, ListTree } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
    { value: 'draft', label: 'Nháp' },
    { value: 'pending_approval', label: 'Chờ phê duyệt' },
    { value: 'waiting_confirm', label: 'Chờ xác nhận' },
    { value: 'in_progress', label: 'Đang thực hiện' },
    { value: 'on_hold', label: 'Tạm dừng' },
    { value: 'completed_await_review', label: 'Chờ review' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'rejected', label: 'Từ chối' },
    { value: 'cancelled', label: 'Đã hủy' },
];

/**
 * TaskRow - Hiển thị task trong list
 * @param {Object} props
 * @param {Object} props.task - Task object
 * @param {boolean} props.canManage - Có quyền manage không
 * @param {Function} props.onRefresh - Callback để refresh
 */
export default function TaskRow({ task, canManage = false, onRefresh }) {
    const router = useRouter();
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');

    const handleStatusChange = async (newStatus) => {
        if (newStatus === task.status) return;

        setIsUpdating(true);
        setError('');

        try {
            const result = await updateTaskStatus(task._id, newStatus);

            if (!result.ok) {
                setError(result.message || 'Không thể cập nhật trạng thái');
                return;
            }

            if (onRefresh) onRefresh();
            else router.refresh();
        } catch (err) {
            console.error('Status update error:', err);
            setError(err.message || 'Có lỗi không mong muốn xảy ra');
        } finally {
            setIsUpdating(false);
        }
    };

    const isOverdue = task.plannedDueAt && new Date(task.plannedDueAt) < new Date() && task.status !== 'completed';
    const isCompleted = task.status === 'completed';

    return (
        <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-white hover:shadow-sm hover:border-gray-300 transition-all">
            {/* Checkbox for completed status */}
            <button
                onClick={() => handleStatusChange(isCompleted ? 'in_progress' : 'completed')}
                disabled={isUpdating}
                className="flex-shrink-0 transition-transform hover:scale-110"
            >
                <CheckCircle 
                    className={`h-5 w-5 transition-colors ${isCompleted ? 'text-green-600 fill-green-100' : 'text-gray-300 hover:text-green-500'}`}
                />
            </button>

            {/* Task title and details */}
            <div className="flex-1 min-w-0">
                <Link 
                    href={`/tasks/${task._id}`}
                    className="block hover:text-blue-600 transition-colors"
                >
                    <h3 className={`text-sm font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {task.title}
                    </h3>
                </Link>
                
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {/* Task ID */}
                    <span className="font-mono">#{task._id.slice(-6)}</span>

                    {/* Priority */}
                    {task.priority && (
                        <Badge variant="priority" priority={task.priority}>
                            {task.priority}
                        </Badge>
                    )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                        <div className="flex gap-1">
                            {task.tags.slice(0, 2).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                            {task.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                    +{task.tags.length - 2}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Comments count */}
                    {task.commentsCount > 0 && (
                        <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {task.commentsCount}
                        </span>
                    )}

                    {/* Attachments count */}
                    {task.attachmentsCount > 0 && (
                        <span className="flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {task.attachmentsCount}
                        </span>
                    )}

                    {/* Subtask count */}
                    {task.subtaskCount > 0 && (
                        <span className="flex items-center gap-1 text-purple-600">
                            <ListTree className="h-3 w-3" />
                            {task.subtaskCount}
                        </span>
                    )}
                </div>

                {error && (
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                )}
            </div>

            {/* Assignee */}
            <div className="flex-shrink-0">
                {task.assignee ? (
                    <UserBadge userId={task.assignee} />
                ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs text-gray-500">?</span>
                    </div>
                )}
            </div>

            {/* Due date */}
            <div className="flex-shrink-0 w-32">
                {task.plannedDueAt ? (
                    <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(task.plannedDueAt), 'MMM dd')}</span>
                    </div>
                ) : (
                    <span className="text-xs text-gray-400">Không có hạn</span>
                )}
            </div>

            {/* Status dropdown */}
            <div className="flex-shrink-0 w-40">
                {canManage ? (
                    <Select
                        value={task.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        options={STATUS_OPTIONS}
                        disabled={isUpdating}
                        className="text-sm"
                    />
                ) : (
                    <Badge variant="status" status={task.status}>
                        {STATUS_OPTIONS.find(opt => opt.value === task.status)?.label || task.status}
                    </Badge>
                )}
            </div>
        </div>
    );
}
