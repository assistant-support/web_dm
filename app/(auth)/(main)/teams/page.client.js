// app/(auth)/(main)/teams/page.client.js
'use client';

import { useState } from 'react';
import { Plus, LayoutGrid, List, Users } from 'lucide-react';
import DialogComponent from '@/components/ui/dialog';
import TeamForm from '@/components/team/TeamForm.client';
import TeamCard from '@/components/team/TeamCard.client';
import { useAsyncNotifier } from '@/hooks/loading.hook';
import { useRouter } from 'next/navigation';

export default function TeamsPageClient({ initialTeams, currentUserId }) {
    const [teams, setTeams] = useState(initialTeams);
    const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const { run, Overlays } = useAsyncNotifier();
    const router = useRouter();

    const hasTeams = teams.length > 0;

    // Sort teams: Active trước, sau đó theo updatedAt
    const sortedTeams = [...teams].sort((a, b) => {
        if (a.isActive !== b.isActive) {
            return a.isActive ? -1 : 1;
        }
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    const handleCreateSuccess = (newTeam) => {
        setTeams((prev) => [newTeam, ...prev]);
        setIsCreateDialogOpen(false);
        router.refresh();
    };

    return (
        <>
            <Overlays />
            
            <div className="space-y-6 w-full">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Nhóm làm việc</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Quản lý và cộng tác với các nhóm của bạn
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View Toggle */}
                        {hasTeams && (
                            <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1">
                                <button
                                    onClick={() => setViewMode('card')}
                                    className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                                        viewMode === 'card'
                                            ? 'bg-[var(--brand-600)] text-white'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                    title="Xem dạng thẻ"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                                        viewMode === 'list'
                                            ? 'bg-[var(--brand-600)] text-white'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                    title="Xem dạng danh sách"
                                >
                                    <List className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        
                        {/* Create Button */}
                        <button
                            onClick={() => setIsCreateDialogOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-600)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2 transition-all"
                        >
                            <Plus className="h-4 w-4" />
                            Tạo nhóm mới
                        </button>
                    </div>
                </div>

                {/* Team List hoặc Empty State */}
                {hasTeams ? (
                    viewMode === 'card' ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {sortedTeams.map((team) => (
                                <TeamCard
                                    key={team._id}
                                    team={team}
                                    currentUserId={currentUserId}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tên nhóm
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Mô tả
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Thành viên
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Trạng thái
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Cập nhật
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedTeams.map((team) => (
                                        <tr 
                                            key={team._id}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => router.push(`/teams/${team._id}`)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 bg-[var(--brand-600)] rounded-lg flex items-center justify-center">
                                                        <Users className="h-5 w-5 text-white" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{team.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-600 max-w-xs truncate">
                                                    {team.description || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{team.members?.length || 0}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                                    team.isActive 
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {team.isActive ? 'Hoạt động' : 'Không hoạt động'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(team.updatedAt).toLocaleDateString('vi-VN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-16 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
                            <Users className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-gray-900">
                            Chưa có nhóm nào
                        </h3>
                        <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">
                            Tạo nhóm đầu tiên để bắt đầu cộng tác với đồng đội của bạn.
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={() => setIsCreateDialogOpen(true)}
                                className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-600)] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-700)] transition-all"
                            >
                                <Plus className="h-5 w-5" />
                                Tạo nhóm đầu tiên
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Team Dialog */}
            <DialogComponent
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                title="Tạo nhóm mới"
                description="Tạo nhóm để cộng tác với các thành viên trong dự án"
                size="lg"
            >
                <TeamForm
                    mode="create"
                    onSuccess={handleCreateSuccess}
                />
            </DialogComponent>
        </>
    );
}
