// components/comments/CommentItem.client.js
'use client';

import { useState } from 'react';
import { Trash2, Edit2, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import UserDisplay from '@/components/ui/user-display';
import Button from '@/components/ui/button';
import { remove as deleteComment } from '@/data/comment/actions/server';

/**
 * CommentItem - Hiển thị một comment
 * @param {Object} props
 * @param {Object} props.comment - Comment data
 * @param {boolean} props.canDelete - User có thể xóa comment này không
 * @param {Function} props.onDeleted - Callback sau khi xóa
 */
export default function CommentItem({ comment, canDelete, onDeleted }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;

        setIsDeleting(true);
        try {
            const result = await deleteComment({ commentId: comment._id });
            if (result?._removed) {
                onDeleted?.(comment._id);
            } else {
                alert('Không thể xóa bình luận');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('Có lỗi xảy ra khi xóa bình luận');
        } finally {
            setIsDeleting(false);
            setShowActions(false);
        }
    };

    const timeAgo = comment.createdAt
        ? formatDistanceToNow(new Date(comment.createdAt), {
              addSuffix: true,
              locale: vi,
          })
        : '';

    return (
        <div className="flex gap-3 py-3 border-b border-gray-100 last:border-0 group">
            {/* Avatar */}
            <div className="flex-shrink-0">
                <UserDisplay userId={comment.author} variant="avatar" size="sm" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                        <UserDisplay userId={comment.author} variant="name" className="font-medium text-sm" />
                        <span className="text-xs text-gray-500">{timeAgo}</span>
                    </div>

                    {/* Actions */}
                    {canDelete && (
                        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => setShowActions(!showActions)}
                                className="p-1 hover:bg-gray-100 rounded text-gray-500"
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

                {/* Body */}
                <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {comment.body}
                </div>

                {/* Mentions */}
                {comment.mentions && comment.mentions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {comment.mentions.map((userId) => (
                            <span
                                key={userId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                            >
                                <span>@</span>
                                <UserDisplay userId={userId} variant="name" />
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
