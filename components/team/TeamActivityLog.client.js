// components/team/TeamActivityLog.client.js
'use client';

import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { getActivities } from '@/data/team/actions/activities.js';
import ActivityItem from '@/components/ui/activity-item';

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
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ">
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
            {/* Activity List */}
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
                                <ActivityItem
                                    activity={activity}
                                    showPayload={false}
                                />
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
