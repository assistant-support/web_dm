// app/(auth)/(main)/teams/[teamId]/settings/page.js
// Tab "Cài đặt" - Quản lý settings team (chỉ cho managers)

import { notFound, redirect } from 'next/navigation';
import { getByIdAction } from '@/data/team/actions/server.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { isTeamManager } from '@/lib/permissions.js';
import TeamSettings from '@/components/team/TeamSettings.client.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function TeamSettingsPage({ params }) {
    const teamId = await params?.teamId;
    if (!teamId) return notFound();

    const user = await getCurrentUser();
    const result = await getByIdAction(teamId);
    
    if (!result.ok) return notFound();

    const team = JSON.parse(JSON.stringify(result.data));
    const currentUserId = user?.externalUserId;
    const userIsManager = isTeamManager(team, currentUserId);

    // Only managers can access settings
    if (!userIsManager) {
        redirect(`/teams/${teamId}`);
    }

    return (
        <div>
            <TeamSettings
                team={team}
                currentUserId={currentUserId}
                isManager={userIsManager}
            />
        </div>
    );
}
