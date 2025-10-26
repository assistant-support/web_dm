// app/(auth)/(main)/projects/[projectId]/members/page.js

import { notFound, redirect } from 'next/navigation';
import MemberListWrapper from '@/components/project/MemberListWrapper.client';
import { getProjectDetail } from '@/data/project/actions/list';
import { getCurrentUser } from '@/lib/request-user';

export const dynamic = 'force-dynamic';

export default async function ProjectMembersPage({ params }) {
    const { projectId } = await params;

    // Get current user
    const user = await getCurrentUser();
    if (!user || !user.externalUserId) {
        redirect('/login');
    }

    // Get project details with members
    const result = await getProjectDetail(projectId);
    if (!result.ok) {
        notFound();
    }
    
    const project = result.data;
    if (!project) {
        notFound();
    }

    // Check if user can manage (owner or manager)
    const userMember = project.members?.find(m => m.userId === user.externalUserId);
    const canManage = userMember && (userMember.role === 'owner' || userMember.role === 'manager');

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900">Members</h2>
                <p className="text-sm text-gray-600 mt-1">
                    Quản lý thành viên trong dự án
                </p>
            </div>

            {/* Member List Wrapper */}
            <MemberListWrapper
                projectId={projectId}
                initialMembers={project.members || []}
                canManage={canManage}
            />
        </div>
    );
}
