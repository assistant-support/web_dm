// app/(auth)/(main)/projects/[projectId]/layout.js
import { notFound, redirect } from 'next/navigation';
import { getProjectDetail } from '@/data/project/actions/list.js';
import { getCurrentUser } from '@/lib/request-user.js';
import ProjectTabs from '@/components/project/ProjectTabs.client.js';
import ProjectHeader from '@/components/project/ProjectHeader.server.js';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailLayout({ children, params }) {
    const { projectId } = await params;
    const user = await getCurrentUser();

    if (!user) {
        redirect('/login');
    }

    // Get project detail with member check
    const result = await getProjectDetail(projectId);

    if (!result.ok) {
        if (result.message === 'Project not found') {
            notFound();
        }
        if (result.message === 'You are not a member of this project') {
            redirect('/projects');
        }
        throw new Error(result.message);
    }

    const project = result.data;
    
    // Check if user is owner or manager
    const userMember = project.members.find(m => m.userId === user.externalUserId);
    const isOwnerOrManager = userMember && (userMember.role === 'owner' || userMember.role === 'manager');

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Project Header */}
            <ProjectHeader project={project} canManage={isOwnerOrManager} />

            {/* Tabs */}
            <div className="mt-6">
                <ProjectTabs 
                    projectId={projectId} 
                    isOwnerOrManager={isOwnerOrManager}
                />
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {children}
            </div>
        </div>
    );
}
