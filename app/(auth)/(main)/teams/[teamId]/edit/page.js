import { notFound, redirect } from 'next/navigation';
import { getByIdAction } from '@/data/team/actions/server.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { isTeamManager } from '@/lib/permissions.js';
import TeamEditClient from './page.client.js';

export const dynamic = 'force-dynamic';

export default async function TeamEditPage({ params }) {
    const teamId = params?.teamId;
    if (!teamId) return notFound();

    const user = await getCurrentUser();
    const result = await getByIdAction(teamId);
    
    if (!result.ok) {
        if (result.code === 'NOT_FOUND') {
            return notFound();
        }
        return (
            <div className="max-w-3xl mx-auto">
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                    <h3 className="text-sm font-medium text-red-800">Có lỗi xảy ra</h3>
                    <div className="mt-2 text-sm text-red-700">
                        {result.message || 'Không thể tải thông tin team'}
                    </div>
                </div>
            </div>
        );
    }

    const team = result.data;
    const currentUserId = user?.externalUserId;
    const userIsManager = isTeamManager(team, currentUserId);

    // Chỉ manager mới được edit
    if (!userIsManager) {
        redirect(`/teams/${teamId}`);
    }

    return <TeamEditClient team={team} />;
}
