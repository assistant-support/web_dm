// app/(auth)/(main)/teams/[teamId]/settings/page.js
// Tab "Cài đặt" - Quản lý settings team (chỉ cho managers)

import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCachedTeamById } from '@/data/team/actions/cached.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { isTeamManager } from '@/lib/permissions.js';
import TeamSettings from '@/components/team/TeamSettings.client.js';

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
        title: `${team.name} - Cài đặt | Teams`,
        description: `Quản lý cài đặt của team ${team.name}`,
    };
}

export default async function TeamSettingsPage({ params }) {
    const teamId = await params?.teamId;
    if (!teamId) return notFound();

    const user = await getCurrentUser();
    const result = await getCachedTeamById(teamId);
    
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
            <Suspense fallback={
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="space-y-3 mt-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            }>
                <TeamSettings
                    team={team}
                    currentUserId={currentUserId}
                    isManager={userIsManager}
                />
            </Suspense>
        </div>
    );
}
