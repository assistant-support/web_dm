// app/(auth)/(main)/projects/[projectId]/page.js
import { FolderOpen, Users, Clock, CheckCircle, Calendar, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getProjectDetail } from '@/data/project/actions/list.js';
import { getProjectAnalytics } from '@/data/project/processors/analytics.js';
import { t } from '@/lib/i18n-vi';
import { PRIORITY } from '@/model/common/enums.js';

// Define priorityMap using enum keys and t function
const priorityMap = {
    [PRIORITY.LOW]: { label: t('taskPriority.low'), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    [PRIORITY.NORMAL]: { label: t('taskPriority.normal'), icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
    [PRIORITY.HIGH]: { label: t('taskPriority.high'), icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100' },
    [PRIORITY.URGENT]: { label: t('taskPriority.urgent'), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
};

export default async function ProjectOverviewPage({ params }) {
    const { projectId } = await params;

    // Fetch project details and analytics in parallel
    const [projectResult, analyticsResult] = await Promise.all([
        getProjectDetail(projectId), // This hits React.cache (from layout)
        getProjectAnalytics(projectId) // This hits its own unstable_cache
    ]);

    if (!projectResult.ok) {
        return <div className="text-red-600">{t('error.loadFailed')}: {projectResult.message}</div>;
    }

    const project = projectResult.data;
    const taskStats = analyticsResult.tasks || { totalTasks: 0, completedTasks: 0 };

    const quickStats = [
        {
            label: t('task.tasks'), // "Nhiệm vụ"
            value: taskStats.totalTasks,
            icon: FolderOpen,
            href: `/projects/${projectId}/tasks`,
            color: 'text-blue-600',
            bg: 'bg-blue-100'
        },
        {
            label: t('project.members'), // "Thành viên"
            value: project.members?.length || 0,
            icon: Users,
            href: `/projects/${projectId}/members`,
            color: 'text-green-600',
            bg: 'bg-green-100'
        },
        {
            label: t('taskStatus.completed'), // "Hoàn thành"
            value: taskStats.completedTasks,
            icon: CheckCircle,
            href: `/projects/${projectId}/tasks?status=completed`,
            color: 'text-purple-600',
            bg: 'bg-purple-100'
        }
    ];

    const priorityInfo = project.priority ? priorityMap[project.priority] : null;

    return (
        <div className="space-y-6 w-full">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {quickStats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Link
                            key={stat.label}
                            href={stat.href}
                            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                                </div>
                                <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                                    <Icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Project Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin dự án</h3>

                <div className="space-y-4">
                    {project.description && (
                        <div>
                            <label className="text-sm font-medium text-gray-600">{t('common.description')}</label>
                            <p className="text-sm text-gray-900 mt-1">{project.description}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {project.startDate && (
                            <div>
                                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {t('common.startDate')}
                                </label>
                                <p className="text-sm text-gray-900 mt-1 ml-6">
                                    {format(new Date(project.startDate), 'dd/MM/yyyy', { locale: vi })}
                                </p>
                            </div>
                        )}
                        {project.dueDate && (
                            <div>
                                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {t('common.dueDate')}
                                </label>
                                <p className="text-sm text-gray-900 mt-1 ml-6">
                                    {format(new Date(project.dueDate), 'dd/MM/yyyy', { locale: vi })}
                                </p>
                            </div>
                        )}
                        {priorityInfo && (
                            <div>
                                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                    <priorityInfo.icon className={`h-4 w-4 ${priorityInfo.color}`} />
                                    {t('common.priority')}
                                </label>
                                <div className="mt-1 ml-6">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityInfo.bg} ${priorityInfo.color}`}>
                                        {priorityInfo.label}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {project.tags && project.tags.length > 0 && (
                        <div>
                            <label className="text-sm font-medium text-gray-600">{t('task.tags')}</label>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {project.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {project.team && (
                        <div>
                            <label className="text-sm font-medium text-gray-600">{t('team.title')}</label>
                            <p className="text-sm text-gray-900 mt-1">{project.team.name}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link
                    href={`/projects/${projectId}/tasks`}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900">Quản lý Tasks</h4>
                            <p className="text-xs text-gray-600 mt-0.5">Xem và quản lý công việc</p>
                        </div>
                    </div>
                </Link>

                <Link
                    href={`/projects/${projectId}/analytics`}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900">Thống kê</h4>
                            <p className="text-xs text-gray-600 mt-0.5">Xem báo cáo và phân tích</p>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}