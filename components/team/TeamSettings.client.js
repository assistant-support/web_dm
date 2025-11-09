// components/team/TeamSettings.client.js
'use client';

import { useState } from 'react';
import { Settings, Archive, Trash2, UserCog, AlertTriangle } from 'lucide-react';
import { toggleArchive, deleteTeam, transferOwnership } from '@/data/team/actions/management.js';
import { useRouter } from 'next/navigation';
import { useAsyncNotifier } from '@/hooks/loading.hook';
import UserDisplay from '@/components/ui/user-display';

/**
 * TeamSettings Component
 * Quản lý team: Archive, Delete, Transfer ownership
 */
export default function TeamSettings({ team, currentUserId, isManager }) {
    const router = useRouter();
    const { run, Overlays } = useAsyncNotifier();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
    const [selectedNewManager, setSelectedNewManager] = useState('');

    if (!isManager) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="text-center text-gray-500 py-8">
                    <Settings className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Chỉ quản lý mới có quyền truy cập cài đặt</p>
                </div>
            </div>
        );
    }

    const handleToggleArchive = async () => {
        const result = await run(
            async () => await toggleArchive({ teamId: team._id }),
            {
                loadingMessage: team.isActive ? 'Đang lưu trữ...' : 'Đang kích hoạt...',
                successMessage: team.isActive ? 'Đã lưu trữ team' : 'Đã kích hoạt team',
                errorMessage: 'Không thể thực hiện',
                notify: 'all'
            }
        );

        if (result.ok) {
            router.refresh();
        }
    };

    const handleDelete = async () => {
        const result = await run(
            async () => await deleteTeam({ 
                teamId: team._id, 
                confirmText: deleteConfirmText 
            }),
            {
                loadingMessage: 'Đang xóa team...',
                successMessage: 'Đã xóa team thành công',
                errorMessage: 'Không thể xóa team',
                notify: 'all'
            }
        );

        if (result.ok) {
            router.push('/teams');
            router.refresh();
        }
    };

    const handleTransferOwnership = async () => {
        if (!selectedNewManager) return;

        const result = await run(
            async () => await transferOwnership({ 
                teamId: team._id, 
                newManagerUserId: selectedNewManager 
            }),
            {
                loadingMessage: 'Đang chuyển quyền...',
                successMessage: 'Đã chuyển quyền quản lý',
                errorMessage: 'Không thể chuyển quyền',
                notify: 'all'
            }
        );

        if (result.ok) {
            setIsTransferDialogOpen(false);
            setSelectedNewManager('');
            router.refresh();
        }
    };

    const otherMembers = team.members?.filter(m => String(m.userId) !== String(currentUserId)) || [];

    return (
        <>
            <Overlays />
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-[var(--brand-600)]" />
                        <h3 className="text-lg font-semibold text-gray-900">Cài đặt nhóm</h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Quản lý cài đặt và quyền hạn
                    </p>
                </div>

                {/* Settings sections */}
                <div className="p-6 space-y-6">
                    {/* Archive/Unarchive */}
                    <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                                    <Archive className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900">
                                        {team.isActive ? 'Lưu trữ nhóm' : 'Kích hoạt lại nhóm'}
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {team.isActive 
                                            ? 'Lưu trữ nhóm này. Các thành viên vẫn có thể xem nhưng không thể chỉnh sửa.'
                                            : 'Kích hoạt lại nhóm để các thành viên có thể làm việc.'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleToggleArchive}
                                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                                    team.isActive
                                        ? 'border-orange-200 text-orange-700 hover:bg-orange-50'
                                        : 'border-green-200 text-green-700 hover:bg-green-50'
                                }`}
                            >
                                {team.isActive ? 'Lưu trữ' : 'Kích hoạt'}
                            </button>
                        </div>
                    </div>

                    {/* Transfer Ownership */}
                    <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <UserCog className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900">
                                        Chuyển quyền quản lý
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Chuyển quyền quản lý nhóm cho thành viên khác. Bạn sẽ trở thành thành viên thông thường.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTransferDialogOpen(true)}
                                disabled={otherMembers.length === 0}
                                className="px-4 py-2 text-sm font-medium rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Chuyển quyền
                            </button>
                        </div>
                    </div>

                    {/* Delete Team - Danger Zone */}
                    <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                        <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-red-900">
                                    Vùng nguy hiểm
                                </h4>
                                <p className="text-sm text-red-700 mt-1">
                                    Xóa nhóm này vĩnh viễn. Hành động này không thể hoàn tác.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            Xóa nhóm
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {isDeleteDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Xác nhận xóa nhóm</h3>
                                    <p className="text-sm text-gray-500">Hành động này không thể hoàn tác</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-sm text-yellow-800">
                                    <strong>Lưu ý:</strong> Nhóm phải không còn dự án hoặc tasks mới có thể xóa.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nhập tên nhóm &quot;<span className="font-bold">{team.name}</span>&quot; để xác nhận:
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder={team.name}
                                />
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
                            <button
                                onClick={() => {
                                    setIsDeleteDialogOpen(false);
                                    setDeleteConfirmText('');
                                }}
                                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-white transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteConfirmText.toLowerCase() !== team.name.toLowerCase()}
                                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Xóa nhóm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Ownership Dialog */}
            {isTransferDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Chuyển quyền quản lý</h3>
                            <p className="text-sm text-gray-500 mt-1">Chọn thành viên mới</p>
                        </div>
                        
                        <div className="p-6 space-y-3">
                            {otherMembers.map((member) => (
                                <button
                                    key={member.userId}
                                    onClick={() => setSelectedNewManager(member.userId)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                                        selectedNewManager === member.userId
                                            ? 'border-[var(--brand-600)] bg-[var(--brand-50)]'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <UserDisplay
                                        userId={member.userId}
                                        showJobTitle={true}
                                        size="sm"
                                    />
                                </button>
                            ))}
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
                            <button
                                onClick={() => {
                                    setIsTransferDialogOpen(false);
                                    setSelectedNewManager('');
                                }}
                                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-white transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleTransferOwnership}
                                disabled={!selectedNewManager}
                                className="px-4 py-2 text-sm font-medium bg-[var(--brand-600)] text-white rounded-lg hover:bg-[var(--brand-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Chuyển quyền
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
