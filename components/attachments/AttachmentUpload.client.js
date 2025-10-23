// components/attachments/AttachmentUpload.client.js
'use client';

import { useState, useRef } from 'react';
import { Upload, Paperclip, Loader2 } from 'lucide-react';
import Button from '@/components/ui/button';
import { upload as uploadAttachment } from '@/data/attachment/actions/server';

/**
 * AttachmentUpload - File upload component
 */
export default function AttachmentUpload({ taskId, projectId, scope = 'task', onUploaded }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleFileSelect = async (files) => {
        if (!files || files.length === 0) return;

        const file = files[0];

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            setError('Tệp quá lớn. Kích thước tối đa: 10MB');
            return;
        }

        setIsUploading(true);
        setError('');
        setUploadProgress(`Đang tải lên ${file.name}...`);

        try {
            // Convert file to base64
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result;
                    // Remove data:mime;base64, prefix
                    const base64Data = result.split(',')[1];
                    resolve(base64Data);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Determine file kind
            let kind = 'other';
            if (file.type.startsWith('image/')) kind = 'image';
            else if (file.type.startsWith('video/')) kind = 'video';
            else if (file.type.includes('pdf') || file.type.includes('document')) kind = 'doc';

            // Upload
            const result = await uploadAttachment({
                projectId,
                taskId: scope === 'task' ? taskId : null,
                scope,
                file: {
                    name: file.name,
                    mime: file.type,
                    base64: base64,
                },
                kind,
            });

            if (result) {
                setUploadProgress('');
                onUploaded?.(result);
                // Reset file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } else {
                setError('Không thể tải lên tệp');
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Có lỗi xảy ra khi tải lên tệp');
        } finally {
            setIsUploading(false);
            setUploadProgress('');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer?.files;
        handleFileSelect(files);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-2">
            {/* Drop zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleClick}
                className={`
                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                    ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
                    ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    disabled={isUploading}
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                />

                {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <p className="text-sm text-gray-600">{uploadProgress}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <Upload className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-700">
                                Kéo thả tệp vào đây hoặc click để chọn
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Hỗ trợ: Hình ảnh, Video, PDF, Documents (tối đa 10MB)
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Error message */}
            {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                    {error}
                </div>
            )}

            {/* Quick upload button */}
            {!isUploading && (
                <Button
                    type="button"
                    onClick={handleClick}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                >
                    <Paperclip className="w-4 h-4" />
                    Chọn tệp từ máy tính
                </Button>
            )}
        </div>
    );
}
