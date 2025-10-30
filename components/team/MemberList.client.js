// components/team/MemberList.client.js
// Mục đích: Danh sách members với add member button và stats
'use client';

import { useState, useMemo } from 'react';
import { UserPlus } from 'lucide-react';
import MemberRow from './MemberRow.client.js';
import AddMemberDialog from './AddMemberDialog.client.js';
// Tối ưu: Không cần `getMembersStats`, `useEffect` hay `useState` cho stats

export default function MemberList({
    members,
    teamId,
    isManager,
    currentUserId,
    usersMap, // Tối ưu: Nhận map thông tin user
    // Giữ lại initialMemberStats từ prompt trước
    initialMemberStats
}) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const sortedMembers = useMemo(() => {
        return [...members].sort((a, b) => {
            if (a.role !== b.role) {
                return a.role === 'manager' ? -1 : 1;
            }
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
    }, [members]);

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
                {isManager && (
                    <button
                        onClick={() => setIsAddDialogOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-600)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2 transition-all shadow-sm"
                    >
                        <UserPlus className="h-4 w-4" />
                        Thêm thành viên
                    </button>
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
                        // Tối ưu: Truyền userInfo cụ thể
                        userInfo={usersMap[member.userId]}
                        stats={initialMemberStats[member.userId]}
                        isLoadingStats={false} // Data đã có sẵn
                    />
                ))}
            </div>

            {members.length === 0 && (
                <div className="px-6 py-12 text-center text-gray-500">
                    <p>Chưa có thành viên nào trong nhóm</p>
                </div>
            )}

            <AddMemberDialog
                teamId={teamId}
                existingMemberIds={members.map(m => m.userId)}
                isOpen={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
            />
        </div>
    );
}