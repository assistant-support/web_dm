// components/project/ProjectActivityLog.client.js
'use client';

import { useState, useEffect } from 'react';
import { Clock, UserPlus, FolderPlus, CheckCircle, Trophy, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getActivities } from '@/data/project/actions/analytics.js';

const ACTIVITY_TYPES = {
    'project.created': { icon: FolderPlus, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Tạo dự án' },
    'project.updated': { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Cập nhật dự án' },
    'project.archived': { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Lưu trữ dự án' },
    'member.added': { icon: UserPlus, color: 'text-green-600', bg: 'bg-green-100', label: 'Thêm thành viên' },
    'member.removed': { icon: UserPlus, color: 'text-red-600', bg: 'bg-red-100', label: 'Xóa thành viên' },
    'member.role.changed': { icon: UserPlus, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Đổi vai trò' },
    'task.created': { icon: FolderPlus, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Tạo task' },
    'task.completed': { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Hoàn thành task' },
    'task.updated': { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Cập nhật task' },
    'points.earned': { icon: Trophy, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Nhận điểm' },
};

export default function ProjectActivityLog({ projectId }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        loadActivities();
    }, [projectId]);

    const loadActivities = async () => {
        setLoading(true);
        try {
            const result = await getActivities({ projectId, limit: 10 });
            if (result.ok) {
                setActivities(result.data.items);
                setHasMore(result.data.hasMore);
            }
        } catch (error) {
            console.error('Load activities error:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const result = await getActivities({ 
                projectId, 
                limit: 10, 
                skip: activities.length 
            });
            if (result.ok) {
                setActivities([...activities, ...result.data.items]);
                setHasMore(result.data.hasMore);
            }
        } catch (error) {
            console.error('Load more error:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-[var(--brand-600)]" />
                <h3 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h3>
            </div>

            {/* Activity List */}
            {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <Clock className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p>Chưa có hoạt động nào</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activities.map((activity, index) => {
                        const config = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES['project.updated'];
                        const Icon = config.icon;

                        return (
                            <div key={activity._id || index} className="flex gap-4">
                                {/* Icon */}
                                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}>
                                    <Icon className={`h-5 w-5 ${config.color}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-900">
                                                <span className="font-medium">{activity.actor}</span>
                                                {' '}
                                                <span className="text-gray-600">{config.label}</span>
                                                {activity.payload?.name && (
                                                    <span className="font-medium"> "{activity.payload.name}"</span>
                                                )}
                                            </p>
                                            {activity.payload && Object.keys(activity.payload).length > 1 && (
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {JSON.stringify(activity.payload)}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500 flex-shrink-0">
                                            {formatDistanceToNow(new Date(activity.createdAt), { 
                                                addSuffix: true, 
                                                locale: vi 
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Load More */}
            {hasMore && (
                <div className="mt-6 text-center">
                    <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="text-sm text-[var(--brand-600)] hover:text-[var(--brand-700)] font-medium disabled:opacity-50"
                    >
                        {loadingMore ? 'Đang tải...' : 'Xem thêm'}
                    </button>
                </div>
            )}
        </div>
    );
}
