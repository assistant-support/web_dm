// components/team/MemberRow.js
// Server Component - Hiển thị member info (phần static)

import { Calendar, Trophy, CheckCircle2, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import UserDisplay from '@/components/ui/user-display';
import Badge from '@/components/ui/badge/index.js';
import MemberRowActions from './MemberRowActions.client.js';

/**
 * MemberRow Server Component
 * Hiển thị thông tin member và stats - Compact design
 * Actions được tách ra Client Component
 * 
 * @param {Object} props
 * @param {Object} props.member - Member data (role, userId, joinedAt)
 * @param {string} props.teamId - Team ID
 * @param {boolean} props.isManager - User có quyền quản lý không
 * @param {string} props.currentUserId - Current user ID
 * @param {Object} props.userInfo - User info từ map
 * @param {Object} props.stats - Member stats (currentMonthTasks, tasksCompleted, currentMonthPoints)
 */
export default function MemberRow({
    member,
    teamId,
    isManager,
    currentUserId,
    userInfo,
    stats,
    isActive = true,
}) {
    const isSelf = String(member.userId) === String(currentUserId);
    const canManage = isManager && !isSelf;

    return (
        <div className="py-3 px-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between gap-4">
                {/* Left: Avatar + Name + Stats (same height as avatar) */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* User Display với avatar */}
                    <UserDisplay
                        userId={member.userId}
                        userInfo={userInfo}
                        showJobTitle={false}
                        showEmail={false}
                        size="md"
                    />

                    {/* Stats inline - same height as avatar */}
                    {stats && (
                        <div className="flex items-center gap-6 ml-2">
                            <div className="flex items-center gap-1.5">
                                <Briefcase className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900">
                                    {stats.currentMonthTasks || 0}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium text-gray-900">
                                    {stats.tasksCompleted || 0}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-medium text-gray-900">
                                    {stats.currentMonthPoints || 0}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Role Badge + Date + Actions */}
                <div className="flex items-center gap-3">
                    {/* Role Badge */}
                    <Badge
                        variant={member.role === 'manager' ? 'default' : 'secondary'}
                        className={
                            member.role === 'manager'
                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                : member.role === 'owner'
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                        }
                    >
                        {member.role === 'owner' ? 'Chủ sở hữu' : member.role === 'manager' ? 'Quản lý' : 'Thành viên'}
                    </Badge>

                    {/* Joined Date */}
                    {member.joinedAt && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                                {format(new Date(member.joinedAt), 'dd/MM/yyyy')}
                            </span>
                        </div>
                    )}

                    {/* Actions - Client Component */}
                    {canManage && (
                        <MemberRowActions
                            member={member}
                            teamId={teamId}
                            isActive={isActive}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
