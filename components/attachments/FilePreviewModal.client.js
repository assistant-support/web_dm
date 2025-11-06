'use client';

import { X, Download, FileText, FileIcon } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * FilePreviewModal - Preview files in modal
 * Supports: Images, PDFs, Videos
 */
export default function FilePreviewModal({ file, onClose }) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!file) return null;

    const isImage = file.mime?.startsWith('image/');
    const isPDF = file.mime?.includes('pdf');
    const isVideo = file.mime?.startsWith('video/');
    const isAudio = file.mime?.startsWith('audio/');
    const isWord = file.mime?.includes('document') || file.mime?.includes('word') || file.mime?.includes('msword');
    const isExcel = file.mime?.includes('sheet') || file.mime?.includes('excel') || file.mime?.includes('ms-excel');
    const isPowerPoint = file.mime?.includes('presentation') || file.mime?.includes('powerpoint') || file.mime?.includes('ms-powerpoint');
    const isText = file.mime?.startsWith('text/');
    
    // Can preview if it's any supported type
    const canPreview = isImage || isPDF || isVideo || isAudio || isWord || isExcel || isPowerPoint || isText;

    // Build preview URL using Google Drive file ID
    const getPreviewUrl = () => {
        if (!file.driveFileId) return null;
        
        if (isImage) {
            // Get direct image URL
            return `https://drive.google.com/uc?export=view&id=${file.driveFileId}`;
        }
        
        // For all other types, use embedded viewer
        // This blocks navigation while allowing preview
        return `https://drive.google.com/file/d/${file.driveFileId}/preview`;
    };

    const previewUrl = getPreviewUrl();

    const handleDownload = () => {
        if (file.webContentLink) {
            window.open(file.webContentLink, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isImage ? <FileIcon className="w-5 h-5 text-blue-600" /> : 
                         isPDF ? <FileText className="w-5 h-5 text-red-600" /> :
                         isVideo ? <FileIcon className="w-5 h-5 text-purple-600" /> :
                         <FileIcon className="w-5 h-5 text-gray-600" />}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate">
                                {file.name || 'File'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {file.mime || 'Unknown type'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {file.webContentLink && (
                            <button
                                onClick={handleDownload}
                                className="p-2 hover:bg-gray-100 rounded text-gray-600"
                                title="Tải xuống"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded text-gray-600"
                            title="Đóng"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-auto p-6 bg-gray-50">
                    {!canPreview ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <FileIcon className="w-16 h-16 mb-4 text-gray-300" />
                            <p className="text-lg font-medium">Không thể xem trước loại file này</p>
                            <p className="text-sm mt-2">Vui lòng tải xuống để xem</p>
                            {file.webContentLink && (
                                <button
                                    onClick={handleDownload}
                                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Tải xuống
                                </button>
                            )}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full text-red-600">
                            <p className="text-lg font-medium">Không thể tải file</p>
                            <p className="text-sm mt-2">{error}</p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full min-h-[500px]">
                            {isImage && previewUrl && (
                                <img
                                    src={previewUrl}
                                    alt={file.name || 'Image'}
                                    className="max-w-full max-h-full object-contain"
                                    onLoad={() => setIsLoading(false)}
                                    onError={() => {
                                        setIsLoading(false);
                                        setError('Không thể tải hình ảnh');
                                    }}
                                />
                            )}
                            
                            {/* Iframe for all other file types (PDF, Video, Audio, Office docs, Text) */}
                            {!isImage && previewUrl && (
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full min-h-[500px] rounded border-0"
                                    title={file.name || 'File preview'}
                                    onLoad={() => setIsLoading(false)}
                                    onError={() => {
                                        setIsLoading(false);
                                        setError('Không thể tải file');
                                    }}
                                    allow="autoplay"
                                    sandbox="allow-scripts allow-same-origin"
                                    style={{ pointerEvents: 'auto' }}
                                />
                            )}

                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                        <p className="text-sm text-gray-600">Đang tải...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
