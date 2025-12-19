'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Check, Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    getMyNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from '@/data/noti/actions/list';

export default function NotificationList() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);
    const router = useRouter();
    const LIMIT = 20;

    const fetchNotifications = async (isLoadMore = false) => {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        try {
            const skip = isLoadMore ? notifications.length : 0;
            const res = await getMyNotifications({ limit: LIMIT, skip });
            
            if (res?.ok) {
                const newNotis = res.notifications || [];
                if (newNotis.length < LIMIT) {
                    setHasMore(false);
                }
                
                if (isLoadMore) {
                    setNotifications(prev => [...prev, ...newNotis]);
                } else {
                    setNotifications(newNotis);
                }
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkAsRead = async (id) => {
        // Optimistic update
        setNotifications(prev => 
            prev.map(n => n._id === id ? { ...n, read: true } : n)
        );

        try {
            await markNotificationAsRead(id);
            router.refresh(); // Refresh server components if needed
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (markingAll) return;
        if (!confirm('Bạn có chắc muốn đánh dấu tất cả là đã đọc?')) return;

        setMarkingAll(true);
        try {
            const res = await markAllNotificationsAsRead();
            if (res?.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                router.refresh();
            }
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        } finally {
            setMarkingAll(false);
        }
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.read) {
            await handleMarkAsRead(notification._id);
        }
        
        // Navigate based on metadata if available
        // This logic should match NotificationBell's navigation logic
        if (notification.metadata) {
            const { projectId, taskId, teamId } = notification.metadata;
            if (taskId) {
                router.push(`/tasks/${taskId}`);
            } else if (projectId) {
                router.push(`/projects/${projectId}`);
            } else if (teamId) {
                router.push(`/teams/${teamId}`);
            }
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-500">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2"></div>
                <p>Đang tải thông báo...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Bell className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Tất cả thông báo</h2>
                        <p className="text-sm text-gray-500">Cập nhật mới nhất về công việc của bạn</p>
                    </div>
                </div>
                
                {notifications.some(n => !n.read) && (
                    <button
                        onClick={handleMarkAllAsRead}
                        disabled={markingAll}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
                    >
                        <CheckCheck className="w-4 h-4" />
                        {markingAll ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
                    </button>
                )}
            </div>

            {/* Notification List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Bell className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">Không có thông báo nào</h3>
                            <p className="text-gray-500">Bạn đã cập nhật tất cả thông tin mới nhất.</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification._id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`
                                    group relative p-4 sm:p-6 transition-all cursor-pointer hover:bg-gray-50
                                    ${!notification.read ? 'bg-blue-50/30' : 'bg-white'}
                                `}
                            >
                                <div className="flex gap-4">
                                    {/* Icon Status */}
                                    <div className={`
                                        flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border
                                        ${!notification.read 
                                            ? 'bg-blue-100 border-blue-200 text-blue-600' 
                                            : 'bg-gray-100 border-gray-200 text-gray-400'}
                                    `}>
                                        <Bell className="w-5 h-5" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h4 className={`text-base mb-1 ${!notification.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                    {notification.title}
                                                </h4>
                                                <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                                                    {notification.message}
                                                </p>

                                                {/* Links based on metadata */}
                                                <div className="mt-2 flex flex-wrap gap-3">
                                                    {notification.metadata?.taskId && (
                                                        <Link 
                                                            href={`/tasks/${notification.metadata.taskId}`}
                                                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium inline-flex items-center gap-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!notification.read) handleMarkAsRead(notification._id);
                                                            }}
                                                        >
                                                            Xem chi tiết công việc
                                                        </Link>
                                                    )}
                                                    {notification.metadata?.projectId && (
                                                        <Link 
                                                            href={`/projects/${notification.metadata.projectId}`}
                                                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium inline-flex items-center gap-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!notification.read) handleMarkAsRead(notification._id);
                                                            }}
                                                        >
                                                            Xem dự án
                                                        </Link>
                                                    )}
                                                    {notification.metadata?.teamId && (
                                                        <Link 
                                                            href={`/teams/${notification.metadata.teamId}`}
                                                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium inline-flex items-center gap-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!notification.read) handleMarkAsRead(notification._id);
                                                            }}
                                                        >
                                                            Xem nhóm
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Time & Action */}
                                            <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
                                                <span className="text-xs font-medium text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                                                    {formatDistanceToNow(new Date(notification.createdAt), {
                                                        addSuffix: true,
                                                        locale: vi,
                                                    })}
                                                </span>
                                                
                                                {!notification.read && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMarkAsRead(notification._id);
                                                        }}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Đánh dấu đã đọc"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Unread Indicator Dot */}
                                {!notification.read && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
                                )}
                            </div>
                        ))
                    )}
                </div>
                
                {/* Load More Button */}
                {hasMore && notifications.length > 0 && (
                    <div className="p-4 border-t border-gray-100 text-center bg-gray-50">
                        <button
                            onClick={() => fetchNotifications(true)}
                            disabled={loadingMore}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingMore ? 'Đang tải thêm...' : 'Xem thêm thông báo cũ hơn'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
