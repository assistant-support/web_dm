// app/(auth)/(main)/teams/page.js
// Server Component - Trang danh sách teams (Next.js 16 optimized)

import { listMy, listMyAll } from '@/data/team/actions/server.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { Suspense } from 'react';
import Button from '@/components/ui/button';
import Link from 'next/link';
import TeamsList from '@/components/team/TeamsList.js';
import CreateTeamButton from '@/components/team/CreateTeamButton.client.js';
import TeamsClientList from '@/components/team/TeamsClientList.client.js';
import { Package } from 'lucide-react';
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
    const showArchived = params?.showArchived === '1' || params?.showArchived === 'true';
    const result = showArchived ? await listMyAll() : await listMy();

    // Handle error state
    if (!result.ok) {
        return (
            <div className="space-y-6 w-full flex flex-col">
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

    // Prepare a client-safe copy of teams for passing to client components
    const clientTeams = sortedTeams.map(t => JSON.parse(JSON.stringify(t)));

    return (
        <div className="space-y-6 w-full flex flex-col">
            <div className="sticky top-0 bg-white z-10 p-4 rounded-md border border-gray-200">
                <div className="max-w-full px-0">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Nhóm làm việc</h1>
                            <p className="mt-1 text-sm text-gray-600">Quản lý và cộng tác với các nhóm của bạn</p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Create button always visible */}
                            <CreateTeamButton />
                            <div id="teams-client-controls-root" className="inline-flex items-center ml-2" />
                            <Link href={showArchived ? '?' : '?showArchived=1'}  >
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="!text-white !font-normal"
                                    tabIndex={-1}
                                >
                                    <Package className='w-3.5 h-3.5 mr-4' />
                                    <p className='text-white text-sm font-semibold'>{showArchived ? 'Ẩn lưu trữ' : 'Tất cả'}</p>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable list area: constrain height to viewport so long lists scroll and header stays visible */}
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <Suspense
                    fallback={
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    }
                >
                    {/* Server-rendered initial view (improves FCP/SEO) */}
                    <div id="teams-server-root">
                        <TeamsList teams={sortedTeams} currentUserId={user?.externalUserId} viewMode={viewMode} />
                    </div>

                    {/* Client toggle/renderer: will replace server HTML on demand when users switch view */}
                    <TeamsClientList
                        teams={clientTeams}
                        currentUserId={user?.externalUserId}
                        initialView={viewMode}
                        serverRootId="teams-server-root"
                        controlsRootId="teams-client-controls-root"
                    />
                </Suspense>
            </div>
        </div>
    );
}