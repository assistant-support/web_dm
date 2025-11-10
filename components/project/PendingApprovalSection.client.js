'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TASK_STATUS } from '@/model/common/enums';
import { Check, X, Clock } from 'lucide-react';
import PointsApprovalModal from '@/components/tasks/PointsApprovalModal.client';
import { submitTaskApproval } from '@/actions/task-approval.actions';

export default function PendingApprovalSection({ initialTasks, usersMap, projectId }) {
    const router = useRouter();
    const [tasks, setTasks] = useState(initialTasks);
    const [processing, setProcessing] = useState({});
    const [isMutating, startTransition] = useTransition();
    const [modalState, setModalState] = useState({
        isOpen: false,
        taskId: null,
        taskName: '',
        isPendingStart: false,
        suggestedPoints: 0,
    });

    const handleApproveClick = (taskId, isPendingStart, taskTitle, requiredPoints) => {
        setModalState({
            isOpen: true,
            taskId,
            taskName: taskTitle,
            isPendingStart,
            suggestedPoints: requiredPoints || 0,
        });
    };

    const handleApprove = (points) => {
        const { taskId, isPendingStart } = modalState;
        
        setModalState(prev => ({ ...prev, isOpen: false }));
        setProcessing(prev => ({ ...prev, [taskId]: 'approving' }));
        startTransition(() => {
            submitTaskApproval({
                taskId,
                type: isPendingStart ? 'start' : 'complete',
                approve: true,
                points,
            })
                .then((result) => {
                    if (result.success) {
                        setTasks(prev => prev.filter(t => t._id !== taskId));
                        router.refresh();
                    } else if (result?.error) {
                        alert(result.error);
                    }
                })
                .catch((error) => {
                    console.error('Error approving task:', error);
                    alert('Có lỗi xảy ra khi duyệt công việc');
                })
                .finally(() => {
                    setProcessing(prev => {
                        const newState = { ...prev };
                        delete newState[taskId];
                        return newState;
                    });
                });
        });
    };

    const handleReject = (taskId, isPendingStart) => {
        const reason = prompt('Lý do từ chối (tùy chọn):');
        if (reason === null) return;

        setProcessing(prev => ({ ...prev, [taskId]: 'rejecting' }));
        startTransition(() => {
            submitTaskApproval({
                taskId,
                type: isPendingStart ? 'start' : 'complete',
                approve: false,
                note: reason || '',
            })
                .then((result) => {
                    if (result.success) {
                        setTasks(prev => prev.filter(t => t._id !== taskId));
                        router.refresh();
                    } else if (result?.error) {
                        alert(result.error);
                    }
                })
                .catch((error) => {
                    console.error('Error rejecting task:', error);
                    alert('Có lỗi xảy ra khi từ chối công việc');
                })
                .finally(() => {
                    setProcessing(prev => {
                        const newState = { ...prev };
                        delete newState[taskId];
                        return newState;
                    });
                });
        });
    };

    if (tasks.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Công việc chờ duyệt (0)
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Không có công việc nào cần duyệt
                    </p>
                </div>
                <div className="px-6 py-12">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            Không có công việc chờ duyệt
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Tất cả công việc đã được xử lý hoặc chưa có yêu cầu duyệt nào
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                    Công việc chờ duyệt ({tasks.length})
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                    {tasks.length} công việc đang chờ kiểm tra và phê duyệt
                </p>
            </div>

            <div className="divide-y divide-gray-200">
                {tasks.map(task => {
                    const assigneeInfo = task.assignee && usersMap[task.assignee];
                    const creatorInfo = task.createdBy && usersMap[task.createdBy];
                    const isPendingStart = task.status === TASK_STATUS.PENDING_APPROVAL;
                    const badgeColor = isPendingStart 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-purple-100 text-purple-800';
                    const badgeText = isPendingStart 
                        ? 'Chờ duyệt bắt đầu' 
                        : 'Chờ duyệt hoàn thành';
                    
                    const isProcessing = processing[task._id];
                    const isApproving = isProcessing === 'approving';
                    const isRejecting = isProcessing === 'rejecting';

                    return (
                        <div key={task._id} className="px-6 py-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <a
                                            href={`/${task._id}`}
                                            className="font-medium text-gray-900 hover:text-blue-600 truncate"
                                        >
                                            {task.title}
                                        </a>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor} whitespace-nowrap`}>
                                            <Clock className="w-3 h-3 mr-1" />
                                            {badgeText}
                                        </span>
                                    </div>
                                    
                                    {task.description && (
                                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                            {task.description}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                        {task.workTypeInfo && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium">Loại:</span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 border border-gray-200">
                                                    {task.workTypeInfo.name}
                                                </span>
                                            </div>
                                        )}
                                        {task.platformsInfo && task.platformsInfo.length > 0 && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium">Nền tảng:</span>
                                                <div className="flex gap-1">
                                                    {task.platformsInfo.map(platform => (
                                                        <span 
                                                            key={platform._id} 
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border"
                                                            style={{ 
                                                                backgroundColor: platform.color ? `${platform.color}20` : '#f3f4f6', 
                                                                borderColor: platform.color || '#d1d5db',
                                                                color: platform.color || '#374151'
                                                            }}
                                                        >
                                                            {platform.icon && <span>{platform.icon}</span>}
                                                            <span>{platform.name}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {assigneeInfo && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium">Người thực hiện:</span>
                                                <span>{assigneeInfo.displayName}</span>
                                            </div>
                                        )}
                                        {creatorInfo && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium">Người tạo:</span>
                                                <span>{creatorInfo.displayName}</span>
                                            </div>
                                        )}
                                        {task.plannedDueAt && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium">Hạn:</span>
                                                <span>{new Date(task.plannedDueAt).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                        )}
                                        {task.initialPoints > 0 && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium">Điểm:</span>
                                                <span>{task.initialPoints}đ</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => handleApproveClick(task._id, isPendingStart, task.title, task.requiredPoints)}
                                        disabled={!!isProcessing || isMutating}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isApproving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Đang duyệt...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                <span>Duyệt</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleReject(task._id, isPendingStart)}
                                        disabled={!!isProcessing || isMutating}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isRejecting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Đang từ chối...</span>
                                            </>
                                        ) : (
                                            <>
                                                <X className="w-4 h-4" />
                                                <span>Từ chối</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <PointsApprovalModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                onSubmit={handleApprove}
                title={modalState.isPendingStart ? 'Duyệt công việc' : 'Duyệt hoàn thành công việc'}
                taskName={modalState.taskName}
                suggestedPoints={modalState.suggestedPoints}
                type={modalState.isPendingStart ? 'creation' : 'completion'}
                isSubmitting={processing[modalState.taskId] === 'approving' || isMutating}
            />
        </div>
    );
}
