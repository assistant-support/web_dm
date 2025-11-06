// components/attachments/AttachmentList.client.js
'use client';

import { useEffect, useState } from 'react';
import { Paperclip, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import AttachmentItem from './AttachmentItem.client';
import { AttachmentUpload } from './AttachmentUpload.client';
import { listTaskAttachments, listProjectAttachments } from '@/data/attachment/actions/server';

/**
 * AttachmentList - List attachments with upload
 */
export default function AttachmentList({
    taskId,
    projectId,
    scope = 'task',
    currentUser,
    canManage,
    initialCount = 0,
}) {
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showUpload, setShowUpload] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    const loadAttachments = async () => {
        try {
            setLoading(true);
            setError('');

            const result = scope === 'task'
                ? await listTaskAttachments(taskId)
                : await listProjectAttachments(projectId);

            console.log('[AttachmentList] API Response:', result);

            // Extract data array from response
            const attachmentsData = result?.data || result || [];
            console.log('[AttachmentList] Attachments Data:', attachmentsData);
            
            setAttachments(Array.isArray(attachmentsData) ? attachmentsData : []);
        } catch (err) {
            console.error('Error loading attachments:', err);
            setError('Không thể tải danh sách tệp');
            setAttachments([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAttachments();
    }, [taskId, projectId, scope]);

    const handleUploaded = (newAttachment) => {
        console.log('[AttachmentList] File uploaded:', newAttachment);
        // Reload the list to get fresh data from server
        loadAttachments();
        setShowUpload(false);
    };

    const handleDeleted = (attachmentId) => {
        console.log('[AttachmentList] File deleted:', attachmentId);
        // Reload the list to get fresh data from server
        loadAttachments();
    };

    const canDeleteAttachment = (attachment) => {
        // User can delete if: is author OR has manage permission
        return attachment.createdBy === currentUser?.externalUserId || canManage;
    };

    return (
        <div className="space-y-4 bg-blue">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                    <Paperclip className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-lg">
                        Tệp đính kèm ({attachments.length})
                    </h3>
                    {isCollapsed ? (
                        <ChevronDown className="w-4 h-4" />
                    ) : (
                        <ChevronUp className="w-4 h-4" />
                    )}
                </button>

                {!isCollapsed && !showUpload && (
                    <button
                        onClick={() => setShowUpload(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        + Thêm tệp
                    </button>
                )}
            </div>

            {/* Collapsed state */}
            {isCollapsed && (
                <div className="text-sm text-gray-500 italic">
                    Click để xem {attachments.length} tệp đính kèm
                </div>
            )}

            {/* Expanded content */}
            {!isCollapsed && (
                <>
                    {/* Upload form */}
                    {showUpload && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-sm">Tải lên tệp mới</h4>
                                <button
                                    onClick={() => setShowUpload(false)}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    Hủy
                                </button>
                            </div>
                            <AttachmentUpload
                                taskId={taskId}
                                projectId={projectId}
                                scope={scope}
                                onUploaded={handleUploaded}
                            />
                        </div>
                    )}

                    {/* Attachments list - Grid layout */}
                    <div>
                        {loading ? (
                            <div className="flex items-center justify-center py-8 text-gray-500">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Đang tải tệp...
                            </div>
                        ) : error ? (
                            <div className="text-center py-8 text-red-600">
                                {error}
                            </div>
                        ) : attachments.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Paperclip className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>Chưa có tệp đính kèm</p>
                                <p className="text-sm mt-1">
                                    Click "Thêm tệp" để tải lên tệp đầu tiên
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {attachments.map((attachment) => (
                                    <AttachmentItem
                                        key={attachment.id}
                                        attachment={attachment}
                                        canDelete={canDeleteAttachment(attachment)}
                                        onDeleted={handleDeleted}
                                        viewMode="grid"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
