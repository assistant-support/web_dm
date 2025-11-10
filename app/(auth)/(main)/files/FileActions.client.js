'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Download, Copy, Check, Pencil, Trash2 } from 'lucide-react';
import FilePreviewModal from '@/components/attachments/FilePreviewModal.client';
import { renameAttachmentAction, deleteAttachmentAction } from './actions.js';
import { getGoogleDriveShareableLink } from '@/lib/drive-utils.js';

export default function FileActions({ file }) {
    const router = useRouter();
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [copied, setCopied] = useState(false);
    const copyResetRef = useRef(null);

    useEffect(() => {
        return () => {
            if (copyResetRef.current) {
                window.clearTimeout(copyResetRef.current);
            }
        };
    }, []);

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

    const handleCopyLink = async () => {
        const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
        const shareLink = getGoogleDriveShareableLink(file, { origin });
        if (!shareLink) {
            window.alert('Không tìm thấy link Drive để sao chép.');
            return;
        }

        try {
            const nav = typeof navigator !== 'undefined' ? navigator : null;
            const canUseClipboard = !!nav?.clipboard?.writeText;

            if (!canUseClipboard) {
                window.prompt('Sao chép link Drive', shareLink);
                return;
            }

            await nav.clipboard.writeText(shareLink);
            setCopied(true);
            if (copyResetRef.current) {
                window.clearTimeout(copyResetRef.current);
            }
            copyResetRef.current = window.setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Copy Drive link failed', error);
            window.alert('Không thể sao chép link. Vui lòng thử lại.');
        }
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
                <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`rounded-md border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50 ${
                        copied ? 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100' : ''
                    }`}
                    title={copied ? 'Đã sao chép' : 'Sao chép link'}
                >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
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
