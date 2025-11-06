// app/(auth)/(main)/teams/[teamId]/analytics/page.js
// Tab "Phân tích" - Xem thống kê và bảng xếp hạng

import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getCachedTeamById } from '@/data/team/actions/cached.js';
import { getAnalytics } from '@/data/team/actions/analytics.js';
import TeamAnalytics from '@/components/team/TeamAnalytics.js';
import TeamLeaderboard from '@/components/team/TeamLeaderboard.client.js';

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
        title: `${team.name} - Phân tích | Teams`,
        description: `Xem thống kê và bảng xếp hạng của team ${team.name}`,
    };
}

export default async function TeamAnalyticsPage({ params }) {
    const { teamId } = await params;
    if (!teamId) return notFound();

    // Fetch analytics data on server
    let analyticsData = null;
    try {
        const result = await getAnalytics({ teamId });
        if (result.ok) {
            analyticsData = JSON.parse(JSON.stringify(result.data));
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }

    // Current month for leaderboard
    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return (
        <div className="space-y-6">
            <Suspense fallback={
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-24 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            }>
                <TeamAnalytics analytics={analyticsData} />
            </Suspense>

            <TeamLeaderboard teamId={teamId} initialYm={currentYm} />
        </div>
    );
}
