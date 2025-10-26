// components/project/ProjectSettings.client.js
'use client';

import { useState } from 'react';
import { Archive, ArchiveRestore, Trash2, AlertTriangle } from 'lucide-react';
import DialogComponent, { ConfirmDialog } from '@/components/ui/dialog';
import { updateProjectAction, deleteProjectAction } from '@/data/project/actions/server.js';
import { useRouter } from 'next/navigation';
import { useAsyncNotifier } from '@/hooks/loading.hook';

export default function ProjectSettings({ project, onUpdate, onClose, isDialog = false }) {
    const router = useRouter();
    const { run, Overlays } = useAsyncNotifier();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState('');

    const handleToggleArchive = async () => {
        setError('');

        const result = await run(
            async () => await updateProjectAction(project._id, { 
                isArchived: !project.isArchived 
            }),
            {
                loadingMessage: project.isArchived ? 'Đang khôi phục dự án...' : 'Đang lưu trữ dự án...',
                successMessage: project.isArchived ? 'Khôi phục dự án thành công' : 'Lưu trữ dự án thành công',
                errorMessage: project.isArchived ? 'Khôi phục dự án thất bại' : 'Lưu trữ dự án thất bại',
                notify: 'all'
            }
        );

        if (result?.ok !== true) {
            setError(result?.message || 'Có lỗi xảy ra');
            return;
        }

        if (onUpdate) {
            onUpdate(result.data);
        }
        if (onClose) {
            onClose();
        } else {
            router.refresh();
        }
    };

    const handleDelete = async () => {
        setError('');

        const result = await run(
            async () => await deleteProjectAction(project._id),
            {
                loadingMessage: 'Đang xóa dự án...',
                successMessage: 'Xóa dự án thành công',
                errorMessage: 'Xóa dự án thất bại',
                notify: 'all'
            }
        );

        if (result?.ok !== true) {
            setError(result?.message || 'Có lỗi xảy ra');
            setShowDeleteConfirm(false);
            return;
        }

        router.push('/projects');
    };

    if (showDeleteConfirm) {
        return (
            <>
                <Overlays />
                <ConfirmDialog
                    open={true}
                    onOpenChange={(open) => !open && setShowDeleteConfirm(false)}
                    title="Xác nhận xóa dự án"
                    description={`Bạn có chắc chắn muốn xóa dự án "${project.name}"? Hành động này không thể hoàn tác.`}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                    confirmText="Xóa dự án"
                    cancelText="Hủy"
                    variant="danger"
                >
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                            <li>Tất cả tasks trong dự án sẽ bị xóa</li>
                            <li>Tất cả hoạt động và lịch sử sẽ bị mất</li>
                            <li>Hành động này không thể hoàn tác</li>
                        </ul>
                    </div>
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}
                </ConfirmDialog>
            </>
        );
    }

    // Settings content
    const settingsContent = (
        <>
            <Overlays />
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            <div className="space-y-4">
                {/* Archive/Unarchive */}
                <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                            {project.isArchived ? (
                                <ArchiveRestore className="h-5 w-5 text-blue-600 mt-0.5" />
                            ) : (
                                <Archive className="h-5 w-5 text-gray-600 mt-0.5" />
                            )}
                            <div>
                                <h4 className="text-sm font-medium text-gray-900">
                                    {project.isArchived ? 'Khôi phục dự án' : 'Lưu trữ dự án'}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                    {project.isArchived 
                                        ? 'Khôi phục dự án để tiếp tục làm việc'
                                        : 'Lưu trữ dự án để ẩn khỏi danh sách chính'
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleArchive}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${
                                project.isArchived
                                    ? 'text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100'
                                    : 'text-gray-700 border-gray-300 bg-white hover:bg-gray-50'
                            }`}
                        >
                            {project.isArchived ? 'Khôi phục' : 'Lưu trữ'}
                        </button>
                    </div>
                </div>

                {/* Delete */}
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                            <Trash2 className="h-5 w-5 text-red-600 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-red-900">
                                    Xóa dự án
                                </h4>
                                <p className="text-xs text-red-700 mt-1">
                                    Xóa vĩnh viễn dự án và tất cả dữ liệu liên quan
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                        >
                            Xóa
                        </button>
                    </div>
                </div>
            </div>
        </>
    );

    // If used as dialog
    if (isDialog && onClose) {
        return (
            <DialogComponent 
                open={true} 
                onOpenChange={(open) => !open && onClose()}
                title="Cài đặt dự án"
                size="md"
            >
                {settingsContent}
                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Đóng
                    </button>
                </div>
            </DialogComponent>
        );
    }

    // If used as standalone page
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            {settingsContent}
        </div>
    );
}
