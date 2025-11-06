// components/tasks/ApprovalPanel.client.js
// UI Panel cho phê duyệt task: creation, assignment, completion

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Award } from 'lucide-react';
import { Textarea } from '@/components/ui/input';
import { 
    approveTaskCreation,
    confirmAssignment, 
    approveTaskCompletion 
} from '@/data/task/actions/approval.server';
import PointsApprovalModal from './PointsApprovalModal.client';

/**
 * ApprovalPanel - Hiển thị panel phê duyệt tương ứng với status
 * 
 * @param {Object} props
 * @param {Object} props.task - Task object
 * @param {boolean} props.canApprove - User có quyền approve không (Manager)
 * @param {boolean} props.isAssignee - User có phải assignee không
 * @param {Function} props.onUpdate - Callback after approval
 */
export default function ApprovalPanel({ 
    task, 
    canApprove = false, 
    isAssignee = false,
    onUpdate 
}) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showPointsModal, setShowPointsModal] = useState(false);
    const [pointsModalType, setPointsModalType] = useState('creation'); // 'creation' | 'completion'
    
    // Form states
    const [approvalNote, setApprovalNote] = useState('');

    // CASE 1: Task đang chờ duyệt tạo (Member created → Manager approve)
    const isPendingCreationApproval = task.status === 'pending_approval' && task.approval?.required;
    
    // CASE 2: Task đang chờ Assignee xác nhận (Manager assigned → Member confirm)
    const isPendingAssigneeConfirm = task.status === 'waiting_confirm' && isAssignee;
    
    // CASE 3: Task chờ duyệt hoàn thành (Member done → Manager final approve)
    const isPendingCompletionApproval = task.status === 'completed_await_review' && canApprove;

    // Handle Creation Approval (Manager) - Open modal
    const handleCreationApprovalClick = () => {
        setPointsModalType('creation');
        setShowPointsModal(true);
    };

    const handleCreationApprovalSubmit = async (points) => {
        setShowPointsModal(false);
        setIsSubmitting(true);
        setError('');

        try {
            const result = await approveTaskCreation(task._id, {
                approve: true,
                initialPoints: points,
                note: approvalNote.trim() || undefined,
            });

            if (!result.ok) {
                setError(result.message || 'Không thể phê duyệt');
                return;
            }

            onUpdate?.(result.data);
            router.refresh();
        } catch (err) {
            console.error('Approval error:', err);
            setError(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreationRejection = async () => {
        if (!confirm('Bạn có chắc muốn từ chối công việc này?')) return;
        
        setIsSubmitting(true);
        setError('');

        try {
            const result = await approveTaskCreation(task._id, {
                approve: false,
                note: approvalNote.trim() || undefined,
            });

            if (!result.ok) {
                setError(result.message || 'Không thể từ chối');
                return;
            }

            onUpdate?.(result.data);
            router.refresh();
        } catch (err) {
            console.error('Rejection error:', err);
            setError(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Assignment Confirmation (Assignee)
    const handleAssignmentConfirm = async (accept) => {
        setIsSubmitting(true);
        setError('');

        try {
            const result = await confirmAssignment(task._id, { accept });

            if (!result.ok) {
                setError(result.message || 'Không thể xác nhận');
                return;
            }

            onUpdate?.(result.data);
            router.refresh();
        } catch (err) {
            console.error('Confirm error:', err);
            setError(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Completion Approval (Manager) - Open modal
    const handleCompletionApprovalClick = () => {
        setPointsModalType('completion');
        setShowPointsModal(true);
    };

    const handleCompletionApprovalSubmit = async (points) => {
        setShowPointsModal(false);
        setIsSubmitting(true);
        setError('');

        try {
            const result = await approveTaskCompletion(task._id, {
                approve: true,
                finalPoints: points,
                note: approvalNote.trim() || undefined,
            });

            if (!result.ok) {
                setError(result.message || 'Không thể phê duyệt');
                return;
            }

            onUpdate?.(result.data);
            router.refresh();
        } catch (err) {
            console.error('Completion approval error:', err);
            setError(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCompletionRejection = async () => {
        if (!confirm('Bạn có chắc muốn yêu cầu làm lại công việc này?')) return;
        
        setIsSubmitting(true);
        setError('');

        try {
            const result = await approveTaskCompletion(task._id, {
                approve: false,
                note: approvalNote.trim() || undefined,
            });

            if (!result.ok) {
                setError(result.message || 'Không thể từ chối');
                return;
            }

            onUpdate?.(result.data);
            router.refresh();
        } catch (err) {
            console.error('Rejection error:', err);
            setError(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Không hiển thị panel nếu không cần phê duyệt
    if (!isPendingCreationApproval && !isPendingAssigneeConfirm && !isPendingCompletionApproval) {
        return null;
    }

    return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg space-y-4">
            {/* Icon & Title */}
            <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                    {isPendingCreationApproval && (
                        <>
                            <h3 className="text-sm font-semibold text-yellow-900">
                                Chờ phê duyệt tạo công việc
                            </h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                Công việc này đang chờ quản lý phê duyệt và gán điểm ban đầu.
                            </p>
                        </>
                    )}

                    {isPendingAssigneeConfirm && (
                        <>
                            <h3 className="text-sm font-semibold text-yellow-900">
                                Xác nhận nhận công việc
                            </h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                Bạn được giao công việc này ({task.initialPoints || 0} điểm). Vui lòng xác nhận để bắt đầu.
                            </p>
                        </>
                    )}

                    {isPendingCompletionApproval && (
                        <>
                            <h3 className="text-sm font-semibold text-yellow-900">
                                Chờ phê duyệt hoàn thành
                            </h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                Người thực hiện đã báo hoàn thành. Vui lòng kiểm tra và chấm điểm.
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    {error}
                </div>
            )}

            {/* FORM: Creation Approval */}
            {isPendingCreationApproval && canApprove && (
                <div className="space-y-3 pl-8">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ghi chú (tùy chọn)
                        </label>
                        <Textarea
                            value={approvalNote}
                            onChange={(e) => setApprovalNote(e.target.value)}
                            placeholder="Nhập ghi chú nếu cần..."
                            rows={2}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleCreationApprovalClick}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            <CheckCircle className="h-4 w-4" />
                            Phê duyệt
                        </button>
                        <button
                            onClick={handleCreationRejection}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                            <XCircle className="h-4 w-4" />
                            Từ chối
                        </button>
                    </div>
                </div>
            )}

            {/* FORM: Assignment Confirmation */}
            {isPendingAssigneeConfirm && (
                <div className="flex gap-2 pl-8">
                    <button
                        onClick={() => handleAssignmentConfirm(true)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        <CheckCircle className="h-4 w-4" />
                        Nhận công việc
                    </button>
                    <button
                        onClick={() => handleAssignmentConfirm(false)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        <XCircle className="h-4 w-4" />
                        Từ chối
                    </button>
                </div>
            )}

            {/* FORM: Completion Approval */}
            {isPendingCompletionApproval && (
                <div className="space-y-3 pl-8">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nhận xét (tùy chọn)
                        </label>
                        <Textarea
                            value={approvalNote}
                            onChange={(e) => setApprovalNote(e.target.value)}
                            placeholder="Nhập nhận xét về công việc..."
                            rows={2}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleCompletionApprovalClick}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            <CheckCircle className="h-4 w-4" />
                            Phê duyệt hoàn thành
                        </button>
                        <button
                            onClick={handleCompletionRejection}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                            <XCircle className="h-4 w-4" />
                            Yêu cầu làm lại
                        </button>
                    </div>
                </div>
            )}

            {/* Points Approval Modal */}
            <PointsApprovalModal
                isOpen={showPointsModal}
                onClose={() => setShowPointsModal(false)}
                onSubmit={pointsModalType === 'creation' ? handleCreationApprovalSubmit : handleCompletionApprovalSubmit}
                title={pointsModalType === 'creation' ? 'Phê duyệt công việc' : 'Phê duyệt hoàn thành'}
                taskName={task.title || 'Công việc'}
                suggestedPoints={pointsModalType === 'creation' ? (task.requiredPoints || 0) : (task.initialPoints || 0)}
                type={pointsModalType}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}
