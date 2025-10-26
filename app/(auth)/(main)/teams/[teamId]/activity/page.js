// app/(auth)/(main)/teams/[teamId]/activity/page.js
// Tab "Hoạt động" - Xem lịch sử hoạt động của team

import { notFound } from 'next/navigation';
import TeamActivityLog from '@/components/team/TeamActivityLog.client.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function TeamActivityPage({ params }) {
    const teamId = await params?.teamId;
    if (!teamId) return notFound();

    return (
        <TeamActivityLog teamId={teamId} />
    );
}
