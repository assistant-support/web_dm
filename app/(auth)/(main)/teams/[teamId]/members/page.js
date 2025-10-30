// app/(auth)/(main)/teams/[teamId]/members/page.js
// Tab "Thành viên" - Quản lý thành viên team

import { notFound } from 'next/navigation';
import { getByIdAction } from '@/data/team/actions/server.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { isTeamManager } from '@/lib/permissions.js';
import { getMembersStats } from '@/data/team/actions/member-stats';
import { getUsersDisplayInfo } from '@/lib/user-display';
import MemberList from '@/components/team/MemberList.client.js';

// Tối ưu: Đã BỎ `force-dynamic`. Cache được bật.

export default async function TeamMembersPage({ params }) {
    const { teamId } = await params;
    if (!teamId) return notFound();

    const user = await getCurrentUser();

    // Lấy data team (chỉ chứa ID thành viên)
    const teamResult = await getByIdAction(teamId);
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
            <MemberList
                members={team.members || []}
                teamId={team._id}
                isManager={userIsManager}
                currentUserId={currentUserId}
                // Sửa đổi: Truyền object đã serialize
                usersMap={usersMapObject}
                initialMemberStats={memberStats} // Giữ lại từ prompt trước
            />
        </div>
    );
}