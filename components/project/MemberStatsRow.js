// components/project/MemberStatsRow.js
// Server Component - Hiển thị member với stats trong project

import { Calendar, Trophy, CheckCircle2, Briefcase, Clock } from 'lucide-react';
import { format } from 'date-fns';
import UserDisplay from '@/components/ui/user-display';
import Badge from '@/components/ui/badge/index.js';
import MemberRowActions from './MemberRowActions.client.js';

/**
 * MemberStatsRow Server Component
 * Hiển thị member với stats trong project (tasks, points)
 * 
 * @param {Object} props
 * @param {Object} props.member - Member data (role, userId, joinedAt)
 * @param {string} props.projectId - Project ID
 * @param {boolean} props.isManager - User có quyền quản lý không
 * @param {string} props.currentUserId - Current user ID
 * @param {Object} props.userInfo - User info từ map
 * @param {Object} props.stats - Member stats
 */
export default function MemberStatsRow({
    member,
    projectId,
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
                {/* Left: Avatar + Name + Stats */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* User Display */}
                    <UserDisplay
                        userId={member.userId}
                        userInfo={userInfo}
                        showJobTitle={false}
                        showEmail={false}
                        size="md"
                    />

                    {/* Stats inline */}
                    {stats && (
                        <div className="flex items-center gap-6 ml-2">
                            {/* Active tasks */}
                            <div className="flex items-center gap-1.5" title="Công việc đang làm">
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium text-gray-900">
                                    {stats.activeTasks || 0}
                                </span>
                            </div>

                            {/* Current month tasks */}
                            <div className="flex items-center gap-1.5" title="Hoàn thành tháng này">
                                <Briefcase className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900">
                                    {stats.currentMonthTasks || 0}
                                </span>
                            </div>

                            {/* Total completed */}
                            <div className="flex items-center gap-1.5" title="Tổng hoàn thành">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium text-gray-900">
                                    {stats.totalTasks || 0}
                                </span>
                            </div>

                            {/* Current month points */}
                            <div className="flex items-center gap-1.5" title="Điểm tháng này">
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
                        variant={
                            member.role === 'owner' ? 'destructive' :
                            member.role === 'manager' ? 'default' : 
                            'secondary'
                        }
                        className="text-xs capitalize"
                    >
                        {member.role === 'owner' ? '👑 Owner' :
                         member.role === 'manager' ? '⚡ Manager' :
                         member.role === 'member' ? '👤 Member' : '👁️ Viewer'}
                    </Badge>

                    {/* Joined date */}
                    {member.createdAt && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(member.createdAt), 'dd/MM/yyyy')}</span>
                        </div>
                    )}

                    {/* Actions (Client Component) */}
                    {canManage && (
                        <MemberRowActions
                            projectId={projectId}
                            member={member}
                            isActive={isActive}
                        />
                    )}

                    {isSelf && (
                        <Badge variant="outline" className="text-xs">
                            Bạn
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
}
