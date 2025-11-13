// components/tasks/TaskListView.server.js
// Server Component - Hiển thị tasks dạng danh sách

import { Calendar, User, Tag, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Badge from '@/components/ui/badge';
import { vi as viTranslations } from '@/lib/i18n-vi';
import Link from 'next/link';
import { getUserId } from '@/lib/permissions';

/**
 * TaskListView - Hiển thị tasks dạng list giống trang /
 * @param {Object} props
 * @param {Array} props.tasks - Danh sách tasks
 * @param {string} props.projectId - Project ID
 * @param {Object} props.usersMap - Map userId -> user info
 */
export default function TaskListView({ tasks, projectId, usersMap = {} }) {
    if (!tasks || tasks.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-500">Chưa có công việc nào</p>
            </div>
        );
    }

    const getStatusBadge = (status) => {
        const statusMap = {
            'TODO': { variant: 'secondary', label: 'Chờ làm', color: 'bg-gray-100 text-gray-700' },
            'IN_PROGRESS': { variant: 'default', label: 'Đang làm', color: 'bg-blue-100 text-blue-700' },
            'WAITING_CONFIRM': { variant: 'default', label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-700' },
            'COMPLETED_AWAIT_REVIEW': { variant: 'default', label: 'Chờ duyệt', color: 'bg-purple-100 text-purple-700' },
            'COMPLETED': { variant: 'default', label: 'Hoàn thành', color: 'bg-green-100 text-green-700' },
            'APPROVED': { variant: 'default', label: 'Đã duyệt', color: 'bg-emerald-100 text-emerald-700' },
        };
        return statusMap[status] || statusMap['TODO'];
    };

    const getPriorityBadge = (priority) => {
        const priorityMap = {
            'urgent': { icon: '🔥', label: viTranslations.taskPriority.urgent, color: 'text-red-600' },
            'high': { icon: '⚡', label: viTranslations.taskPriority.high, color: 'text-orange-600' },
            'medium': { icon: '📌', label: viTranslations.taskPriority.medium, color: 'text-blue-600' },
            'low': { icon: '📋', label: viTranslations.taskPriority.low, color: 'text-gray-600' },
        };
        return priorityMap[priority] || priorityMap['low'];
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-600">
                    <div className="col-span-4">Tên công việc</div>
                    <div className="col-span-2">Trạng thái</div>
                    <div className="col-span-2">Người thực hiện</div>
                    <div className="col-span-2">Ưu tiên</div>
                    <div className="col-span-2">Hạn</div>
                </div>
            </div>

            {/* Task list */}
            <div className="divide-y divide-gray-100">
                {tasks.map((task) => {
                    const assigneeId = getUserId(task.assignee);
                    const assigneeInfo = assigneeId ? usersMap[assigneeId] : null;
                    const statusInfo = getStatusBadge(task.status);
                    const priorityInfo = getPriorityBadge(task.priority);
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && 
                                     !['COMPLETED', 'APPROVED'].includes(task.status);

                    return (
                        <Link
                            key={task._id}
                            href={`/projects/${projectId}/tasks/${task._id}`}
                            className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="grid grid-cols-12 gap-4 items-center">
                                {/* Task name */}
                                <div className="col-span-4 min-w-0">
                                    <h4 className="text-sm font-medium text-gray-900 truncate">
                                        {task.name}
                                    </h4>
                                    {task.description && (
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                            {task.description}
                                        </p>
                                    )}
                                </div>

                                {/* Status */}
                                <div className="col-span-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                        {statusInfo.label}
                                    </span>
                                </div>

                                {/* Assignee */}
                                <div className="col-span-2">
                                    {assigneeInfo ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                                {assigneeInfo.displayName?.charAt(0) || '?'}
                                            </div>
                                            <span className="text-sm text-gray-700 truncate">
                                                {assigneeInfo.displayName}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">Chưa gán</span>
                                    )}
                                </div>

                                {/* Priority */}
                                <div className="col-span-2">
                                    <span className={`text-sm ${priorityInfo.color}`}>
                                        {priorityInfo.icon} {priorityInfo.label}
                                    </span>
                                </div>

                                {/* Due date */}
                                <div className="col-span-2">
                                    {task.dueDate ? (
                                        <div className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>{format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: vi })}</span>
                                            {isOverdue && <span className="text-xs">⚠️</span>}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">Không có</span>
                                    )}
                                </div>
                            </div>

                            {/* Tags */}
                            {task.tags && task.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {task.tags.slice(0, 3).map((tag, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                            {tag}
                                        </span>
                                    ))}
                                    {task.tags.length > 3 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                            +{task.tags.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
