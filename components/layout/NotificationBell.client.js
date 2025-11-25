// components/layout/NotificationBell.client.js
'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import Dropdown from '@/components/ui/dropdown';
import {
    getMyNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from '@/data/noti/actions/list';

/**
 * NotificationBell - Notification dropdown with real-time updates
 * Integrated with server actions for live notification data
 */
export default function NotificationBell({ currentUser }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [mounted, setMounted] = useState(false);

    // Ensure client-side only rendering to avoid hydration issues
    useEffect(() => {
        setMounted(true);
        
        // Fetch real notifications from server
        const fetchNotifications = async () => {
            const result = await getMyNotifications({ limit: 10 });
            
            if (result.ok) {
                setNotifications(result.notifications || []);
                setUnreadCount(result.unreadCount || 0);
            }
        };

        fetchNotifications();
    }, []);

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return (
            <button
                className="relative p-2 text-[var(--brand-600)] hover:bg-gray-100 rounded-lg transition-colors"
                title="Thông báo"
                disabled
            >
                <Bell className="w-6 h-6" />
            </button>
        );
    }

    const handleMarkAsRead = async (id) => {
        // Optimistic UI update - immediately reflect the change
        setNotifications(prev =>
            prev.map(n => n._id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));

        // Call server action
        await markNotificationAsRead(id);
    };

    const handleMarkAllAsRead = async () => {
        // Optimistic UI update - immediately mark all as read
        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );
        setUnreadCount(0);

        // Call server action
        await markAllNotificationsAsRead();
    };

    const handleClearAll = () => {
        setNotifications([]);
    };

    return (
        <Dropdown>
            <Dropdown.Trigger>
                <button
                    className="relative p-2 text-[var(--brand-600)] hover:bg-gray-100 rounded-lg transition-colors"
                    title="Thông báo"
                >
                    <Bell className="w-6 h-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </Dropdown.Trigger>

            <Dropdown.Content position="bottom-right" width="w-96" className="max-h-[500px] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                        Thông báo {unreadCount > 0 && `(${unreadCount})`}
                    </h3>
                    {notifications.length > 0 && (
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                    Đánh dấu tất cả đã đọc
                                </button>
                            )}
                            <button
                                onClick={handleClearAll}
                                className="text-xs text-gray-500 hover:text-gray-700"
                                title="Xóa tất cả"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Notification list */}
                <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">Không có thông báo mới</p>
                        </div>
                    ) : (
                        <div>
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`
                                        px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer
                                        ${!notif.read ? 'bg-blue-50' : ''}
                                    `}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Icon */}
                                        <div className={`
                                            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                                            ${!notif.read ? 'bg-blue-600' : 'bg-gray-300'}
                                        `}>
                                            <Bell className="w-4 h-4 text-white" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!notif.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                                {notif.message}
                                            </p>
                                            {notif.metadata?.taskId && (
                                                <a 
                                                    href={`/tasks/${notif.metadata.taskId}`}
                                                    className="text-xs text-blue-600 hover:underline mt-1 block"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    Xem chi tiết công việc
                                                </a>
                                            )}
                                            {notif.metadata?.projectId && (
                                                <a 
                                                    href={`/projects/${notif.metadata.projectId}`}
                                                    className="text-xs text-blue-600 hover:underline mt-1 block"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    Xem dự án
                                                </a>
                                            )}
                                            {notif.metadata?.teamId && (
                                                <a 
                                                    href={`/teams/${notif.metadata.teamId}`}
                                                    className="text-xs text-blue-600 hover:underline mt-1 block"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    Xem nhóm
                                                </a>
                                            )}
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formatDistanceToNow(new Date(notif.createdAt), {
                                                    addSuffix: true,
                                                    locale: vi,
                                                })}
                                            </p>
                                        </div>

                                        {/* Mark as read */}
                                        {!notif.read && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkAsRead(notif._id); // Use _id
                                                }}
                                                className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                                title="Đánh dấu đã đọc"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-200 text-center">
                        <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                            Xem tất cả thông báo
                        </button>
                    </div>
                )}
            </Dropdown.Content>
        </Dropdown>
    );
}
