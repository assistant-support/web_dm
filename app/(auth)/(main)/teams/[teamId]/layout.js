// app/(auth)/(main)/teams/[teamId]/layout.js
// Layout cho team detail với tab navigation
// Tối ưu: Đã BỎ `force-dynamic`. Trang này sẽ được cache.
// `getCachedTeamById` sử dụng React.cache để deduplicate requests giữa layout và pages.

import { notFound } from 'next/navigation';
import { getCachedTeamById } from '@/data/team/actions/cached.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { isTeamManager } from '@/lib/permissions.js';
import TeamHeader from '@/components/team/TeamHeader.js';
import TeamTabs from '@/components/team/TeamTabs.client.js';

export default async function TeamLayout({ children, params }) {
    const { teamId } = await params;
    if (!teamId) return notFound();

    const user = await getCurrentUser();
    const result = await getCachedTeamById(teamId);

    // Handle error hoặc not found
    if (!result.ok) {
        if (result.code === 'NOT_FOUND' || result.message?.includes('NOT_FOUND')) {
            return notFound();
        }
        return (
            <div className="space-y-6 w-full">
                <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                                Có lỗi xảy ra
                            </h3>
                            <div className="mt-2 text-sm text-red-700">
                                {result.message || 'Không thể tải thông tin team'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Serialize team data để tránh lỗi MongoDB ObjectId
    const team = JSON.parse(JSON.stringify(result.data));
    const currentUserId = user?.externalUserId;
    const userIsManager = isTeamManager(team, currentUserId);

    return (
        <div className="gap-3 w-full flex flex-col">
            <TeamHeader team={team} isManager={userIsManager} />
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col flex-1">
                <TeamTabs teamId={team._id} isManager={userIsManager} />
                <div className="p-6 overflow-scroll flex-1 flex flex-col">
                    {children}
                </div>
            </div>
        </div>
    );
}