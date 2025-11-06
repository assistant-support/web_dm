'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link.js';
import { formatDistanceToNow } from 'date-fns';
import {
    Workflow,
    MessageSquare,
} from 'lucide-react';

import { create as createCommentAction } from '@/data/comment/actions/server';
import { driveImage } from '@/functions/index.js';
import SubtaskList from './SubtaskList.client.js';
import WorkflowViewer from '@/components/tasks/WorkflowViewer.client.js';
import AttachmentList from '@/components/attachments/AttachmentList.client.js';


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
}) {
    const [newComment, setNewComment] = useState('');
    const router = useRouter();

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

    // Quyền quản lý attachments
    const canManageAttachments = isAssignee || isCreator;

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

            {/* --- Phần Tệp đính kèm (Sử dụng AttachmentList component) --- */}
            <AttachmentList
                taskId={task._id}
                scope="task"
                currentUser={currentUser}
                canManage={canManageAttachments}
                initialCount={task.attachmentsCount || 0}
            />

        </div>
    );
}