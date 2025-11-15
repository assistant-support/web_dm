// app/(auth)/(main)/projects/[projectId]/members/page.js

import { notFound, redirect } from 'next/navigation';
import MemberList from '@/components/project/MemberList';
import { getProjectDetail } from '@/data/project/actions/list';
import { getCurrentUser } from '@/lib/request-user';
import { getUsersDisplayInfo } from '@/lib/user-display';
import { getBatchProjectMemberStats } from '@/data/project/processors/member-stats';

// Revalidate every 3 seconds for real-time updates
export const revalidate = 3;

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

    // Get user display info and stats for all members in parallel
    const memberIds = (project.members || []).map(m => m.userId);
    const [usersMapResult, memberStatsResult] = await Promise.all([
        getUsersDisplayInfo(memberIds),
        getBatchProjectMemberStats(projectId, memberIds, null) // null = current month
    ]);

    const usersMap = {};
    if (usersMapResult) {
        usersMapResult.forEach((value, key) => { usersMap[key] = value; });
    }

    // Check if user can manage (owner or manager)
    const userMember = project.members?.find(m => m.userId === user.externalUserId);
    const canManage = userMember && (userMember.role === 'owner' || userMember.role === 'manager');

    return (
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Thành viên dự án</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Quản lý thành viên và xem thống kê hiệu suất
                    </p>
                </div>

                {/* Member List - Server Component with stats */}
                <MemberList
                    projectId={projectId}
                    teamId={project.team}
                    members={project.members || []}
                    usersMap={usersMap}
                    memberStats={memberStatsResult || {}}
                    isManager={canManage}
                    currentUserId={user.externalUserId}
                />
            </div>
        </div>
    );
}
