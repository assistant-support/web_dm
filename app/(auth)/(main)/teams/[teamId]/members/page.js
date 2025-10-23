// app/(auth)/(main)/teams/[teamId]/members/page.js
// Tab "Thành viên" - Quản lý thành viên team

import { notFound } from 'next/navigation';
import { getByIdAction } from '@/data/team/actions/server.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { isTeamManager } from '@/lib/permissions.js';
import MemberList from '@/components/team/MemberList.client.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function TeamMembersPage({ params }) {
    const teamId = await params?.teamId;
    if (!teamId) return notFound();

    const user = await getCurrentUser();
    const result = await getByIdAction(teamId);
    
    if (!result.ok) return notFound();

    const team = JSON.parse(JSON.stringify(result.data));
    const currentUserId = user?.externalUserId;
    const userIsManager = isTeamManager(team, currentUserId);

    return (
        <div>
            <MemberList
                members={team.members || []}
                teamId={team._id}
                isManager={userIsManager}
                currentUserId={currentUserId}
            />
        </div>
    );
}
