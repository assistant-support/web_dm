// components/team/TeamHeader.js
// Server Component - Hiển thị header của team (phần static)

import { Calendar, Archive } from 'lucide-react';
import { format } from 'date-fns';
import Badge from '@/components/ui/badge/index.js';
import TeamHeaderActions from './TeamHeaderActions.client.js';

/**
 * TeamHeader Server Component
 * Hiển thị thông tin header của team
 * Phần actions (edit button) được tách ra Client Component
 * 
 * @param {Object} props
 * @param {Object} props.team - Team data
 * @param {boolean} props.isManager - User có quyền quản lý không
 */
export default function TeamHeader({ team, isManager }) {
    const memberCount = team.members?.length || 0;

    return (
        <div className="bg-white rounded-md border border-gray-200">
            <div className="py-4 px-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-xl font-bold text-gray-900 truncate">
                                {team.name}
                            </h1>
                            <Badge
                                variant={team.isActive ? "success" : "default"}
                                className={team.isActive
                                    ? "bg-green-100 text-green-800 border-green-200"
                                    : "bg-gray-200 text-gray-700 border-gray-300"
                                }
                            >
                                {team.isActive ? 'Đang hoạt động' : 'Đã lưu trữ'}
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Mô tả:  {team.description ? team.description : 'Không có mô tả'}</p>
                    </div>

                    {/* Actions - Client Component */}
                    {isManager && (
                        <div className="flex-shrink-0">
                            <TeamHeaderActions team={team} />
                        </div>
                    )}
                </div>
            </div>

            {/* Meta info footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>
                            Tạo ngày {format(new Date(team.createdAt), 'dd/MM/yyyy')}
                        </span>
                    </div>

                    {team.updatedAt && team.updatedAt !== team.createdAt && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>
                                Cập nhật {format(new Date(team.updatedAt), 'dd/MM/yyyy')}
                            </span>
                        </div>
                    )}

                    {!team.isActive && (
                        <div className="flex items-center gap-2">
                            <Archive className="h-4 w-4 text-gray-400" />
                            <span>Đã lưu trữ</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                        <span className="font-medium text-gray-900">
                            {memberCount}
                        </span>
                        <span className="text-gray-500">
                            {memberCount === 1 ? 'thành viên' : 'thành viên'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
