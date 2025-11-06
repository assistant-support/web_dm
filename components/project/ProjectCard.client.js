// components/project/ProjectCard.client.js
// Mục đích: Card hiển thị project với thông tin tổng quan

'use client';

import Link from 'next/link';
import Card from '@/components/ui/card';
import Badge from '@/components/ui/badge';
import { Users, FolderOpen, Building2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { vi as viTranslations } from '@/lib/i18n-vi';

/**
 * ProjectCard - Card hiển thị thông tin tổng quan project
 * @param {Object} props
 * @param {Object} props.project - Project object
 * @param {string} props.teamId - Team ID để tạo link
 */
export default function ProjectCard({ project, teamId }) {
    const memberCount = project.members?.length || 0;
    const isOverdue = project.dueDate && new Date(project.dueDate) < new Date();
    const startDate = project.startDate ? new Date(project.startDate) : null;
    const dueDate = project.dueDate ? new Date(project.dueDate) : null;

    // Helper function to get priority label
    const getPriorityLabel = (priority) => {
        const t = viTranslations.taskPriority;
        switch(priority) {
            case 'urgent': return `🔥 ${t.urgent}`;
            case 'high': return `⚡ ${t.high}`;
            case 'medium': return `📌 ${t.medium}`;
            case 'low': return `📋 ${t.low}`;
            default: return `📄 ${t[''] || 'Bình thường'}`;
        }
    };

    return (
        <Link href={`/projects/${project._id}`}>
            <div className="p-5 rounded-lg border border-gray-200 bg-white hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer h-full flex flex-col">
                <div className="space-y-3 flex-1">
                    {/* Header with status */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 space-y-2">
                            {/* Tên dự án + Tags trên cùng 1 dòng */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-semibold text-gray-900 truncate max-w-[60%]">
                                    {project.name || 'Dự án chưa đặt tên'}
                                </h3>
                                {/* Tags inline */}
                                {project.tags && project.tags.length > 0 && (
                                    <>
                                        {project.tags.slice(0, 2).map((tag, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs px-2 py-0.5">
                                                {tag}
                                            </Badge>
                                        ))}
                                        {project.tags.length > 2 && (
                                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                                                +{project.tags.length - 2}
                                            </Badge>
                                        )}
                                    </>
                                )}
                            </div>
                            
                            {/* Team badge */}
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Building2 className="h-3.5 w-3.5" />
                                <span className="truncate">
                                    {project.team?.name || 'Dự án độc lập'}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 items-end flex-shrink-0">
                            {!project.isActive && (
                                <Badge variant="secondary" className="text-xs">Đã lưu trữ</Badge>
                            )}
                            {/* Always show priority */}
                            <Badge 
                                variant={
                                    project.priority === 'urgent' ? 'destructive' : 
                                    project.priority === 'high' ? 'default' : 
                                    project.priority === 'medium' ? 'secondary' :
                                    'outline'
                                }
                                className="text-xs"
                            >
                                {getPriorityLabel(project.priority)}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Footer với stats */}
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                    {/* Date range - always show */}
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Clock className="h-3.5 w-3.5" />
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                            {startDate || dueDate ? (
                                <>
                                    {startDate && (
                                        <span>{format(startDate, 'dd/MM/yyyy', { locale: vi })}</span>
                                    )}
                                    {startDate && dueDate && <span>→</span>}
                                    {dueDate && (
                                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                            {format(dueDate, 'dd/MM/yyyy', { locale: vi })}
                                            {isOverdue && ' ⚠️'}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span className="text-gray-400 italic">Chưa đặt thời gian</span>
                            )}
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-sm">
                        {/* Members */}
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">{memberCount}</span>
                            <span className="text-xs">thành viên</span>
                        </div>

                        {/* Drive folder - always show section */}
                        <div className="flex items-center gap-1.5 text-gray-500 flex-1 min-w-0">
                            <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs truncate">
                                {project.driveFolderName || 'Chưa liên kết Drive'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
