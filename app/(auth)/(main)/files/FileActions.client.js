'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Download, Pencil, Trash2 } from 'lucide-react';
import FilePreviewModal from '@/components/attachments/FilePreviewModal.client';
import { renameAttachmentAction, deleteAttachmentAction } from './actions.js';

export default function FileActions({ file }) {
    const router = useRouter();
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handlePreview = () => setIsPreviewOpen(true);

    const handleRename = () => {
        const currentName = file.name || '';
        const nextName = window.prompt('Nhập tên mới cho file', currentName);
        if (!nextName || nextName === currentName) {
            return;
        }

        startTransition(async () => {
            try {
                await renameAttachmentAction({ attachmentId: file.id, name: nextName });
                router.refresh();
            } catch (error) {
                console.error('Rename attachment failed', error);
                window.alert('Không thể đổi tên file. Vui lòng thử lại.');
            }
        });
    };

    const handleDelete = () => {
        const confirmed = window.confirm('Bạn có chắc muốn xóa file này?');
        if (!confirmed) return;
        startTransition(async () => {
            try {
                await deleteAttachmentAction({ attachmentId: file.id });
                router.refresh();
            } catch (error) {
                console.error('Delete attachment failed', error);
                window.alert('Không thể xóa file. Vui lòng thử lại.');
            }
        });
    };

    return (
        <>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={handlePreview}
                    className="rounded-md border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50"
                    title="Xem trước"
                >
                    <Eye className="h-4 w-4" />
                </button>
                <a
                    href={file.access.downloadUrl}
                    className="rounded-md border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50"
                    title="Tải xuống"
                >
                    <Download className="h-4 w-4" />
                </a>
                {file.permissions?.canRename && (
                    <button
                        type="button"
                        onClick={handleRename}
                        disabled={isPending}
                        className="rounded-md border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                        title="Đổi tên"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                )}
                {file.permissions?.canDelete && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isPending}
                        className="rounded-md border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        title="Xóa file"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            {isPreviewOpen && (
                <FilePreviewModal
                    file={file}
                    onClose={() => setIsPreviewOpen(false)}
                />
            )}
        </>
    );
}
