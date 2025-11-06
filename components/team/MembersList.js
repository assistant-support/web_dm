// components/team/MembersList.js
// Server Component - Render danh sách members

import MemberRow from './MemberRow.js';
import AddMemberButton from './AddMemberButton.client.js';

/**
 * MembersList Server Component
 * Render danh sách members với stats
 * Add button được tách ra Client Component
 * 
 * @param {Object} props
 * @param {Array} props.members - Array of members
 * @param {string} props.teamId - Team ID
 * @param {boolean} props.isManager - User có quyền quản lý không
 * @param {string} props.currentUserId - Current user ID
 * @param {Object} props.usersMap - Map userId -> userInfo
 * @param {Object} props.memberStats - Map userId -> stats
 */
export default function MembersList({
    members,
    teamId,
    isManager,
    currentUserId,
    usersMap,
    memberStats,
}) {
    // Server-side sorting
    const sortedMembers = [...members].sort((a, b) => {
        // Managers first
        if (a.role !== b.role) {
            return a.role === 'manager' ? -1 : 1;
        }
        // Then by join date
        return new Date(a.joinedAt) - new Date(b.joinedAt);
    });

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        Thành viên
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {members.length} người trong nhóm
                    </p>
                </div>
                
                {/* Add Button - Client Component */}
                {isManager && (
                    <AddMemberButton
                        teamId={teamId}
                        existingMemberIds={members.map(m => m.userId)}
                    />
                )}
            </div>

            <div className="divide-y divide-gray-200">
                {sortedMembers.map((member) => (
                    <MemberRow
                        key={member.userId}
                        member={member}
                        teamId={teamId}
                        isManager={isManager}
                        currentUserId={currentUserId}
                        userInfo={usersMap[member.userId]}
                        stats={memberStats?.[member.userId]}
                    />
                ))}
            </div>

            {members.length === 0 && (
                <div className="px-6 py-12 text-center text-gray-500">
                    <p>Chưa có thành viên nào trong nhóm</p>
                </div>
            )}
        </div>
    );
}
