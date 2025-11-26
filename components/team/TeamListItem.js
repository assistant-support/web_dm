// components/team/TeamListItem.js
// Client Component - Hiển thị team dưới dạng list item (compact)
"use client";

import Link from 'next/link';
import { Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import Badge from '@/components/ui/badge/index.js';

/**
 * TeamListItem Server Component
 * Hiển thị team dưới dạng list item gọn gàng (horizontal layout)
 * 
 * @param {Object} props
 * @param {Object} props.team - Team data
 * @param {string} props.currentUserId - Current user ID
 */
export default function TeamListItem({ team, currentUserId }) {
    const isManager = team.members?.some(
        (m) => String(m.userId) === String(currentUserId) && m.role === 'manager'
    );
    const memberCount = team.members?.length || 0;

    return (
        <Link
            href={`/teams/${team._id}`}
            className="block px-6 py-4 hover:bg-gray-50 transition-colors"
        >
            <div className="flex items-center justify-between gap-4">
                {/* Left: Team info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-gray-900 truncate" title={team.name}>
                            {team.name}
                            <Badge
                                variant={team.isActive ? 'success' : 'secondary'}
                                className={
                                    team.isActive
                                        ? 'bg-green-100 text-green-800 border-green-200'
                                        : 'bg-gray-200 text-gray-700 border-gray-300'
                                }
                            >
                                {team.isActive ? 'Đang hoạt động' : 'Đã lưu trữ'}
                            </Badge>
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">

                            {isManager && (
                                <Badge
                                    variant="default"
                                    className="bg-purple-100 text-purple-800 border-purple-200"
                                >
                                    Quản lý
                                </Badge>
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 truncate h-5">
                        {team.description || <span className="invisible">No description</span>}
                    </p>
                </div>

                {/* Right: Stats */}
                <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{memberCount}</span>
                        <span className="text-gray-500">thành viên</span>
                    </div>

                    {team.updatedAt && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>
                                {format(new Date(team.updatedAt), 'dd/MM/yyyy')}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
