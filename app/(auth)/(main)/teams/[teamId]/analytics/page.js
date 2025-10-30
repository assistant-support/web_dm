// app/(auth)/(main)/teams/[teamId]/analytics/page.js
// Tab "Phân tích" - Xem thống kê và bảng xếp hạng

import { notFound } from 'next/navigation';
import TeamAnalytics from '@/components/team/TeamAnalytics.client.js';
import TeamLeaderboard from '@/components/team/TeamLeaderboard.client.js';

export default async function TeamAnalyticsPage({ params }) {
    const { teamId } = await params;
    if (!teamId) return notFound();

    // Current month for leaderboard
    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return (
        <div className="space-y-6">
            <TeamAnalytics teamId={teamId} />
            <TeamLeaderboard teamId={teamId} initialYm={currentYm} />
        </div>
    );
}
