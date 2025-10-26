// app/(auth)/(main)/projects/[projectId]/layout.js
import { notFound, redirect } from 'next/navigation';
import { getProjectDetail } from '@/data/project/actions/list.js';
import { getCurrentUser } from '@/lib/request-user.js';
import ProjectTabs from '@/components/project/ProjectTabs.client.js';
import ProjectHeader from '@/components/project/ProjectHeader.client.js';

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
        <div className='w-full flex flex-col gap-3'>
            <ProjectHeader project={project} canManage={isOwnerOrManager} />
            <ProjectTabs
                projectId={projectId}
                isOwnerOrManager={isOwnerOrManager}
            />
            <div className="flex-1 overflow-scroll">
                {children}
            </div>
        </div>
    );
}
