/**
 * @file components/attachments/AttachmentUpload.client.js
 * @description Client component to handle multiple file uploads to Google Drive with progress tracking
 */
'use client';

import { useState } from 'react';
import { createAttachment } from '@/data/attachment/actions/server';
import { Upload, X, Loader2, CheckCircle, XCircle, File } from 'lucide-react';

export function AttachmentUpload({ taskId, projectId, scope, onUploaded }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            
            setSelectedFiles(files);
            setError(null);
            // Initialize progress for each file
            const initialProgress = {};
            files.forEach((file, idx) => {
                initialProgress[idx] = { status: 'pending', progress: 0, error: null };
            });
            setUploadProgress(initialProgress);
        }
    };

    const uploadSingleFile = async (file, index) => {
        
        
        try {
            // Update status to uploading
            setUploadProgress(prev => ({
                ...prev,
                [index]: { status: 'uploading', progress: 50, error: null }
            }));

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', file);
            
            if (scope === 'task') {
                formData.append('taskId', taskId);
                formData.append('scope', 'task');
            } else {
                formData.append('projectId', projectId);
                formData.append('scope', 'project');
            }

            
            
            // Upload to server (chỉ gọi 1 lần)
            const result = await createAttachment(formData);

            

            if (result.ok) {
                // Success
                setUploadProgress(prev => ({
                    ...prev,
                    [index]: { status: 'success', progress: 100, error: null, data: result.data }
                }));
                return { success: true, data: result.data };
            } else {
                throw new Error(result.message || 'Upload failed');
            }

        } catch (err) {
            console.error(`[AttachmentUpload] Error uploading ${file.name}:`, err);
            const errorMsg = err.message || 'Không thể tải lên tệp';
            
            setUploadProgress(prev => ({
                ...prev,
                [index]: { status: 'error', progress: 0, error: errorMsg }
            }));
            
            return { success: false, error: errorMsg };
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            setError('Vui lòng chọn tệp');
            return;
        }

        try {
            setUploading(true);
            setError(null);

            

            // Upload all files sequentially (để tránh quá tải server)
            const results = [];
            for (let i = 0; i < selectedFiles.length; i++) {
                const result = await uploadSingleFile(selectedFiles[i], i);
                results.push(result);
            }

            // Check if any uploads succeeded
            const successCount = results.filter(r => r.success).length;
            

            if (successCount > 0) {
                // Notify parent to reload the list
                if (onUploaded) {
                    onUploaded({ count: successCount, results });
                }
            }

            if (successCount === selectedFiles.length) {
                // All succeeded - reset form after a delay
                setTimeout(() => {
                    handleCancel();
                }, 2000);
            } else {
                // Some failed
                const failedCount = selectedFiles.length - successCount;
                setError(`${failedCount} tệp tải lên thất bại`);
            }

        } catch (err) {
            console.error('[AttachmentUpload] Upload error:', err);
            setError(err.message || 'Không thể tải lên tệp');
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        
        setSelectedFiles([]);
        setUploadProgress({});
        setError(null);
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[index];
            return newProgress;
        });
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
                        {selectedFiles.length > 0 
                            ? `${selectedFiles.length} tệp đã chọn` 
                            : 'Chọn tệp để tải lên (nhiều file)'
                        }
                    </span>
                </label>
                <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    multiple
                />
            </div>

            {/* Selected files list with progress */}
            {selectedFiles.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedFiles.map((file, index) => {
                        const progress = uploadProgress[index] || { status: 'pending', progress: 0 };
                        
                        return (
                            <div 
                                key={`${file.name}-${index}`}
                                className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                            >
                                {/* File icon & name */}
                                <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-700 truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>

                                {/* Status icon */}
                                {progress.status === 'pending' && !uploading && (
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="text-gray-400 hover:text-red-500"
                                        disabled={uploading}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                                {progress.status === 'uploading' && (
                                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                                )}
                                {progress.status === 'success' && (
                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                )}
                                {progress.status === 'error' && (
                                    <div className="flex items-center gap-1">
                                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                        {progress.error && (
                                            <span className="text-xs text-red-600 truncate max-w-[100px]" title={progress.error}>
                                                {progress.error}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                    {error}
                </div>
            )}

            {/* Action buttons */}
            {selectedFiles.length > 0 && (
                <div className="flex gap-2">
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang tải lên...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Tải lên {selectedFiles.length} tệp
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
