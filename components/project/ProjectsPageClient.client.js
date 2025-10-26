// components/project/ProjectsPageClient.client.js
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import MyProjectsList from '@/components/project/MyProjectsList.client.js';
import CreateProjectDialog from '@/components/project/CreateProjectDialog.client.js';

export default function ProjectsPageClient({ initialProjects, initialCount }) {
    const router = useRouter();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [projects, setProjects] = useState(initialProjects);
    const [count, setCount] = useState(initialCount);

    const handleCreateSuccess = (newProject) => {
        // Add new project to the list
        setProjects([newProject, ...projects]);
        setCount(count + 1);
        router.refresh();
    };

    return (
        <>
            <div className="space-y-6 w-full">
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
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-600)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2 transition-all shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Tạo dự án mới
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--brand-100)] flex items-center justify-center">
                                <svg className="h-5 w-5 text-[var(--brand-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Tổng số dự án</p>
                                <p className="text-2xl font-bold text-gray-900">{count}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Đang hoạt động</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {projects.filter(p => p.isActive).length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Với nhóm</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {projects.filter(p => p.team).length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Project List */}
                <MyProjectsList initialProjects={projects} />
            </div>

            {/* Create Project Dialog */}
            <CreateProjectDialog
                open={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                onSuccess={handleCreateSuccess}
            />
        </>
    );
}
