// app/(auth)/(main)/teams/[teamId]/activity/page.js
// Tab "Hoạt động" - Xem lịch sử hoạt động của team

import { notFound } from 'next/navigation';
import { getActivities } from '@/data/team/actions/activities.js';
import { getUsersDisplayInfo } from '@/lib/user-display';
import TeamActivityLog from '@/components/team/TeamActivityLog.client.js';

const ITEMS_PER_PAGE = 10;

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
        <TeamActivityLog
            teamId={teamId}
            initialActivities={JSON.parse(JSON.stringify(initialActivities))}
            initialTotal={initialTotal}
            initialHasMore={initialHasMore}
            initialUsersMap={initialUsersMap}
            itemsPerPage={ITEMS_PER_PAGE}
        />
    );
}