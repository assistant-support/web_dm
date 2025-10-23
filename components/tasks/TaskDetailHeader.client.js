// components/tasks/TaskDetailHeader.client.js
// Header component cho task detail page với breadcrumbs và actions

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TaskStatusBadge from '@/components/ui/TaskStatusBadge';
import TaskPriorityBadge from '@/components/ui/TaskPriorityBadge';
import { updateTask, deleteTask } from '@/data/task/actions/server';
import { 
    ArrowLeft, 
    Edit2, 
    Save, 
    X, 
    Trash2, 
    Copy,
    MoreVertical
} from 'lucide-react';

/**
 * TaskDetailHeader - Header cho task detail page
 * @param {Object} props
 * @param {Object} props.task - Task object
 * @param {string} props.projectName - Project name
 * @param {boolean} props.canManage - Permission to manage
 * @param {Function} props.onUpdate - Callback after update
 */
export default function TaskDetailHeader({ 
    task, 
    projectName = '', 
    canManage = false,
    onUpdate 
}) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(task.title);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showMenu, setShowMenu] = useState(false);

    const handleSave = async () => {
        if (!title.trim()) {
            setError('Tiêu đề không được để trống');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const result = await updateTask(task._id, { title: title.trim() });

            if (!result.ok) {
                setError(result.message || 'Không thể cập nhật');
                return;
            }

            setIsEditing(false);
            if (onUpdate) onUpdate(result.data);
            router.refresh();
        } catch (err) {
            console.error('Update error:', err);
            setError(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Bạn có chắc muốn xóa nhiệm vụ này?')) return;

        setIsSubmitting(true);
        setError('');

        try {
            const result = await deleteTask(task._id);

            if (!result.ok) {
                setError(result.message || 'Không thể xóa');
                return;
            }

            // Redirect to home page
            router.push('/');
            router.refresh();
        } catch (err) {
            console.error('Delete error:', err);
            setError(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyId = () => {
        navigator.clipboard.writeText(task._id);
        alert('Task ID đã được sao chép!');
        setShowMenu(false);
    };

    const handleCancel = () => {
        setTitle(task.title);
        setIsEditing(false);
        setError('');
    };

    return (
        <div className="bg-white border-b border-gray-200">
            <div className="px-6 py-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    {task.project && (
                        <>
                            <Link
                                href={`/projects/${task.project}`}
                                className="hover:text-blue-600 flex items-center gap-1 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {projectName || 'Dự án'}
                            </Link>
                            <span>/</span>
                        </>
                    )}
                    <span className="text-gray-900 font-medium">Chi tiết nhiệm vụ</span>
                </div>

                {/* Title and Actions */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    disabled={isSubmitting}
                                    className="w-full text-2xl font-bold border-b-2 border-blue-500 focus:outline-none px-1 py-1"
                                    autoFocus
                                />
                                {error && (
                                    <p className="text-sm text-red-600">{error}</p>
                                )}
                            </div>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold text-gray-900 break-words">
                                    {task.title}
                                </h1>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-sm text-gray-500 font-mono">
                                        #{task._id.slice(-8)}
                                    </span>
                                    <TaskStatusBadge status={task.status} size="sm" />
                                    <TaskPriorityBadge priority={task.priority} size="sm" />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleSave}
                                    disabled={isSubmitting || !title.trim()}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Save className="h-4 w-4" />
                                    Lưu
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                    Hủy
                                </button>
                            </>
                        ) : canManage ? (
                            <>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    Sửa
                                </button>
                                
                                {/* More menu */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowMenu(!showMenu)}
                                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </button>

                                    {showMenu && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                            <button
                                                onClick={handleCopyId}
                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                                            >
                                                <Copy className="h-4 w-4" />
                                                Sao chép ID
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                disabled={isSubmitting}
                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 rounded-b-lg disabled:opacity-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Xóa nhiệm vụ
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>

                {error && !isEditing && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
