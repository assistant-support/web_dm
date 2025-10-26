// components/project/ProjectActivityLog.client.js
'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getActivities } from '@/data/project/actions/analytics.js';
import ActivityItem from '@/components/ui/activity-item';

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
                    {activities.map((activity, index) => (
                        <ActivityItem
                            key={activity._id || index}
                            activity={activity}
                            showPayload={false}
                        />
                    ))}
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
