// app/(auth)/(main)/teams/[teamId]/activity/page.js
// Tab "Hoạt động" - Xem lịch sử hoạt động của team

import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getCachedTeamById } from '@/data/team/actions/cached.js';
import { getActivities } from '@/data/team/actions/activities.js';
import { getUsersDisplayInfo } from '@/lib/user-display';
import TeamActivityLog from '@/components/team/TeamActivityLog.client.js';

const ITEMS_PER_PAGE = 10;

// Revalidate every 3 seconds for real-time updates
export const revalidate = 3;

// Metadata for SEO
export async function generateMetadata({ params }) {
    const { teamId } = await params;
    const result = await getCachedTeamById(teamId);
    
    if (!result.ok) {
        return {
            title: 'Team Not Found',
        };
    }

    const team = result.data;
    return {
        title: `${team.name} - Hoạt động | Teams`,
        description: `Xem lịch sử hoạt động của team ${team.name}`,
    };
}

export default async function TeamActivityPage({ params }) {
    const { teamId } = await params;
    if (!teamId) return notFound();
    const initialActivityResult = await getActivities({
        teamId,
        limit: ITEMS_PER_PAGE,
        skip: 0
    });

    let initialActivities = [];
    let initialTotal = 0;
    let initialHasMore = false;
    let initialUsersMap = {};

    if (initialActivityResult.ok) {
        initialActivities = initialActivityResult.data.items || [];
        initialTotal = initialActivityResult.data.total || 0;
        initialHasMore = initialActivityResult.data.hasMore || false;
        const actorIds = initialActivities.map(act => act.actor).filter(Boolean);
        const usersInfoMap = await getUsersDisplayInfo(actorIds);
        usersInfoMap.forEach((value, key) => {
            initialUsersMap[key] = value;
        });
    } else {
        console.error("Failed to load initial activities:", initialActivityResult.message);
    }

    return (
        <Suspense fallback={
            <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        }>
            <TeamActivityLog
                teamId={teamId}
                initialActivities={JSON.parse(JSON.stringify(initialActivities))}
                initialTotal={initialTotal}
                initialHasMore={initialHasMore}
                initialUsersMap={initialUsersMap}
                itemsPerPage={ITEMS_PER_PAGE}
            />
        </Suspense>
    );
}