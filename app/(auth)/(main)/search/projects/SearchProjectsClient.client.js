// app/(auth)/(main)/search/projects/SearchProjectsClient.client.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Folder, Loader2, ArrowLeft } from 'lucide-react';

export default function SearchProjectsClient({ initialQuery, userId, isAdmin }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [error, setError] = useState(null);
    const router = useRouter();

    const fetchResults = useCallback(async (cursor = null, isLoadMore = false) => {
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setItems([]);
        }
        setError(null);

        try {
            const url = `/api/search/projects?q=${encodeURIComponent(initialQuery)}${cursor ? `&cursor=${cursor}` : ''}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Không thể tải kết quả tìm kiếm');
            }

            const data = await response.json();
            
            if (isLoadMore) {
                setItems(prev => [...prev, ...data.items]);
            } else {
                setItems(data.items);
            }
            
            setHasMore(data.hasMore);
            setNextCursor(data.nextCursor);
        } catch (err) {
            console.error('Search projects error:', err);
            setError(err.message || 'Đã xảy ra lỗi');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [initialQuery]);

    useEffect(() => {
        fetchResults();
    }, [fetchResults]);

    const handleLoadMore = () => {
        if (nextCursor && !loadingMore) {
            fetchResults(nextCursor, true);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg bg-red-50 p-6 border border-red-200">
                <p className="text-sm text-red-800">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-4">
            {/* Results List */}
            {items.length === 0 ? (
                <div className="text-center py-12">
                    <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-600 font-medium">Không tìm thấy dự án nào</p>
                    <p className="text-sm text-gray-500 mt-2">
                        Thử tìm kiếm với từ khóa khác
                    </p>
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        {items.map((project) => (
                            <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className="block p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all group"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                                        <Folder className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-orange-700 transition-colors">
                                            {project.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Dự án
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Load More Button */}
                    {hasMore && (
                        <div className="pt-4 text-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="px-6 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                            >
                                {loadingMore ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Đang tải...
                                    </>
                                ) : (
                                    'Tải thêm dự án'
                                )}
                            </button>
                        </div>
                    )}

                    {/* End of results */}
                    {!hasMore && items.length > 0 && (
                        <div className="text-center py-4 text-sm text-gray-500">
                            Đã hiển thị tất cả {items.length} kết quả
                        </div>
                    )}
                </>
            )}

            {/* Navigation Links */}
            <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center gap-4 text-sm">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Quay lại
                    </button>
                    <span className="text-gray-300">|</span>
                    <Link
                        href={`/search/tasks?q=${encodeURIComponent(initialQuery)}`}
                        className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        Xem tất cả nhiệm vụ
                    </Link>
                    <span className="text-gray-300">|</span>
                    <Link
                        href={`/search/teams?q=${encodeURIComponent(initialQuery)}`}
                        className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        Xem tất cả nhóm
                    </Link>
                </div>
            </div>
        </div>
    );
}

