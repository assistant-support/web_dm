// components/team/MemberList.client.js
// Mục đích: Danh sách members với add member button và stats

'use client';

import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import MemberRow from './MemberRow.client.js';
import AddMemberDialog from './AddMemberDialog.client.js';
import { getMembersStats } from '@/data/team/actions/member-stats.js';

/**
 * MemberList Component
 * @param {Object} props
 * @param {Array} props.members - Danh sách members
 * @param {string} props.teamId - Team ID
 * @param {boolean} props.isManager - Current user là manager không
 * @param {string} props.currentUserId - ID của current user
 */
export default function MemberList({ members, teamId, isManager, currentUserId }) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [memberStats, setMemberStats] = useState({});
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    useEffect(() => {
        loadMemberStats();
    }, [teamId]);

    const loadMemberStats = async () => {
        setIsLoadingStats(true);
        try {
            const result = await getMembersStats({ teamId });
            if (result.ok) {
                setMemberStats(result.data);
            }
        } catch (error) {
            console.error('Load member stats error:', error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    // Sort: Managers first, then members
    const sortedMembers = [...members].sort((a, b) => {
        if (a.role !== b.role) {
            return a.role === 'manager' ? -1 : 1;
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
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

            {/* Members List */}
            <div className="divide-y divide-gray-200">
                {sortedMembers.map((member) => (
                    <MemberRow
                        key={member.userId}
                        member={member}
                        teamId={teamId}
                        isManager={isManager}
                        currentUserId={currentUserId}
                        stats={memberStats[member.userId]}
                        isLoadingStats={isLoadingStats}
                    />
                ))}
            </div>

            {members.length === 0 && (
                <div className="px-6 py-12 text-center text-gray-500">
                    <p>Chưa có thành viên nào trong nhóm</p>
                </div>
            )}

            {/* Add Member Dialog */}
            <AddMemberDialog
                teamId={teamId}
                existingMemberIds={members.map(m => m.userId)}
                isOpen={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
            />
        </div>
    );
}
