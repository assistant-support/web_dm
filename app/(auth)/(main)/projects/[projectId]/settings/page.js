// app/(auth)/(main)/projects/[projectId]/settings/page.js
import { redirect, notFound } from 'next/navigation';
import { getProjectDetail } from '@/data/project/actions/list.js';
import { getCurrentUser } from '@/lib/request-user.js';
import ProjectSettings from '@/components/project/ProjectSettings.client.js';

// Revalidate every 3 seconds for real-time updates
export const revalidate = 3;

export async function generateMetadata({ params }) {
    const { projectId } = await params;
    const result = await getProjectDetail(projectId);

    if (!result.ok) {
        return {
            title: 'Project Not Found',
        };
    }

    const project = result.data;
    return {
        title: `${project.name} - Settings | Projects`,
        description: `Manage settings for ${project.name}`,
    };
}

export default async function ProjectSettingsPage({ params }) {
    const { projectId } = await params;
    
    if (!projectId) return notFound();
    
    const user = await getCurrentUser();

    const result = await getProjectDetail(projectId);

    if (!result.ok) {
        return notFound();
    }

    const project = result.data;

    const isAdmin = user.role === 'admin';

    // Check if user is owner or manager (hoặc admin hệ thống)
    const userMember = project.members.find(m => m.userId === user.externalUserId);
    const isOwnerOrManager = userMember && (userMember.role === 'owner' || userMember.role === 'manager');

    if (!isOwnerOrManager && !isAdmin) {
        redirect(`/projects/${projectId}`);
    }

    return (
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="p-6 space-y-6">
                <ProjectSettings project={project} />
            </div>
        </div>
    );
}
