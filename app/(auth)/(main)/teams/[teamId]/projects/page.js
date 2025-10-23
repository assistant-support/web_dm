// app/(auth)/(main)/teams/[teamId]/projects/page.js
// Mục đích: Danh sách projects của team (SSR)

import { notFound } from 'next/navigation';
import { getByIdAction } from '@/data/team/actions/server.js';
import { listByTeamAction } from '@/data/project/actions/server.js';
import TeamProjectsPageClient from '@/components/project/TeamProjectsPageClient.client.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function TeamProjectsPage({ params }) {
    // Await params theo Next.js 15
    const { teamId } = await params;
    if (!teamId) return notFound();
    
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

    // Lấy danh sách projects
    const projectsResult = await listByTeamAction(teamId);
    
    if (!projectsResult.ok) {
        return (
            <div className="space-y-6">
                <div className="rounded-md bg-yellow-50 p-4">
                    <p className="text-sm text-yellow-800">
                        {projectsResult.message || 'Failed to load projects'}
                    </p>
                </div>
            </div>
        );
    }

    const projects = projectsResult.data;

    return <TeamProjectsPageClient team={team} initialProjects={projects} />;
}
