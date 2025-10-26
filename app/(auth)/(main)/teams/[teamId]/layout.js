// app/(auth)/(main)/teams/[teamId]/layout.js
// Layout cho team detail với tab navigation

import { notFound } from 'next/navigation';
import { getByIdAction } from '@/data/team/actions/server.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { isTeamManager } from '@/lib/permissions.js';
import TeamHeader from '@/components/team/TeamHeader.client.js';
import TeamTabs from '@/components/team/TeamTabs.client.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function TeamLayout({ children, params }) {
    const teamId = await params?.teamId;
    if (!teamId) return notFound();

    const user = await getCurrentUser();
    const result = await getByIdAction(teamId);

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
        <div className="space-y-6 w-full flex flex-col">
            {/* Team Header */}
            <TeamHeader team={team} isManager={userIsManager} />

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col flex-1">
                <TeamTabs teamId={team._id} isManager={userIsManager} />

                {/* Tab Content */}
                <div className="p-6 overflow-scroll flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
