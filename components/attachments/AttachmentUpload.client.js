/**
 * @file components/attachments/AttachmentUpload.client.js
 * @description Client component to handle file uploads to Google Drive
 */
'use client';

import { useState } from 'react';
import { createAttachment } from '@/data/attachment/actions/server';
import { Upload, X, Loader2 } from 'lucide-react';

export function AttachmentUpload({ taskId, projectId, scope, onUploaded }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Vui lòng chọn tệp');
            return;
        }

        try {
            setUploading(true);
            setError(null);

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', selectedFile);
            
            if (scope === 'task') {
                formData.append('taskId', taskId);
                formData.append('scope', 'task');
            } else {
                formData.append('projectId', projectId);
                formData.append('scope', 'project');
            }

            // Upload to server
            const result = await createAttachment(formData);

            if (result.ok) {
                // Success - notify parent
                if (onUploaded) {
                    onUploaded(result.data);
                }
                // Reset form
                setSelectedFile(null);
                const fileInput = document.getElementById('file-upload');
                if (fileInput) fileInput.value = '';
            } else {
                throw new Error(result.message || 'Upload failed');
            }

        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Không thể tải lên tệp');
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        setSelectedFile(null);
        setError(null);
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
    };

    return (
        <div className="space-y-3">
            {/* File input */}
            <div>
                <label 
                    htmlFor="file-upload" 
                    className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                    <Upload className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">
                        {selectedFile ? selectedFile.name : 'Chọn tệp để tải lên'}
                    </span>
                </label>
                <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploading}
                />
            </div>

            {/* Selected file preview */}
            {selectedFile && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center gap-2 flex-1">
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span className="text-sm truncate">{selectedFile.name}</span>
                        <span className="text-xs text-gray-500">
                            ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                    </div>
                    <button
                        onClick={handleCancel}
                        className="text-gray-400 hover:text-gray-600"
                        disabled={uploading}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                    {error}
                </div>
            )}

            {/* Upload button */}
            {selectedFile && (
                <div className="flex gap-2">
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang tải lên...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Tải lên
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={uploading}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Hủy
                    </button>
                </div>
            )}
        </div>
    );
}

