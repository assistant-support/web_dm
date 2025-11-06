// app/(auth)/(main)/teams/page.js
// Server Component - Trang danh sách teams (Next.js 16 optimized)

import { listMy } from '@/data/team/actions/server.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { Suspense } from 'react';

// Import các components
import TeamsList from '@/components/team/TeamsList.js';
import ViewModeToggle from '@/components/team/ViewModeToggle.client.js';
import CreateTeamButton from '@/components/team/CreateTeamButton.client.js';

// Revalidate every 3 seconds for real-time updates
export const revalidate = 3;

/**
 * Metadata cho trang teams
 */
export const metadata = {
    title: 'Nhóm làm việc | Web DM',
    description: 'Quản lý và cộng tác với các nhóm làm việc của bạn',
};

/**
 * TeamsPage - Server Component
 * Tối ưu với Next.js 16:
 * - Server Component thuần, không client state
 * - View mode sync với URL params
 * - Suspense boundaries cho loading
 * - Static data fetching khi có thể
 */
export default async function TeamsPage({ searchParams }) {
    // Await searchParams once (Next.js 15+)
    const params = await searchParams;
    const user = await getCurrentUser();
    const result = await listMy();

    // Handle error state
    if (!result.ok) {
        return (
            <div className="space-y-6 w-full">
                <div className="rounded-lg bg-red-50 p-6 border border-red-200">
                    <div className="flex items-start gap-3">
                        <svg className="h-6 w-6 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-800 mb-1">
                                Không thể tải danh sách nhóm
                            </h3>
                            <div className="text-sm text-red-700">
                                {result.message || 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const teams = result.data || [];

    // Sort teams: active first, then by updatedAt
    const sortedTeams = [...teams].sort((a, b) => {
        if (a.isActive !== b.isActive) {
            return a.isActive ? -1 : 1;
        }
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    // Get view mode từ URL params (already awaited above)
    const viewMode = params?.view || 'card';
    const hasTeams = sortedTeams.length > 0;

    return (
        <div className="space-y-6 w-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Nhóm làm việc</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Quản lý và cộng tác với các nhóm của bạn
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {hasTeams && (
                        <Suspense fallback={<div className="h-10 w-24 bg-gray-100 rounded-lg animate-pulse" />}>
                            <ViewModeToggle />
                        </Suspense>
                    )}
                    <CreateTeamButton />
                </div>
            </div>
            <Suspense fallback={
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            }>
                <TeamsList teams={sortedTeams} currentUserId={user?.externalUserId} viewMode={viewMode} />
            </Suspense>
        </div>
    );
}