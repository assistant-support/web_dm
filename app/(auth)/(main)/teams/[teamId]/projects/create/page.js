// app/(auth)/(main)/teams/[teamId]/projects/create/page.js
// Mục đích: Trang tạo project mới cho team (SSR)

import { notFound } from 'next/navigation';
import { getByIdAction } from '@/data/team/actions/server.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { isTeamManager } from '@/lib/permissions.js';
import ProjectForm from '@/components/project/ProjectForm.client.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function CreateProjectPage({ params }) {
    // Await params theo Next.js 15
    const { teamId } = await params;
    if (!teamId) return notFound();

    const user = await getCurrentUser();
    
    // Lấy team info
    const teamResult = await getByIdAction(teamId);
    if (!teamResult.ok) {
        if (teamResult.code === 'NOT_FOUND' || teamResult.message?.includes('NOT_FOUND')) {
            return notFound();
        }
        return (
            <div className="space-y-6">
                <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-800">
                        {teamResult.message || 'Failed to load team'}
                    </p>
                </div>
            </div>
        );
    }

    const team = teamResult.data;

    // Kiểm tra quyền: chỉ team manager mới được tạo project
    if (!isTeamManager(team, user.externalUserId)) {
        return (
            <div className="space-y-6">
                <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-800">
                        You don't have permission to create projects in this team.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Team: {team.name}
                </p>
            </div>

            {/* Form */}
            <div className="bg-white shadow rounded-lg p-6">
                <ProjectForm teamId={teamId} />
            </div>
        </div>
    );
}
