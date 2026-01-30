// app/(auth)/(main)/projects/[projectId]/members/page.js

import { notFound, redirect } from 'next/navigation';
import MemberList from '@/components/project/MemberList';
import { getProjectDetail } from '@/data/project/actions/list';
import { getCurrentUser } from '@/lib/request-user';
import { getUsersDisplayInfo } from '@/lib/user-display';
import { getBatchProjectMemberStats } from '@/data/project/processors/member-stats';
import { safeSerialize, toPlainId } from '@/lib/serialize.js';

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

    const isAdmin = user.role === 'admin';

    // Get user display info and stats for all members in parallel
    const memberIds = (project.members || []).map(m => String(m.userId));
    const [usersMapResult, memberStatsResult] = await Promise.all([
        getUsersDisplayInfo(memberIds),
        getBatchProjectMemberStats(projectId, memberIds, null) // null = current month
    ]);

    const usersMap = {};
    if (usersMapResult) {
        usersMapResult.forEach((value, key) => { usersMap[String(key)] = value; });
    }

    // Serialize project data before passing to Client Components
    // Serialize teamId - convert ObjectId to string
    const serializedTeamId = project.team ? toPlainId(project.team) : null;
    
    // Serialize members - ensure userId is string
    const serializedMembers = (project.members || []).map(m => ({
        userId: String(m.userId),
        role: m.role,
        createdAt: m.createdAt ? (m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt)) : null,
        updatedAt: m.updatedAt ? (m.updatedAt instanceof Date ? m.updatedAt.toISOString() : String(m.updatedAt)) : null,
    }));

    // Serialize memberStats - ensure all IDs are strings
    const serializedMemberStats = safeSerialize(memberStatsResult || {});

    // Check if user can manage (owner hoặc manager trong dự án, hoặc admin hệ thống)
    const userMember = project.members?.find(m => String(m.userId) === String(user.externalUserId));
    const canManage = isAdmin || (userMember && (userMember.role === 'owner' || userMember.role === 'manager'));

    return (
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="pt-6 space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Thành viên dự án</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Quản lý thành viên và xem thống kê hiệu suất
                    </p>
                </div>

                {/* Member List - Server Component with stats */}
                <MemberList
                    projectId={String(projectId)}
                    teamId={serializedTeamId}
                    members={serializedMembers}
                    usersMap={safeSerialize(usersMap)}
                    memberStats={serializedMemberStats}
                    isManager={canManage}
                    isActive={project.isActive}
                    currentUserId={String(user.externalUserId)}
                />
            </div>
        </div>
    );
}
