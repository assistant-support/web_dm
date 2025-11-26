// components/project/TeamProjectsPageClient.client.js
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProjectList from '@/components/project/ProjectList.client.js';
import CreateProjectDialog from '@/components/project/CreateProjectDialog.client.js';

export default function TeamProjectsPageClient({ team, initialProjects }) {
    const router = useRouter();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [projects, setProjects] = useState(initialProjects);

    const handleCreateSuccess = (newProject) => {
        setProjects([newProject, ...projects]);
        router.refresh();
    };

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dự án</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {team.name}
                        </p>
                    </div>
                    <button
                        onClick={() => team?.isActive && setShowCreateDialog(true)}
                        className={
                            `inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ` +
                            (team?.isActive
                                ? 'text-white bg-[var(--brand-600)] hover:bg-[var(--brand-700)]'
                                : 'text-gray-400 bg-gray-100 cursor-not-allowed')
                        }
                        disabled={!team?.isActive}
                        title={team?.isActive ? 'Tạo dự án mới' : 'Team đã lưu trữ — không thể tạo dự án'}
                    >
                        <Plus className="h-4 w-4" />
                        Tạo dự án mới
                    </button>
                </div>

                {/* Project List */}
                <ProjectList projects={projects} teamId={team._id} />
            </div>

            {/* Create Project Dialog */}
            <CreateProjectDialog
                open={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                onSuccess={handleCreateSuccess}
                defaultTeamId={team._id}
                isActive={team?.isActive}
            />
        </>
    );
}
