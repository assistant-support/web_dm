// components/tasks/SubtaskApprovalButton.client.js
// Button để parent assignee duyệt subtask hoàn thành

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import { approveSubtaskCompletion } from '@/data/task/actions/subtask-approval.server';
import PointsApprovalModal from './PointsApprovalModal.client';

/**
 * SubtaskApprovalButton - Duyệt subtask completion
 * 
 * @param {Object} props
 * @param {Object} props.subtask - Subtask object
 * @param {number} props.parentInitialPoints - Parent task initialPoints
 * @param {string} props.parentAssignee - Parent task assignee userId
 * @param {string} props.currentUserId - Current user's externalUserId
 */
export default function SubtaskApprovalButton({ 
    subtask, 
    parentInitialPoints = 0,
    parentAssignee, 
    currentUserId 
}) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);

    // Only show if:
    // 1. Subtask is awaiting review
    // 2. Current user is parent task assignee
    const isAwaitingReview = subtask.status === 'completed_await_review';
    const canApprove = currentUserId === parentAssignee;

    if (!isAwaitingReview || !canApprove) {
        return null;
    }

    const handleApproveClick = () => {
        setShowModal(true);
    };

    const handleApprove = async (finalPoints) => {
        setIsSubmitting(true);
        setError('');
        setShowModal(false);

        try {
            const result = await approveSubtaskCompletion(subtask._id, { 
                approve: true,
                finalPoints,
            });

            if (!result.ok) {
                setError(result.message || 'Không thể phê duyệt');
                return;
            }

            router.refresh();
        } catch (err) {
            console.error('Subtask approval error:', err);
            setError(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!confirm('Bạn có chắc muốn yêu cầu làm lại subtask này?')) return;

        setIsSubmitting(true);
        setError('');

        try {
            const result = await approveSubtaskCompletion(subtask._id, { approve: false });

            if (!result.ok) {
                setError(result.message || 'Không thể yêu cầu làm lại');
                return;
            }

            router.refresh();
        } catch (err) {
            console.error('Subtask rejection error:', err);
            setError(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg space-y-3">
                <p className="text-sm text-yellow-800">
                    ⚠️ Subtask này đang chờ bạn duyệt hoàn thành
                </p>

                {error && (
                    <p className="text-sm text-red-600">{error}</p>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={handleApproveClick}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        <CheckCircle className="h-4 w-4" />
                        Duyệt hoàn thành
                    </button>
                    <button
                        onClick={handleReject}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                        <XCircle className="h-4 w-4" />
                        Yêu cầu làm lại
                    </button>
                </div>
            </div>

            <PointsApprovalModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={handleApprove}
                title="Duyệt hoàn thành subtask"
                taskName={subtask.title || 'Subtask'}
                suggestedPoints={subtask.initialPoints || 0}
                maxPoints={parentInitialPoints}
                type="subtask"
                isSubmitting={isSubmitting}
            />
        </>
    );
}
