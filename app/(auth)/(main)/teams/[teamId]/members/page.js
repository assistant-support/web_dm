// app/(auth)/(main)/teams/[teamId]/members/page.js
// Tab "Thành viên" - Quản lý thành viên team

import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getCachedTeamById } from '@/data/team/actions/cached.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { isTeamManager } from '@/lib/permissions.js';
import { getMembersStats } from '@/data/team/actions/member-stats';
import { getUsersDisplayInfo } from '@/lib/user-display';
import MembersList from '@/components/team/MembersList.js';

// Revalidate every 3 seconds for real-time updates
export const revalidate = 3;

// Metadata for SEO
export async function generateMetadata({ params }) {
    const { teamId } = await params;
    const result = await getCachedTeamById(teamId);
    
    if (!result.ok) {
        return {
            title: 'Team Not Found',
        };
    }

    const team = result.data;
    return {
        title: `${team.name} - Thành viên | Teams`,
        description: `Quản lý thành viên của team ${team.name}`,
    };
}

export default async function TeamMembersPage({ params }) {
    const { teamId } = await params;
    if (!teamId) return notFound();

    const user = await getCurrentUser();

    // Lấy data team (chỉ chứa ID thành viên) - sử dụng cached version
    const teamResult = await getCachedTeamById(teamId);
    if (!teamResult.ok) return notFound();

    const team = JSON.parse(JSON.stringify(teamResult.data));
    const currentUserId = user?.externalUserId;
    const userIsManager = isTeamManager(team, currentUserId);

    // Tối ưu: Lấy ID thành viên và gọi batch
    const memberUserIds = (team.members || []).map(m => m.userId);
    // Sửa đổi: Gọi đúng tên hàm
    const usersInfoMap = await getUsersDisplayInfo(memberUserIds);

    // Sửa đổi: Chuyển Map thành Object để serialize cho client
    const usersMapObject = {};
    usersInfoMap.forEach((value, key) => {
        usersMapObject[key] = value;
    });

    // Lấy stats (giữ nguyên từ logic trước)
    // Lưu ý: Nếu getUsersDisplayInfo đã có cache riêng (như runtime-cache),
    // thì việc gọi getMembersStats riêng lẻ có thể không cần thiết nếu stats đơn giản.
    // Nhưng nếu stats phức tạp (từ Task, Project), thì vẫn cần gọi getMembersStats.
    // Đoạn code này giả định bạn vẫn cần getMembersStats.
    let memberStats = {};
    try {
        // Bạn có thể cân nhắc gọi hàm này song song với getUsersDisplayInfo
        const statsResult = await getMembersStats({ teamId });
        if (statsResult.ok) {
            memberStats = JSON.parse(JSON.stringify(statsResult.data));
        }
    } catch (statsError) {
        console.error("Error fetching member stats in page.js:", statsError);
        // Để memberStats là object rỗng nếu có lỗi
    }


    return (
        <div>
            <Suspense fallback={
                <div className="bg-white rounded-lg border border-gray-200 p-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
            }>
                <MembersList
                    members={team.members || []}
                    teamId={team._id}
                    isManager={userIsManager}
                    currentUserId={currentUserId}
                    usersMap={usersMapObject}
                    memberStats={memberStats}
                />
            </Suspense>
        </div>
    );
}