// app/project/[id]/analytics/page.js
// Project Analytics Page (Server Component)

import { Suspense } from 'react';
import getProjectAnalytics from '@/app/actions/get-project-analytics.js';
import StatCardGrid from '@/components/project/analytics/StatCardGrid.client.js';
import MemberActivityList from '@/components/project/analytics/MemberActivityList.client.js';

function StatCardGridFallback() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, idx) => (
                <div
                    key={idx}
                    className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-gray-100"
                />
            ))}
        </div>
    );
}

function MemberActivityFallback() {
    return (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6">
            <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
            <div className="mt-4 space-y-3">
                {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="h-12 animate-pulse rounded-lg bg-gray-200" />
                ))}
            </div>
        </div>
    );
}

export default async function ProjectAnalyticsPage({ params }) {
    const projectId = params?.id;
    if (!projectId) {
        throw new Error('Missing projectId in route parameters.');
    }

    const analytics = await getProjectAnalytics(projectId);

    const stats = {
        totalTasks: analytics.totalTasks,
        completedTasks: analytics.completedTasks,
        inProgressTasks: analytics.inProgressTasks,
        totalPointsAwarded: analytics.totalPointsAwarded,
    };

    return (
        <div className="space-y-8">
            <Suspense fallback={<StatCardGridFallback />}>
                <StatCardGrid stats={stats} />
            </Suspense>

            <Suspense fallback={<MemberActivityFallback />}>
                <MemberActivityList memberStats={analytics.memberStats || []} />
            </Suspense>
        </div>
    );
}
