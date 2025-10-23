// components/tasks/TaskNotifications.client.js
// Notifications panel for task owner about subtask activities

'use client';

import { Bell, CheckCircle, Clock, AlertCircle, User } from 'lucide-react';
import Link from 'next/link';
import UserDisplay from '@/components/ui/user-display';

/**
 * TaskNotifications - Show notifications for task owner
 * 
 * @param {Object} props
 * @param {Object} props.task - Task object
 * @param {Array} props.subtasks - Subtasks array
 * @param {string} props.currentUserId - Current user's externalUserId
 */
export default function TaskNotifications({ task, subtasks = [], currentUserId }) {
    // Only show if current user is task assignee (người đứng chính)
    if (task.assignedTo !== currentUserId) {
        return null;
    }

    // Calculate notifications
    const notifications = [];

    // Subtasks awaiting review
    const awaitingReview = subtasks.filter(s => s.status === 'completed_await_review');
    if (awaitingReview.length > 0) {
        notifications.push({
            id: 'awaiting_review',
            type: 'warning',
            icon: AlertCircle,
            title: `${awaitingReview.length} subtask chờ bạn duyệt`,
            description: 'Các subtask đã hoàn thành và cần được phê duyệt',
            subtasks: awaitingReview,
            action: 'review',
        });
    }

    // Subtasks waiting for assignee confirmation
    const waitingConfirm = subtasks.filter(s => s.status === 'waiting_confirm');
    if (waitingConfirm.length > 0) {
        notifications.push({
            id: 'waiting_confirm',
            type: 'info',
            icon: Clock,
            title: `${waitingConfirm.length} subtask chờ xác nhận`,
            description: 'Người được giao chưa xác nhận nhận việc',
            subtasks: waitingConfirm,
            action: 'wait',
        });
    }

    // Subtasks in progress (info only)
    const inProgress = subtasks.filter(s => s.status === 'in_progress');
    if (inProgress.length > 0) {
        notifications.push({
            id: 'in_progress',
            type: 'info',
            icon: User,
            title: `${inProgress.length} subtask đang thực hiện`,
            description: 'Các subtask đang được làm',
            subtasks: inProgress,
            action: 'info',
        });
    }

    // Subtasks completed
    const completed = subtasks.filter(s => s.status === 'completed');
    if (completed.length > 0) {
        notifications.push({
            id: 'completed',
            type: 'success',
            icon: CheckCircle,
            title: `${completed.length} subtask đã hoàn thành`,
            description: 'Các subtask đã được duyệt và hoàn tất',
            subtasks: completed,
            action: 'info',
        });
    }

    if (notifications.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-gray-700" />
                <h3 className="text-sm font-medium text-gray-900">
                    Thông báo công việc
                </h3>
            </div>

            <div className="space-y-2">
                {notifications.map((notif) => {
                    const Icon = notif.icon;
                    const bgColor = {
                        warning: 'bg-orange-50 border-orange-300',
                        info: 'bg-blue-50 border-blue-300',
                        success: 'bg-green-50 border-green-300',
                    }[notif.type];

                    const iconColor = {
                        warning: 'text-orange-600',
                        info: 'text-blue-600',
                        success: 'text-green-600',
                    }[notif.type];

                    return (
                        <div key={notif.id} className={`p-3 border rounded-lg ${bgColor}`}>
                            <div className="flex items-start gap-3">
                                <Icon className={`h-5 w-5 mt-0.5 ${iconColor}`} />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-gray-900">
                                        {notif.title}
                                    </h4>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        {notif.description}
                                    </p>

                                    {/* Subtask list */}
                                    {notif.subtasks.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {notif.subtasks.slice(0, 3).map((subtask) => (
                                                <Link
                                                    key={subtask._id}
                                                    href={`/tasks/${subtask._id}`}
                                                    className="block text-xs text-gray-700 hover:text-blue-600 hover:underline"
                                                >
                                                    • {subtask.title}
                                                    {subtask.assignedTo && (
                                                        <span className="ml-2 text-gray-500">
                                                            (<UserDisplay userId={subtask.assignedTo} size="xs" showAvatar={false} />)
                                                        </span>
                                                    )}
                                                </Link>
                                            ))}
                                            {notif.subtasks.length > 3 && (
                                                <p className="text-xs text-gray-500 italic">
                                                    ...và {notif.subtasks.length - 3} subtask khác
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                💡 <strong>Lưu ý:</strong> Bạn là người đứng chính của task này. 
                Hãy theo dõi và duyệt các subtask khi hoàn thành.
            </div>
        </div>
    );
}
