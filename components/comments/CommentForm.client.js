// components/comments/CommentForm.client.js
'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import Button from '@/components/ui/button';
import { create as createComment } from '@/data/comment/actions/server';

/**
 * CommentForm - Form để tạo comment mới
 * @param {Object} props
 * @param {string} props.taskId - Task ID
 * @param {Function} props.onCommentAdded - Callback sau khi tạo comment thành công
 */
export default function CommentForm({ taskId, onCommentAdded }) {
    const [body, setBody] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!body.trim()) {
            setError('Vui lòng nhập nội dung bình luận');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const result = await createComment({
                taskId,
                body: body.trim(),
            });

            if (result) {
                setBody('');
                onCommentAdded?.(result);
            } else {
                setError('Không thể tạo bình luận');
            }
        } catch (err) {
            console.error('Error creating comment:', err);
            setError('Có lỗi xảy ra khi tạo bình luận');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e) => {
        // Ctrl+Enter hoặc Cmd+Enter để submit
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <div className="relative">
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Viết bình luận... (Ctrl+Enter để gửi)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={isSubmitting}
                />
                
                {/* Character count hint */}
                {body.length > 0 && (
                    <div className="absolute bottom-2 left-3 text-xs text-gray-400">
                        {body.length} ký tự
                    </div>
                )}
            </div>

            {error && (
                <div className="text-sm text-red-600">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                    Gõ @ để mention người khác
                </div>
                
                <Button
                    type="submit"
                    disabled={!body.trim() || isSubmitting}
                    className="flex items-center gap-2"
                >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? 'Đang gửi...' : 'Gửi bình luận'}
                </Button>
            </div>
        </form>
    );
}
