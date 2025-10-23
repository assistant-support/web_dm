// components/comments/CommentList.client.js
'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import CommentItem from './CommentItem.client';
import CommentForm from './CommentForm.client';
import { listByTaskAction } from '@/data/comment/actions/server';

/**
 * CommentList - Danh sách comments của task
 * @param {Object} props
 * @param {string} props.taskId - Task ID
 * @param {Object} props.currentUser - Current user object
 * @param {boolean} props.canManage - User có quyền manage project không
 * @param {number} props.initialCount - Initial comment count từ task
 */
export default function CommentList({ taskId, currentUser, canManage, initialCount = 0 }) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    console.log(comments);
    
    const loadComments = async () => {
        try {
            setLoading(true);
            setError('');
            const result = await listByTaskAction({ taskId });
            // Extract data array from response
            const commentsData = result?.data || result || [];
            setComments(Array.isArray(commentsData) ? commentsData : []);
        } catch (err) {
            console.error('Error loading comments:', err);
            setError('Không thể tải bình luận');
            setComments([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadComments();
    }, [taskId]);

    const handleCommentAdded = (newComment) => {
        // Thêm comment mới vào đầu danh sách
        setComments((prev) => [newComment, ...prev]);
    };

    const handleCommentDeleted = (commentId) => {
        // Xóa comment khỏi danh sách
        setComments((prev) => prev.filter((c) => c._id !== commentId));
    };

    const canDeleteComment = (comment) => {
        // User có thể xóa nếu: là author hoặc có quyền manage
        return comment.author === currentUser?.externalUserId || canManage;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 pb-2 border-b">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-lg">
                    Bình luận ({comments.length})
                </h3>
            </div>

            {/* Comment Form */}
            <CommentForm taskId={taskId} onCommentAdded={handleCommentAdded} />

            {/* Comments List */}
            <div className="space-y-0">
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Đang tải bình luận...
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-red-600">
                        {error}
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Chưa có bình luận nào</p>
                        <p className="text-sm mt-1">Hãy là người đầu tiên bình luận!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {comments.map((comment) => (
                            <CommentItem
                                key={comment._id}
                                comment={comment}
                                canDelete={canDeleteComment(comment)}
                                onDeleted={handleCommentDeleted}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Load more (nếu cần pagination) */}
            {comments.length > 0 && comments.length >= 30 && (
                <div className="text-center pt-4">
                    <button
                        onClick={loadComments}
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        Tải thêm bình luận
                    </button>
                </div>
            )}
        </div>
    );
}
