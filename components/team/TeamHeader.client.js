// components/team/TeamHeader.client.js
// Mục đích: Header cho team detail page (Client Component) - Có edit popup

'use client';

import { useState } from 'react';
import { Edit2, Archive, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import Badge from '@/components/ui/badge/index.js';
import EditTeamDialog from './EditTeamDialog.client.js';

/**
 * TeamHeader Component
 * @param {Object} props
 * @param {Object} props.team - Team data
 * @param {boolean} props.isManager - User là manager không
 */
export default function TeamHeader({ team, isManager }) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    return (
        <>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-gray-900 truncate uppercase">
                                    {team.name}
                                </h1>
                                <Badge 
                                    variant={team.isActive ? "success" : "default"} 
                                    className={team.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}
                                >
                                    {team.isActive ? 'Đang hoạt động' : 'Đã lưu trữ'}
                                </Badge>
                            </div>
                            {team.description && (
                                <p className="text-gray-600 leading-relaxed text-base">
                                   Mô tả:  {team.description}
                                </p>
                            )}
                        </div>

                        {isManager && (
                            <div className="flex-shrink-0">
                                <button
                                    onClick={() => setEditDialogOpen(true)}
                                    className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2 transition-all"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    Chỉnh sửa
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Meta info */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>
                                Tạo ngày {format(new Date(team.createdAt), 'dd/MM/yyyy')}
                            </span>
                        </div>
                        {!team.isActive && (
                            <div className="flex items-center gap-2">
                                <Archive className="h-4 w-4 text-gray-400" />
                                <span>Đã lưu trữ</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-gray-500">
                                {team.members?.length || 0} thành viên
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <EditTeamDialog
                team={team}
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
            />
        </>
    );
}
