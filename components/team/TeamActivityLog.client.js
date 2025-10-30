// components/team/TeamActivityLog.client.js
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { getActivities } from '@/data/team/actions/activities.js';
import { getUsersDisplayInfo } from '@/lib/user-display'; // Gọi từ client khi load more
import ActivityItem from '@/components/ui/activity-item';

// Ngưỡng thời gian (ms) để coi 2 activity là gần nhau (dùng để lọc)
const FILTER_TIME_THRESHOLD = 5000; // 5 giây

// Hàm lọc bỏ activity dư thừa (ví dụ: role change ngay sau add)
const filterRedundantActivities = (activities) => {
    if (!activities || activities.length < 2) {
        return activities;
    }

    const filtered = [];
    const skipIndices = new Set();

    for (let i = 0; i < activities.length; i++) {
        if (skipIndices.has(i)) continue;

        const current = activities[i];
        filtered.push(current); // Luôn thêm activity hiện tại

        // Kiểm tra activity tiếp theo (nếu có)
        if (i + 1 < activities.length) {
            const next = activities[i + 1];

            // Logic lọc: Nếu là 'member.added' và cái tiếp theo là 'member.role.changed'
            // của cùng user và thời gian rất gần nhau -> bỏ qua cái 'member.role.changed'
            if (
                current.type === 'member.added' &&
                next.type === 'member.role.changed' && // Sửa lại tên type nếu cần
                current.actor === next.actor &&
                current.payload?.userId === next.payload?.userId &&
                (new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime()) < FILTER_TIME_THRESHOLD
            ) {
                // Đánh dấu để bỏ qua activity tiếp theo
                skipIndices.add(i + 1);
            }
        }
    }
    return filtered;
};


export default function TeamActivityLog({
    teamId,
    initialActivities,
    initialTotal,
    initialHasMore,
    initialUsersMap,
    itemsPerPage
}) {
    const [activities, setActivities] = useState(initialActivities);
    const [usersMap, setUsersMap] = useState(initialUsersMap);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [total, setTotal] = useState(initialTotal);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    const observerTarget = useRef(null); // Phần tử để theo dõi cuộn

    // Lọc activity trước khi hiển thị
    const displayedActivities = useMemo(() => filterRedundantActivities(activities), [activities]);

    // Hàm tải thêm activity
    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        setError(null);
        try {
            const result = await getActivities({
                teamId,
                limit: itemsPerPage,
                skip: activities.length // Skip số lượng đã có
            });

            if (result.ok) {
                const newActivities = result.data.items || [];
                setActivities(prev => [...prev, ...newActivities]);
                setHasMore(result.data.hasMore);

                // Tải thông tin user cho các activity mới
                const newActorIds = newActivities
                    .map(act => act.actor)
                    .filter(Boolean)
                    .filter(id => !usersMap[id]); // Chỉ lấy ID chưa có

                if (newActorIds.length > 0) {
                    // Gọi hàm batch từ client (cần đảm bảo hàm này an toàn khi gọi từ client)
                    // Hoặc tạo một Server Action riêng để gọi batch từ client
                    const newUserInfoMapResult = await getUsersDisplayInfo(newActorIds);
                    const newUserInfoObject = {};
                    newUserInfoMapResult.forEach((value, key) => {
                        newUserInfoObject[key] = value;
                    });
                    setUsersMap(prev => ({ ...prev, ...newUserInfoObject }));
                }
            } else {
                throw new Error(result.message || 'Không thể tải thêm hoạt động.');
            }
        } catch (err) {
            console.error('Load more activities error:', err);
            setError(err.message || 'Đã xảy ra lỗi khi tải thêm.');
            // Không set hasMore = false để người dùng có thể thử lại
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, teamId, itemsPerPage, activities.length, usersMap]);

    // Thiết lập IntersectionObserver
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    loadMore();
                }
            },
            { threshold: 1.0 } // Kích hoạt khi phần tử hoàn toàn trong viewport
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        // Cleanup
        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [loadMore, hasMore, isLoadingMore]);

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
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

            <div className="divide-y divide-gray-200 flex-1 overflow-y-auto">
                {displayedActivities.length === 0 && !isLoadingMore ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                        <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>Chưa có hoạt động nào</p>
                    </div>
                ) : (
                    <>
                        {displayedActivities.map((activity) => (
                            <div key={activity._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                <ActivityItem
                                    activity={activity}
                                    // Tối ưu: Truyền userInfo đã fetch
                                    userInfo={usersMap[activity.actor]}
                                    showPayload={false}
                                />
                            </div>
                        ))}

                        {/* Phần tử trigger và loading indicator */}
                        <div ref={observerTarget} className="h-10 flex items-center justify-center">
                            {isLoadingMore && (
                                <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                            )}
                            {!isLoadingMore && !hasMore && activities.length > 0 && (
                                <span className="text-sm text-gray-500">Hết hoạt động</span>
                            )}
                            {error && !isLoadingMore && (
                                <div className="text-center text-sm text-red-600">
                                    <p>{error}</p>
                                    <button
                                        onClick={loadMore}
                                        className="mt-1 font-medium text-blue-600 hover:text-blue-800"
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}