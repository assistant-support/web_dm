// components/project/ProjectsPageClient.client.js
'use client';

import { useState, useMemo } from 'react';
import { Plus, FolderCheck, FolderClock, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import MyProjectsList from '@/components/project/MyProjectsList';
import CreateProjectDialog from '@/components/project/CreateProjectDialog.client.js';

export default function ProjectsPageClient({ initialProjects, canCreateProject = false }) {
    const router = useRouter();
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Calculate stats directly from props using useMemo
    const projectStats = useMemo(() => {
        const total = initialProjects.length;
        const active = initialProjects.filter(p => p.isActive).length;
        const teamProjects = initialProjects.filter(p => p.team).length;
        return { total, active, teamProjects };
    }, [initialProjects]);

    // Refresh the page data after successful creation
    const handleCreateSuccess = (newProject) => {
        setShowCreateDialog(false); // Close dialog first
        router.refresh(); // Fetch new server state
    };

    return (
        <>
            <div className="w-full flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dự án của tôi</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Quản lý tất cả các dự án bạn tham gia
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateDialog(true)}
                        disabled={!canCreateProject}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-600)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--brand-600)]"
                        title={!canCreateProject ? 'Chỉ quản lý nhóm mới được tạo dự án' : 'Tạo dự án mới'}
                    >
                        <Plus className="h-4 w-4" />
                        Tạo dự án mới
                    </button>
                </div>

                {/* Stats - Refined UI */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <FolderClock className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Tổng số dự án</p>
                                <p className="text-2xl font-bold text-gray-900">{projectStats.total}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <FolderCheck className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Đang hoạt động</p>
                                <p className="text-2xl font-bold text-gray-900">{projectStats.active}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Users className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Thuộc Nhóm</p>
                                <p className="text-2xl font-bold text-gray-900">{projectStats.teamProjects}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Project List Component */}
                <MyProjectsList initialProjects={initialProjects} />
            </div>

            {/* Create Project Dialog */}
            {canCreateProject && (
                <CreateProjectDialog
                    open={showCreateDialog}
                    onClose={() => setShowCreateDialog(false)}
                    onSuccess={handleCreateSuccess}
                />
            )}
        </>
    );
}