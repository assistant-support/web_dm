// app/(auth)/(main)/projects/[projectId]/settings/page.js
import { redirect } from 'next/navigation';
import { getProjectDetail } from '@/data/project/actions/list.js';
import { getCurrentUser } from '@/lib/request-user.js';
import ProjectSettings from '@/components/project/ProjectSettings.client.js';

export const dynamic = 'force-dynamic';

export default async function ProjectSettingsPage({ params }) {
    const { projectId } = await params;
    const user = await getCurrentUser();

    const result = await getProjectDetail(projectId);

    if (!result.ok) {
        return <div>Error loading settings</div>;
    }

    const project = result.data;

    // Check if user is owner or manager
    const userMember = project.members.find(m => m.userId === user.externalUserId);
    const isOwnerOrManager = userMember && (userMember.role === 'owner' || userMember.role === 'manager');

    if (!isOwnerOrManager) {
        redirect(`/projects/${projectId}`);
    }

    return <ProjectSettings project={project} />;
}
