'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link.js';
import { formatDistanceToNow } from 'date-fns';
import {
    Workflow,
    MessageSquare,
    Paperclip,
    Loader2,
    CheckCircle2,
    XCircle,
    RefreshCw,
    File as FileIcon,
    // Các icon cho loại file
    FileText,
    FileSpreadsheet,
    // FilePresentation,
    FileImage,
    FileAudio,
    FileVideo,
    FileArchive
} from 'lucide-react';

import { create as createCommentAction } from '@/data/comment/actions/server';
import { uploadFileToTaskAction } from '@/data/drive/actions/server.js'; // Đảm bảo đường dẫn này đúng
import { driveImage } from '@/functions/index.js';
import DialogComponent from '@/components/ui/dialog';
import SubtaskList from './SubtaskList.client.js';
import WorkflowViewer from '@/components/tasks/WorkflowViewer.client.js';


// --- HELPER COMPONENT ĐỂ HIỂN THỊ ICON FILE ---

/**
 * Trả về một icon Lucide dựa trên mimeType.
 */
function getIconForMimeType(mimeType = '') {
    const iconProps = { className: "h-8 w-8 flex-shrink-0" };

    if (mimeType.startsWith('image/')) {
        return <FileImage {...iconProps} className={`${iconProps.className} text-blue-500`} />;
    }
    if (mimeType.startsWith('video/')) {
        return <FileVideo {...iconProps} className={`${iconProps.className} text-red-500`} />;
    }
    if (mimeType.startsWith('audio/')) {
        return <FileAudio {...iconProps} className={`${iconProps.className} text-orange-500`} />;
    }

    switch (mimeType) {
        case 'application/pdf':
            return <FileText {...iconProps} className={`${iconProps.className} text-red-600`} />;
        case 'application/vnd.google-apps.document':
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return <FileText {...iconProps} className={`${iconProps.className} text-blue-600`} />;
        case 'application/vnd.google-apps.spreadsheet':
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            return <FileSpreadsheet {...iconProps} className={`${iconProps.className} text-green-600`} />;
        case 'application/vnd.google-apps.presentation':
        case 'application/vnd.ms-powerpoint':
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
            return <FilePresentation {...iconProps} className={`${iconProps.className} text-yellow-600`} />;
        case 'application/zip':
        case 'application/x-rar-compressed':
        case 'application/x-7z-compressed':
            return <FileArchive {...iconProps} className={`${iconProps.className} text-gray-500`} />;
        default:
            return <FileIcon {...iconProps} className={`${iconProps.className} text-gray-400`} />;
    }
}

/**
 * [SỬA] Hiển thị một file Drive (ảnh, video, hoặc icon + link).
 * @param {object} props
 * @param {object} props.file - Đối tượng file đầy đủ (id, name, mimeType, webViewLink)
 */
function DriveFileLink({ file }) {
    if (!file || !file.id || !file.name) return null;

    const icon = getIconForMimeType(file.mimeType);
    const mimeType = file.mimeType || '';

    // 1. Hiển thị Ảnh
    if (mimeType.startsWith('image/')) {
        return (
            <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block w-full aspect-square border rounded-md overflow-hidden hover:shadow-lg transition-shadow"
                title={file.name}
            >
                <img
                    src={`https://drive.google.com/uc?id=${file.id}`}
                    alt={file.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-2 transition-opacity duration-300">
                    <span className="text-sm font-medium text-white truncate w-full text-left">
                        {file.name}
                    </span>
                </div>
            </a>
        );
    }

    // 2. [THÊM] Hiển thị Video
    if (mimeType.startsWith('video/')) {
        return (
            <div
                className="group relative block w-full aspect-square border rounded-md overflow-hidden bg-black"
                title={file.name}
            >
                <video
                    controls // Thêm controls để user có thể play/pause
                    className="w-full h-full object-contain" // object-contain để thấy toàn bộ video
                    preload="metadata" // Chỉ tải metadata (thời lượng, dimensions)
                    src={`https://drive.google.com/uc?id=${file.id}`}
                >
                    Trình duyệt của bạn không hỗ trợ thẻ video.
                    <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">Xem file</a>
                </video>
                {/* Lớp phủ tên file (giống ảnh) */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-2 transition-opacity duration-300 opacity-100 group-hover:opacity-100">
                    <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-white truncate w-full text-left hover:underline"
                    >
                        {file.name}
                    </a>
                </div>
            </div>
        );
    }

    // 3. Hiển thị Icon cho các file khác
    return (
        <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center text-center gap-3 p-4 border rounded-md hover:bg-gray-50 h-full"
            title={file.name}
        >
            <span className="flex-shrink-0">{icon}</span>
            <span className="text-blue-600 hover:underline break-all text-sm font-medium">
                {file.name}
            </span>
        </a>
    );
}
// --- KẾT THÚC HELPER COMPONENT ---


/**
 * Component con hiển thị preview file (khi upload).
 */
function FilePreviewCard({ fileObj, onRetry }) {
    const { file, status, previewUrl, error, id } = fileObj;

    return (
        <div className="relative border border-gray-200 rounded-md p-2 flex flex-col items-center text-sm text-gray-800">
            <div className="w-full aspect-square rounded-md bg-gray-100 flex items-center justify-center relative overflow-hidden mb-2">
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <FileIcon className="w-12 h-12 text-gray-400" />
                )}

                {status !== 'pending' && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center p-2">
                        {status === 'uploading' && <Loader2 className="w-8 h-8 text-white animate-spin" />}
                        {status === 'success' && <CheckCircle2 className="w-8 h-8 text-green-400" />}
                        {status === 'error' && (
                            <div className="flex flex-col items-center gap-2 text-center">
                                <XCircle className="w-8 h-8 text-red-400" />
                                <button
                                    onClick={() => onRetry(id)}
                                    className="text-xs bg-white text-black px-3 py-1 rounded-md hover:bg-gray-200 flex items-center gap-1"
                                >
                                    <RefreshCw size={12} />
                                    Thử lại
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div
                className={`truncate w-full text-center font-medium ${status === 'error' ? 'text-red-600' : 'text-gray-700'}`}
                title={file.name}
            >
                {file.name}
            </div>

            {status === 'error' && (
                <div className="text-xs text-red-600 text-center w-full truncate" title={error}>
                    {error || 'Lỗi không xác định'}
                </div>
            )}
        </div>
    );
}


/**
 * Component chính hiển thị nội dung của Task.
 */
export default function TaskMainContent({
    task,
    subtasks,
    currentUser,
    canManage,
    isAssignee,
    isCreator,
    allUsersWithDetails,
    projectMembers,
    users,
    workTypes,
    platforms,
    workflow,
    comments: initialComments,
    attachments // Mảng các đối tượng file đầy đủ [{ id, name, mimeType, ... }]
}) {
    const [newComment, setNewComment] = useState('');

    // State chứa danh sách file đầy đủ (từ props)
    const [attachmentsState, setAttachmentsState] = useState(attachments || []);

    const [filesToUpload, setFilesToUpload] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const router = useRouter();

    // Đồng bộ prop 'attachments' vào state khi nó thay đổi (sau khi refresh)
    useEffect(() => {
        setAttachmentsState(attachments || []);
    }, [attachments]);

    // Dọn dẹp URL preview
    useEffect(() => {
        return () => {
            filesToUpload.forEach(fileObj => {
                if (fileObj.previewUrl) {
                    URL.revokeObjectURL(fileObj.previewUrl);
                }
            });
        };
    }, [filesToUpload]);

    // Xử lý thêm bình luận
    const handleAddComment = async () => {
        if (newComment.trim()) {
            try {
                await createCommentAction({
                    taskId: task._id,
                    body: newComment,
                });
                setNewComment('');
                router.refresh();
            } catch (error) {
                console.error('Failed to add comment:', error);
            }
        }
    };

    // Xử lý khi người dùng chọn file trong popup
    const handleFileSelection = (event) => {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        const newFileObjects = files.map(file => ({
            id: `${file.name}-${file.lastModified}-${file.size}-${Math.random()}`,
            file: file,
            status: 'pending',
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            error: null
        }));

        setFilesToUpload(prev => [...prev, ...newFileObjects]);
        event.target.value = null;
    };

    // Xử lý "Thử lại" (Retry) cho một file bị lỗi
    const handleRetryUpload = async (fileId) => {
        const fileObj = filesToUpload.find(f => f.id === fileId);
        if (isUploading || !fileObj || fileObj.status !== 'error') return;

        setIsUploading(true);
        setFilesToUpload(prev =>
            prev.map(f => f.id === fileId ? { ...f, status: 'uploading', error: null } : f)
        );

        const formData = new FormData();
        formData.append('file', fileObj.file);
        formData.append('taskId', task._id);

        let success = false;
        try {
            const result = await uploadFileToTaskAction(formData);
            if (result.success) {
                setFilesToUpload(prev =>
                    prev.map(f => f.id === fileId ? { ...f, status: 'success' } : f)
                );
                success = true;
            } else {
                setFilesToUpload(prev =>
                    prev.map(f => f.id === fileId ? { ...f, status: 'error', error: result.error } : f)
                );
            }
        } catch (err) {
            setFilesToUpload(prev =>
                prev.map(f => f.id === fileId ? { ...f, status: 'error', error: err.message } : f)
            );
        }

        setIsUploading(false);

        if (success) {
            router.refresh();
            setFilesToUpload(prev => prev.filter(f => f.id !== fileId));
        }
    };


    // Xử lý "Tải lên" (Upload) tất cả các file đang 'pending'
    const handleUploadFiles = async () => {
        const filesToProcess = filesToUpload.filter(f => f.status === 'pending');
        if (isUploading || !filesToProcess.length) return;

        setIsUploading(true);
        let uploadOccurred = false;

        for (const fileObj of filesToProcess) {
            uploadOccurred = true;
            setFilesToUpload(prev =>
                prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading' } : f)
            );

            const formData = new FormData();
            formData.append('file', fileObj.file);
            formData.append('taskId', task._id);

            try {
                const result = await uploadFileToTaskAction(formData);
                if (result.success) {
                    setFilesToUpload(prev =>
                        prev.map(f => f.id === fileObj.id ? { ...f, status: 'success' } : f)
                    );
                } else {
                    setFilesToUpload(prev =>
                        prev.map(f => f.id === fileObj.id ? { ...f, status: 'error', error: result.error } : f)
                    );
                }
            } catch (err) {
                setFilesToUpload(prev =>
                    prev.map(f => f.id === fileObj.id ? { ...f, status: 'error', error: err.message } : f)
                );
            }
        }

        setIsUploading(false);

        if (uploadOccurred) {
            router.refresh();
        }

        setFilesToUpload(prev => prev.filter(f => f.status !== 'success'));
    };

    // Xử lý đóng/mở dialog (với cảnh báo)
    const handleDialogOpenChange = (open) => {
        if (!open && isUploading) {
            const userConfirmed = window.confirm(
                "⚠️ Đang tải tệp lên!\n\nNếu bạn đóng bây giờ, quá trình tải sẽ bị gián đoạn và bạn sẽ không thấy tiến trình.\n\nBạn có chắc muốn đóng?"
            );
            if (!userConfirmed) {
                return;
            }
        }
        setIsDialogOpen(open);
        if (!open) {
            setFilesToUpload([]);
            setIsUploading(false);
        }
    };

    // Quyền upload
    const canUpload = isAssignee || subtasks.some((subtask) => subtask.assignee?.externalUserId === currentUser.externalUserId);

    return (
        <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* --- Phần Workflow --- */}
            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                        <Workflow size={18} className="text-blue-600" />
                        Quy trình (Workflow)
                    </h3>
                    {isAssignee && !task.parentTask && (
                        <Link
                            variant="outline"
                            size="xs"
                            href={`/tasks/${task._id}/workflow`}
                        >
                            Chỉnh sửa Workflow
                        </Link>
                    )}
                </div>
                <div className="p-4">
                    <WorkflowViewer workflow={workflow} />
                </div>
            </div>

            {/* --- Phần SubtaskList --- */}
            {!task.parentTask && (
                <SubtaskList
                    parentTask={task}
                    subtasks={subtasks}
                    currentUser={currentUser}
                    canManage={canManage}
                    isCreator={isCreator}
                    allUsersWithDetails={allUsersWithDetails}
                    projectMembers={projectMembers}
                    users={users}
                    workTypes={workTypes}
                    platforms={platforms}
                    isAssignee={isAssignee}
                />
            )}

            {/* --- Phần Bình luận --- */}
            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                        <MessageSquare size={18} className="text-purple-600" />
                        Bình luận ({initialComments.length})
                    </h3>
                </div>
                <div className="p-4">
                    <ul className="space-y-4">
                        {initialComments.map((comment) => (
                            <li key={comment.id} className="flex items-start gap-3">
                                <img
                                    src={driveImage(comment.author.avatar) || 'https://lh3.googleusercontent.com/d/16EGtxONxjbU3XF6TGSCb-kK7ciRLw4Pk'}
                                    alt={comment.author.name}
                                    className="w-12 h-12 rounded-full"
                                />
                                <div>
                                    <div className="text-sm font-medium text-gray-800 flex gap-2 items-center">
                                        <p className='text-base font-bold text-gray-500'>{comment.author.name}</p>
                                        <div className="text-sm text-gray-600">
                                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                        </div>
                                    </div>
                                    <p className="mt-1 text-base text-gray-500">
                                        {comment.body}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {canManage && (
                        <div className="mt-4 flex items-center gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Thêm bình luận..."
                                className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
                            />
                            <button
                                onClick={handleAddComment}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
                            >
                                Gửi
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Attachments Section (Đã sửa) --- */}
            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                        <Paperclip size={18} className="text-orange-600" />
                        Tệp đính kèm ({attachmentsState.length})
                    </h3>

                    <button
                        onClick={() => handleDialogOpenChange(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                        disabled={!canUpload}
                    >
                        Thêm tệp
                    </button>
                </div>
                <div className="p-4">
                    {attachmentsState.length === 0 ? (
                        <p className="text-sm text-gray-500">Chưa có tệp đính kèm.</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {attachmentsState.map((file) => (
                                <DriveFileLink key={file.id} file={file} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- Upload Dialog --- */}
            <DialogComponent
                open={isDialogOpen}
                onOpenChange={handleDialogOpenChange}
                title="Tải tệp lên"
                size="xl"
            >
                <div className="flex flex-col gap-4">
                    <input
                        type="file"
                        onChange={handleFileSelection}
                        className="border border-gray-300 rounded-md p-2 text-sm"
                        multiple
                        disabled={isUploading}
                    />

                    {filesToUpload.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-1">
                            {filesToUpload.map((fileObj) => (
                                <FilePreviewCard
                                    key={fileObj.id}
                                    fileObj={fileObj}
                                    onRetry={handleRetryUpload}
                                />
                            ))}
                        </div>
                    )}

                    <button
                        onClick={handleUploadFiles}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400"
                        disabled={isUploading || filesToUpload.filter(f => f.status === 'pending').length === 0}
                    >
                        {isUploading ? (
                            <span className='flex items-center justify-center gap-2'>
                                <Loader2 className='w-4 h-4 animate-spin' />
                                Đang tải lên...
                            </span>
                        ) : (
                            `Tải lên ${filesToUpload.filter(f => f.status === 'pending').length} tệp`
                        )}
                    </button>
                </div>
            </DialogComponent>

        </div>
    );
}