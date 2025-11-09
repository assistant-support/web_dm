'use client';

import Image from 'next/image';
import { X, Download, FileIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFileIconConfig } from '@/app/(auth)/(main)/files/file-icon.config.js';

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

    const mime = file?.mime ?? '';
    const isImage = mime.startsWith('image/');
    const isPDF = mime.includes('pdf');
    const isVideo = mime.startsWith('video/');
    const isAudio = mime.startsWith('audio/');
    const isDocument =
        mime.includes('document') ||
        mime.includes('word') ||
        mime.includes('msword') ||
        mime.includes('sheet') ||
        mime.includes('excel') ||
        mime.includes('presentation') ||
        mime.includes('powerpoint');
    const isText = mime.startsWith('text/');

    const canPreview = isImage || isPDF || isVideo || isAudio || isDocument || isText;

    const { icon: HeaderIcon, headerClass } = getFileIconConfig(file || {});

    useEffect(() => {
        if (!file) {
            setIsLoading(false);
            setError(null);
            return;
        }

        if (!canPreview) {
            setIsLoading(false);
            setError(null);
            return;
        }

        if (!file.access?.previewUrl) {
            setIsLoading(false);
            setError('Không tìm thấy đường dẫn xem trước');
            return;
        }

        setIsLoading(true);
        setError(null);
    }, [canPreview, file]);

    useEffect(() => {
        if (!file || !canPreview) return;
        if (typeof window === 'undefined' || !window.Image) return;
        const previewUrl = file.access?.previewUrl;
        if (!previewUrl || !mime.startsWith('image/')) return;
        const preload = new window.Image();
        preload.src = previewUrl;
        return () => {
            preload.src = '';
        };
    }, [canPreview, file, mime]);

    if (!file) return null;

    const previewUrl = file.access?.previewUrl || null;
    const downloadUrl = file.access?.downloadUrl || null;

    const handleDownload = () => {
        if (downloadUrl) {
            window.open(downloadUrl, '_blank', 'noopener');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="relative flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <HeaderIcon className={`h-5 w-5 ${headerClass}`} />
                        <div className="min-w-0 flex-1">
                            <h3 className="truncate text-lg font-semibold">{file.name || 'File'}</h3>
                            <p className="text-sm text-gray-500">{file.mime || 'Unknown type'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {downloadUrl && (
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="rounded p-2 text-gray-600 hover:bg-gray-100"
                                title="Tải xuống"
                            >
                                <Download className="h-5 w-5" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded p-2 text-gray-600 hover:bg-gray-100"
                            title="Đóng"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-gray-50 p-6">
                    {!canPreview ? (
                        <div className="flex h-full flex-col items-center justify-center text-gray-500">
                            <FileIcon className="mb-4 h-16 w-16 text-gray-300" />
                            <p className="text-lg font-medium">Không thể xem trước loại file này</p>
                            <p className="mt-2 text-sm">Vui lòng tải xuống để xem</p>
                            {downloadUrl && (
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    className="mt-4 flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                >
                                    <Download className="h-4 w-4" />
                                    Tải xuống
                                </button>
                            )}
                        </div>
                    ) : error ? (
                        <div className="flex h-full flex-col items-center justify-center text-red-600">
                            <p className="text-lg font-medium">Không thể tải file</p>
                            <p className="mt-2 text-sm">{error}</p>
                        </div>
                    ) : (
                        <div className="relative flex min-h-[500px] w-full items-center justify-center">
                            {isImage && previewUrl && (
                                <Image
                                    src={previewUrl}
                                    alt={file.name || 'Image'}
                                    width={1600}
                                    height={900}
                                    className="h-full max-h-full w-full object-contain"
                                    sizes="(max-width: 1536px) 100vw, 1536px"
                                    unoptimized
                                    decoding="async"
                                    onLoadingComplete={() => {
                                        setIsLoading(false);
                                        setError(null);
                                    }}
                                    onError={() => {
                                        setIsLoading(false);
                                        setError('Không thể tải hình ảnh');
                                    }}
                                />
                            )}

                            {isVideo && previewUrl && (
                                <video
                                    src={previewUrl}
                                    controls
                                    preload="auto"
                                    className="max-h-full w-full rounded border"
                                    onLoadedData={() => setIsLoading(false)}
                                    onError={() => {
                                        setIsLoading(false);
                                        setError('Không thể tải video');
                                    }}
                                />
                            )}

                            {isAudio && previewUrl && (
                                <audio
                                    src={previewUrl}
                                    controls
                                    className="w-full"
                                    onLoadedData={() => setIsLoading(false)}
                                    onError={() => {
                                        setIsLoading(false);
                                        setError('Không thể tải audio');
                                    }}
                                />
                            )}

                            {!isImage && !isVideo && !isAudio && canPreview && previewUrl && (
                                <iframe
                                    src={previewUrl}
                                    className="h-full min-h-[500px] w-full rounded border-0"
                                    title={file.name || 'File preview'}
                                    onLoad={() => {
                                        setIsLoading(false);
                                        setError(null);
                                    }}
                                    onError={() => {
                                        setIsLoading(false);
                                        setError('Không thể tải file');
                                    }}
                                />
                            )}

                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
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
