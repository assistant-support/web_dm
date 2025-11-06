// components/attachments/AttachmentItem.client.js
'use client';

import { useState } from 'react';
import { 
    FileIcon, Download, Trash2, MoreVertical, 
    FileText, Image as ImageIcon, Film, FileArchive,
    FileSpreadsheet, FileCode, Music, Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import UserDisplay from '@/components/ui/user-display';
import { remove as deleteAttachment } from '@/data/attachment/actions/server';
import FilePreviewModal from './FilePreviewModal.client';

/**
 * Get icon and color by file type
 */
function getFileIconAndColor(mimeType, kind) {
    if (kind === 'image' || mimeType?.startsWith('image/')) {
        return { 
            icon: <ImageIcon className="w-5 h-5" />, 
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            label: 'Hình ảnh'
        };
    }
    if (kind === 'video' || mimeType?.startsWith('video/')) {
        return { 
            icon: <Film className="w-5 h-5" />, 
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            label: 'Video'
        };
    }
    if (mimeType?.includes('pdf')) {
        return { 
            icon: <FileText className="w-5 h-5" />, 
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            label: 'PDF'
        };
    }
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) {
        return { 
            icon: <FileSpreadsheet className="w-5 h-5" />, 
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            label: 'Excel'
        };
    }
    if (mimeType?.includes('document') || mimeType?.includes('word')) {
        return { 
            icon: <FileText className="w-5 h-5" />, 
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            label: 'Word'
        };
    }
    if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('archive')) {
        return { 
            icon: <FileArchive className="w-5 h-5" />, 
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            label: 'Nén'
        };
    }
    if (mimeType?.includes('audio')) {
        return { 
            icon: <Music className="w-5 h-5" />, 
            color: 'text-pink-600',
            bgColor: 'bg-pink-50',
            label: 'Audio'
        };
    }
    if (mimeType?.includes('javascript') || mimeType?.includes('json') || mimeType?.includes('html') || mimeType?.includes('css')) {
        return { 
            icon: <FileCode className="w-5 h-5" />, 
            color: 'text-gray-600',
            bgColor: 'bg-gray-50',
            label: 'Code'
        };
    }
    return { 
        icon: <FileIcon className="w-5 h-5" />, 
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        label: 'File'
    };
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
export default function AttachmentItem({ attachment, canDelete, onDeleted, viewMode = 'list' }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Bạn có chắc muốn xóa tệp này?')) return;

        setIsDeleting(true);
        try {
            const result = await deleteAttachment({ attachmentId: attachment.id });
            if (result?._removed) {
                onDeleted?.(attachment.id);
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
        }
    };

    const handleView = () => {
        setShowPreview(true);
    };

    const timeAgo = attachment.createdAt
        ? formatDistanceToNow(new Date(attachment.createdAt), {
              addSuffix: true,
              locale: vi,
          })
        : '';

    const fileInfo = getFileIconAndColor(attachment.mime, attachment.kind);

    // Grid view (like image 2)
    if (viewMode === 'grid') {
        return (
            <>
                <div className="relative border border-gray-200 rounded-lg hover:shadow-md transition-shadow group bg-white p-4">
                    {/* Delete button - top right */}
                    {canDelete && (
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm hover:bg-red-50 text-gray-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            title="Xóa"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}

                    {/* File content - Icon + Info */}
                    <button
                        onClick={handleView}
                        className="w-full flex items-start gap-3 cursor-pointer text-left"
                    >
                        {/* Icon on the left */}
                        <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg ${fileInfo.bgColor}`}>
                            <div className={fileInfo.color}>
                                {fileInfo.icon.type === ImageIcon && <ImageIcon className="w-6 h-6" />}
                                {fileInfo.icon.type === Film && <Film className="w-6 h-6" />}
                                {fileInfo.icon.type === FileText && <FileText className="w-6 h-6" />}
                                {fileInfo.icon.type === FileSpreadsheet && <FileSpreadsheet className="w-6 h-6" />}
                                {fileInfo.icon.type === FileArchive && <FileArchive className="w-6 h-6" />}
                                {fileInfo.icon.type === Music && <Music className="w-6 h-6" />}
                                {fileInfo.icon.type === FileCode && <FileCode className="w-6 h-6" />}
                                {fileInfo.icon.type === FileIcon && <FileIcon className="w-6 h-6" />}
                            </div>
                        </div>

                        {/* File info on the right */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate">
                                {attachment.name || 'Untitled'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {formatFileSize(attachment.size)}
                            </p>
                        </div>
                    </button>
                </div>

                {/* Preview Modal */}
                {showPreview && (
                    <FilePreviewModal
                        file={attachment}
                        onClose={() => setShowPreview(false)}
                    />
                )}
            </>
        );
    }

    // List view (default)
    return (
        <>
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group transition-colors">
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded ${fileInfo.bgColor}`}>
                    <div className={fileInfo.color}>
                        {fileInfo.icon}
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleView}
                            className="font-medium text-sm text-gray-900 hover:text-blue-600 truncate flex items-center gap-1.5"
                            title={attachment.name}
                        >
                            {attachment.name || 'Untitled'}
                        </button>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${fileInfo.bgColor} ${fileInfo.color}`}>
                            {fileInfo.label}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span>{formatFileSize(attachment.size)}</span>
                        <span>•</span>
                        <UserDisplay userId={attachment.createdBy} variant="name" />
                        <span>•</span>
                        <span>{timeAgo}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* View */}
                    <button
                        onClick={handleView}
                        className="p-2 hover:bg-blue-50 rounded text-blue-600"
                        title="Xem"
                    >
                        <Eye className="w-4 h-4" />
                    </button>

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

            {/* Preview Modal */}
            {showPreview && (
                <FilePreviewModal
                    file={attachment}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </>
    );
}
