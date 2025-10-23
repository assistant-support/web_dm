// components/team/TeamActivityLog.client.js
'use client';

import { useState, useEffect } from 'react';
import { Activity, Users, Briefcase, CheckCircle2, Trophy, UserPlus, FolderPlus, Clock } from 'lucide-react';
import { getActivities } from '@/data/team/actions/activities.js';
import UserDisplay from '@/components/ui/user-display';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * TeamActivityLog Component
 * Hiển thị lịch sử hoạt động của team
 */
export default function TeamActivityLog({ teamId }) {
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        loadActivities();
    }, [teamId]);

    const loadActivities = async () => {
        setIsLoading(true);
        try {
            const result = await getActivities({ teamId, limit: 20, skip: 0 });
            if (result.ok) {
                setActivities(result.data.items);
                setTotal(result.data.total);
                setHasMore(result.data.hasMore);
            }
        } catch (error) {
            console.error('Load activities error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMore = async () => {
        try {
            const result = await getActivities({ 
                teamId, 
                limit: 20, 
                skip: activities.length 
            });
            if (result.ok) {
                setActivities([...activities, ...result.data.items]);
                setHasMore(result.data.hasMore);
            }
        } catch (error) {
            console.error('Load more activities error:', error);
        }
    };

    const getActivityIcon = (type) => {
        if (type.includes('member')) return <UserPlus className="h-4 w-4" />;
        if (type.includes('project')) return <FolderPlus className="h-4 w-4" />;
        if (type.includes('task.completed') || type.includes('task.approved')) return <CheckCircle2 className="h-4 w-4" />;
        if (type.includes('task')) return <Briefcase className="h-4 w-4" />;
        if (type.includes('points')) return <Trophy className="h-4 w-4" />;
        return <Activity className="h-4 w-4" />;
    };

    const getActivityColor = (type) => {
        if (type.includes('member')) return 'bg-blue-100 text-blue-600';
        if (type.includes('project')) return 'bg-purple-100 text-purple-600';
        if (type.includes('task.completed') || type.includes('task.approved')) return 'bg-green-100 text-green-600';
        if (type.includes('task')) return 'bg-orange-100 text-orange-600';
        if (type.includes('points')) return 'bg-yellow-100 text-yellow-600';
        return 'bg-gray-100 text-gray-600';
    };

    const getActivityDescription = (activity) => {
        const type = activity.type;
        const payload = activity.payload || {};

        // Member activities
        if (type === 'team.member.added') {
            return 'đã thêm thành viên vào nhóm';
        }
        if (type === 'team.member.removed') {
            return 'đã xóa thành viên khỏi nhóm';
        }
        if (type === 'team.member.role.changed') {
            return `đã thay đổi vai trò thành viên thành ${payload.role === 'manager' ? 'Quản lý' : 'Thành viên'}`;
        }

        // Project activities
        if (type === 'project.created') {
            return 'đã tạo dự án mới';
        }

        // Task activities
        if (type === 'task.created') {
            return 'đã tạo task mới';
        }
        if (type === 'task.completed') {
            return 'đã hoàn thành task';
        }
        if (type === 'task.approved') {
            return 'đã phê duyệt task';
        }

        // Points
        if (type === 'points.earned') {
            return `đã nhận ${payload.points || 0} điểm`;
        }

        // Default
        return type.replace(/\./g, ' ');
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-[var(--brand-600)]" />
                            <h3 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {total} hoạt động
                        </p>
                    </div>
                </div>
            </div>

            {/* Activities list */}
            <div className="divide-y divide-gray-200">
                {activities.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                        <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>Chưa có hoạt động nào</p>
                    </div>
                ) : (
                    <>
                        {activities.map((activity) => (
                            <div key={activity._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                <div className="flex gap-4">
                                    {/* Icon */}
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                                        {getActivityIcon(activity.type)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-2">
                                            <UserDisplay
                                                userId={activity.actor}
                                                showJobTitle={false}
                                                size="sm"
                                            />
                                            <span className="text-sm text-gray-700">
                                                {getActivityDescription(activity)}
                                            </span>
                                        </div>

                                        {/* Additional info */}
                                        {activity.payload && Object.keys(activity.payload).length > 0 && (
                                            <div className="mt-1 text-xs text-gray-500">
                                                {activity.payload.name && (
                                                    <span className="font-medium">"{activity.payload.name}"</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Timestamp */}
                                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                                            <Clock className="h-3 w-3" />
                                            <span>
                                                {formatDistanceToNow(new Date(activity.createdAt), {
                                                    addSuffix: true,
                                                    locale: vi
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Load more button */}
                        {hasMore && (
                            <div className="px-6 py-4 bg-gray-50 text-center">
                                <button
                                    onClick={loadMore}
                                    className="text-sm font-medium text-[var(--brand-600)] hover:text-[var(--brand-700)] transition-colors"
                                >
                                    Xem thêm
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
