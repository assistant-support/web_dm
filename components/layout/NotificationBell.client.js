// components/layout/NotificationBell.client.js
'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import Dropdown from '@/components/ui/dropdown';

/**
 * NotificationBell - Simple notification dropdown
 * Note: This is a simplified version using mock data
 * In production, connect to real notification system
 */
export default function NotificationBell({ currentUser }) {
    const [notifications, setNotifications] = useState([]);

    // Mock notifications for demo
    useEffect(() => {
        // In production, fetch from API
        const mockNotifications = [
            {
                id: '1',
                type: 'task.assigned',
                message: 'Bạn được giao nhiệm vụ mới: "Thiết kế UI Dashboard"',
                createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
                read: false,
            },
            {
                id: '2',
                type: 'comment.added',
                message: 'Nguyễn Văn A đã bình luận trong nhiệm vụ "API Integration"',
                createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
                read: false,
            },
            {
                id: '3',
                type: 'task.status.changed',
                message: 'Nhiệm vụ "Testing Module" đã chuyển sang trạng thái "Hoàn thành"',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
                read: true,
            },
        ];
        setNotifications(mockNotifications);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = (id) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const handleMarkAllAsRead = () => {
        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );
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
                                                    handleMarkAsRead(notif.id);
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
