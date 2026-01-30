// components/team/TeamCard.js
// Client Component - Hiển thị thông tin team card
"use client";

import Link from 'next/link';
import { Users, Calendar } from 'lucide-react';
import Card from '@/components/ui/card/index.js';
import Badge from '@/components/ui/badge/index.js';
import { format } from 'date-fns';
import { isTeamManager } from '@/lib/permissions.js';

/**
 * TeamCard Server Component
 * @param {Object} props
 * @param {Object} props.team - Team data
 * @param {string} props.currentUserId - ID của user hiện tại
 * @param {Object} props.currentUser - User object (để check admin role)
 * @param {boolean} props.prefetch - Enable prefetch on hover (default: true)
 */
export default function TeamCard({ team, currentUserId, currentUser, prefetch = true }) {
    // Tìm role của current user - Admin luôn hiển thị là Manager
    const isManager = isTeamManager(team, currentUser || currentUserId);
    const currentMember = team.members?.find(m => String(m.userId) === String(currentUserId));
    const role = isManager && !currentMember 
        ? 'manager' // Admin không có trong members nhưng có quyền quản lý
        : (currentMember?.role || 'member');
    const memberCount = team.members?.length || 0;

    const roleLabel = {
        owner: 'Owner',
        manager: 'Manager',
        member: 'Member'
    }[role] || 'Member';

    return (
        <Link 
            href={`/teams/${team._id}`}
            prefetch={prefetch}
            className="block"
        >
            <Card
                hoverable
                className={
                    `${team.isActive ? '' : 'opacity-60'} h-40 flex flex-col justify-between`
                }
            >
                <div className="space-y-3">
                    {/* Header với name và badge */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {team.name}
                            </h3>
                            {!team.isActive && (
                                <span className="text-xs text-gray-500 italic">Đã lưu trữ</span>
                            )}
                        </div>
                        <Badge variant="role" role={role}>
                            {roleLabel}
                        </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 line-clamp-2 h-10" title={team.description}>
                        {team.description || <span className="invisible">No description</span>}
                    </p>

                    {/* Footer info */}
                    <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            <span>{memberCount} thành viên</span>
                        </div>
                        {team.updatedAt && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(team.updatedAt), 'dd/MM/yyyy')}</span>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </Link>
    );
}
