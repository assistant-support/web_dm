// components/project/ProjectHeader.client.js
// Mục đích: Header cho project detail page với actions

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/badge';
import {
    Calendar,
    ArrowLeft,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
// Sửa đổi: Import component EditProjectDialog thật
import EditProjectDialog from './EditProjectDialog.client.js';
import { t } from '@/lib/i18n-vi';
import { PRIORITY } from '@/model/common/enums.js';

// Map priority để hiển thị badge
const priorityMap = {
    [PRIORITY.LOW]: { label: t('taskPriority.low'), variant: 'secondary' },
    [PRIORITY.MEDIUM]: { label: t('taskPriority.medium'), variant: 'default' }, // Medium uses default variant
    [PRIORITY.HIGH]: { label: t('taskPriority.high'), variant: 'warning' }, // Giả sử 'warning' là màu cam
    [PRIORITY.URGENT]: { label: t('taskPriority.urgent'), variant: 'destructive' },
};

export default function ProjectHeader({ project, canManage }) {
    const router = useRouter();
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Kiểm tra overdue cần so sánh với Date object (không phải string)
    const isOverdue = project.dueDate && new Date(project.dueDate) < new Date();
    const backUrl = '/projects';

    const priorityInfo = project.priority ? priorityMap[project.priority] : null;

    // Hàm xử lý sau khi edit thành công (router.refresh() đã có trong EditProjectDialog)
    const handleEditSuccess = () => {
        setShowEditDialog(false);
        // router.refresh() sẽ được gọi bên trong EditProjectDialog sau khi update thành công
    };

    return (
        <>
            {/* Sửa đổi: Sử dụng EditProjectDialog thật */}
            <EditProjectDialog
                project={project}
                open={showEditDialog}
                onClose={() => setShowEditDialog(false)}
            // EditProjectDialog sẽ tự gọi router.refresh()
            />

            <div className="bg-white shadow rounded-lg p-4 md:p-6">
                <Link
                    href={backUrl}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 mb-3"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t('actions.back')} {t('nav.projects')}
                </Link>

                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {project.name}
                            </h1>
                            {!project.isActive && (
                                <Badge variant="secondary">{t('project.archived')}</Badge>
                            )}
                            {priorityInfo && (
                                <Badge variant={priorityInfo.variant}>
                                    {priorityInfo.label}
                                </Badge>
                            )}

                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-gray-400 hover:text-gray-600 ml-1"
                                aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                            >
                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    {canManage && (
                        <div className="ml-4 flex-shrink-0">
                            <button
                                onClick={() => project?.isActive && setShowEditDialog(true)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md ${project?.isActive ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50' : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'}`}
                                disabled={!project?.isActive}
                                title={project?.isActive ? t('project.editProject') : t('project.archived')}
                            >
                                {t('project.editProject')}
                            </button>
                        </div>
                    )}
                </div>

                <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded
                        ? 'max-h-[1000px] opacity-100 mt-3'
                        : 'max-h-0 opacity-0 mt-0'
                        }`}
                >
                    {project.code && (
                        <p className="text-xs text-gray-500 mt-1">
                            {t('common.code')}: {project.code}
                        </p>
                    )}

                    {project.description && (
                        <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                            {project.description}
                        </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                        {project.startDate && (
                            <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {t('common.startDate')}: {format(new Date(project.startDate), 'dd/MM/yyyy', { locale: vi })}
                            </div>
                        )}
                        {project.dueDate && (
                            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                                <Calendar className="h-3.5 w-3.5" />
                                {t('common.dueDate')}: {format(new Date(project.dueDate), 'dd/MM/yyyy', { locale: vi })}
                            </div>
                        )}
                    </div>

                    {project.tags && project.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {project.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}