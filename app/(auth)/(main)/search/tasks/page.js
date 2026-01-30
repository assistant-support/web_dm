// app/(auth)/(main)/search/tasks/page.js
// Trang xem tất cả kết quả search tasks

import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/request-user';
import SearchTasksClient from './SearchTasksClient.client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ searchParams }) {
    const params = await searchParams;
    const query = params?.q || '';
    return {
        title: query ? `Tìm kiếm nhiệm vụ: "${query}" | Web DM` : 'Tìm kiếm nhiệm vụ | Web DM',
        description: `Kết quả tìm kiếm nhiệm vụ cho từ khóa "${query}"`
    };
}

export default async function SearchTasksPage({ searchParams }) {
    const params = await searchParams;
    const query = params?.q || '';
    const user = await getCurrentUser();

    if (!query.trim()) {
        return (
            <div className="space-y-6">
                <div className="rounded-lg bg-yellow-50 p-6 border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                        Vui lòng nhập từ khóa tìm kiếm
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white p-4 rounded-md border border-gray-200 z-10 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Tìm kiếm nhiệm vụ
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Kết quả cho: <span className="font-medium">&quot;{query}&quot;</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <div className="p-4">
                    <Suspense fallback={
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    }>
                        <SearchTasksClient 
                            initialQuery={query}
                            userId={user?.externalUserId}
                            isAdmin={user?.role === 'admin'}
                        />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

