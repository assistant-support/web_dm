// app/(auth)/(main)/projects/[projectId]/page.js
import { getProjectDetail } from '@/data/project/actions/list.js';
import { listByProject } from '@/data/task/actions/server.js';
import { FolderOpen, Users, Clock, CheckCircle, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProjectOverviewPage({ params }) {
    const { projectId } = await params;
    const result = await getProjectDetail(projectId);
    
    if (!result.ok) {
        return <div>Error loading project</div>;
    }

    const project = result.data;

    // Get tasks to count
    const tasksResult = await listByProject(projectId, {});
    const tasks = tasksResult.ok ? tasksResult.data : [];
    const completedTasks = tasks.filter(t => t.status === 'completed').length;

    const quickStats = [
        {
            label: 'Tổng tasks',
            value: tasks.length,
            icon: FolderOpen,
            href: `/projects/${projectId}/tasks`,
            color: 'text-blue-600',
            bg: 'bg-blue-100'
        },
        {
            label: 'Thành viên',
            value: project.members?.length || 0,
            icon: Users,
            href: `/projects/${projectId}/members`,
            color: 'text-green-600',
            bg: 'bg-green-100'
        },
        {
            label: 'Hoàn thành',
            value: completedTasks,
            icon: CheckCircle,
            href: `/projects/${projectId}/analytics`,
            color: 'text-purple-600',
            bg: 'bg-purple-100'
        }
    ];

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
                    {/* Description */}
                    {project.description && (
                        <div>
                            <label className="text-sm font-medium text-gray-600">Mô tả</label>
                            <p className="text-sm text-gray-900 mt-1">{project.description}</p>
                        </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {project.startDate && (
                            <div>
                                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Ngày bắt đầu
                                </label>
                                <p className="text-sm text-gray-900 mt-1">
                                    {format(new Date(project.startDate), 'dd/MM/yyyy', { locale: vi })}
                                </p>
                            </div>
                        )}
                        {project.endDate && (
                            <div>
                                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Ngày kết thúc
                                </label>
                                <p className="text-sm text-gray-900 mt-1">
                                    {format(new Date(project.endDate), 'dd/MM/yyyy', { locale: vi })}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Priority */}
                    {project.priority && (
                        <div>
                            <label className="text-sm font-medium text-gray-600">Độ ưu tiên</label>
                            <div className="mt-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    project.priority === 'high' ? 'bg-red-100 text-red-800' :
                                    project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                    {project.priority === 'high' ? 'Cao' : 
                                     project.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Tags */}
                    {project.tags && project.tags.length > 0 && (
                        <div>
                            <label className="text-sm font-medium text-gray-600">Tags</label>
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

                    {/* Team */}
                    {project.team && (
                        <div>
                            <label className="text-sm font-medium text-gray-600">Team</label>
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
