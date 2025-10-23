// components/attachments/AttachmentItem.client.js
'use client';

import { useState } from 'react';
import { FileIcon, Download, Trash2, ExternalLink, MoreVertical, FileText, Image as ImageIcon, Film } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import UserDisplay from '@/components/ui/user-display';
import { remove as deleteAttachment } from '@/data/attachment/actions/server';

/**
 * Get icon by file type
 */
function getFileIcon(mimeType, kind) {
    if (kind === 'image' || mimeType?.startsWith('image/')) {
        return <ImageIcon className="w-5 h-5" />;
    }
    if (kind === 'video' || mimeType?.startsWith('video/')) {
        return <Film className="w-5 h-5" />;
    }
    if (mimeType?.includes('pdf')) {
        return <FileText className="w-5 h-5 text-red-600" />;
    }
    return <FileIcon className="w-5 h-5" />;
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * AttachmentItem - Display one attachment
 */
export default function AttachmentItem({ attachment, canDelete, onDeleted }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Bạn có chắc muốn xóa tệp này?')) return;

        setIsDeleting(true);
        try {
            const result = await deleteAttachment({ attachmentId: attachment._id });
            if (result?._removed) {
                onDeleted?.(attachment._id);
            } else {
                alert('Không thể xóa tệp');
            }
        } catch (error) {
            console.error('Error deleting attachment:', error);
            alert('Có lỗi xảy ra khi xóa tệp');
        } finally {
            setIsDeleting(false);
            setShowActions(false);
        }
    };

    const handleDownload = () => {
        if (attachment.webContentLink) {
            window.open(attachment.webContentLink, '_blank');
        } else if (attachment.webViewLink) {
            window.open(attachment.webViewLink, '_blank');
        }
    };

    const handleView = () => {
        if (attachment.webViewLink) {
            window.open(attachment.webViewLink, '_blank');
        }
    };

    const timeAgo = attachment.createdAt
        ? formatDistanceToNow(new Date(attachment.createdAt), {
              addSuffix: true,
              locale: vi,
          })
        : '';

    return (
        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group transition-colors">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 rounded">
                {getFileIcon(attachment.mimeType, attachment.kind)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleView}
                        className="font-medium text-sm text-gray-900 hover:text-blue-600 truncate"
                        title={attachment.driveName || attachment.name}
                    >
                        {attachment.driveName || attachment.name || 'Untitled'}
                    </button>
                    {attachment.webViewLink && (
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                    )}
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span>{formatFileSize(attachment.size)}</span>
                    <span>•</span>
                    <UserDisplay userId={attachment.author} variant="name" />
                    <span>•</span>
                    <span>{timeAgo}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Download */}
                {attachment.webContentLink && (
                    <button
                        onClick={handleDownload}
                        className="p-2 hover:bg-gray-100 rounded text-gray-600"
                        title="Tải xuống"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                )}

                {/* More actions */}
                {canDelete && (
                    <div className="relative">
                        <button
                            onClick={() => setShowActions(!showActions)}
                            className="p-2 hover:bg-gray-100 rounded text-gray-600"
                            title="Thao tác"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {showActions && (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowActions(false)}
                                />

                                {/* Dropdown */}
                                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px]">
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600 disabled:opacity-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {isDeleting ? 'Đang xóa...' : 'Xóa'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
