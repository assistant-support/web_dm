// components/tasks/SubtaskListSimple.client.js
// Hiển thị subtasks với UI mở rộng và dropdown actions

'use client';

import { useState, useEffect } from 'react';
import { getUserId } from '@/lib/permissions.js';
import Link from 'next/link';
import { updateTaskStatus, assignTask, updateTask } from '@/data/task/actions/server';
import { 
    CheckCircle2, Circle, CircleDashed, CircleHelp,
    PauseCircle, PlayCircle, XCircle, Loader2,
    User, CalendarDays, MoreVertical, UserPlus, UserCheck, UserX,
    Check, Play, Pause, Edit
} from 'lucide-react';
import clsx from 'clsx';
import { getWorkTypeByCode, getWorkTypeColor } from '@/data/workTypes/constants';
import { useAsyncNotifier } from '@/hooks/loading.hook';
import Dropdown from '@/components/ui/dropdown';
import SubtaskApprovalButton from './SubtaskApprovalButton.client';
import UserDisplay from '@/components/ui/user-display';
import { formatTaskPoints } from '@/lib/points';
import Button from '@/components/ui/button';
import TaskPointsBadge from './TaskPointsBadge.client';

const getStatusInfo = (status) => {
    switch (status) {
        case 'draft': return { icon: CircleDashed, color: 'text-gray-400', bg: 'bg-gray-100', label: 'Nháp' };
        case 'pending_approval': return { icon: CircleHelp, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Chờ duyệt' };
        case 'waiting_confirm': return { icon: CircleHelp, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Chờ xác nhận' };
        case 'in_progress': return { icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Đang làm' };
        case 'on_hold': return { icon: PauseCircle, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Tạm dừng' };
        case 'completed_await_review': return { icon: CheckCircle2, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Chờ duyệt' };
        case 'completed': return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Hoàn thành' };
        case 'rejected': return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Từ chối' };
        case 'cancelled': return { icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-100', label: 'Đã hủy' };
        default: return { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100', label: status };
    }
};

const getPriorityInfo = (priority) => {
    switch (priority) {
        case 'urgent': return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: ' Khẩn' };
        case 'high': return { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Cao' };
        case 'medium': return { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', label: 'TB' };
        case 'low': return { color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Thấp' };
        default: return { color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200', label: '-' };
    }
};

const fmt = (d) =>
    d ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(d)) : '';

export default function SubtaskListSimple({ 
    parentTaskId,
    parentTask = null,
    initialSubtasks = [],
    users = [],
    currentUserId = '',
    canManage = false 
}) {
    const [subtasks, setSubtasks] = useState(initialSubtasks);
    const taskCreatorId = getUserId(parentTask?.createdBy);
    const canManageSubtask = canManage || (taskCreatorId === currentUserId);

    useEffect(() => {
        setSubtasks(initialSubtasks);
    }, [initialSubtasks]);

    const handleStatusChanged = (subtaskId, newStatus, newAssignee) => {
        setSubtasks(prev => 
            prev.map(st => 
                st._id === subtaskId 
                    ? { ...st, status: newStatus, ...(newAssignee !== undefined && { assignee: newAssignee }) } 
                    : st
            )
        );
    };

    if (subtasks.length === 0) {
        return (
            <div className="pl-12 pr-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-sm text-gray-500 italic">Chưa có công việc con nào</p>
            </div>
        );
    }

    return (
        <div className="pl-8 pr-4 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Công việc con ({subtasks.length})
                    </p>
                </div>
                {subtasks.map((subtask) => (
                    <SubtaskItem 
                        key={subtask._id} 
                        subtask={subtask} 
                        users={users}
                        currentUserId={currentUserId}
                        canManageSubtask={canManageSubtask}
                        onStatusChanged={handleStatusChanged}
                    />
                ))}
            </div>
        </div>
    );
}

function SubtaskItem({ subtask, users, currentUserId, canManageSubtask, onStatusChanged }) {
    const { run, Overlays } = useAsyncNotifier();
    const [showAssignForm, setShowAssignForm] = useState(false);
    const [selectedAssignee, setSelectedAssignee] = useState(getUserId(subtask.assignee) || '');
    
    const statusInfo = getStatusInfo(subtask.status);
    const StatusIcon = statusInfo.icon;
    const priorityInfo = getPriorityInfo(subtask.priority);
    const workTypeInfo = subtask.workType ? getWorkTypeByCode(subtask.workType) : null;
    const assigneeInfo = users.find(u => u.value === getUserId(subtask.assignee));
    const dueDate = fmt(subtask.plannedDueAt);
    
    const isAssignee = getUserId(subtask.assignee) === currentUserId;
    const canInteract = canManageSubtask || isAssignee;
    const isRejected = subtask.status === 'rejected';
    const needsConfirm = subtask.status === 'waiting_confirm' && isAssignee;
    const needsApproval = subtask.status === 'pending_approval' && canManageSubtask;
    const needsReview = subtask.status === 'completed_await_review' && canManageSubtask;

    const handleStatusChange = async (newStatus) => {
        await run(
            () => updateTaskStatus(subtask._id, newStatus),
            {
                loadingMessage: 'Đang cập nhật...',
                successMessage: 'Cập nhật trạng thái thành công',
                notify: 'success',
                onSuccess: () => onStatusChanged?.(subtask._id, newStatus)
            }
        );
    };

    const handleAssign = async () => {
        if (!selectedAssignee) return;
        await run(
            () => assignTask(subtask._id, selectedAssignee),
            {
                loadingMessage: 'Đang giao việc...',
                successMessage: 'Giao việc thành công',
                notify: 'success',
                onSuccess: () => {
                    onStatusChanged?.(subtask._id, 'waiting_confirm', selectedAssignee);
                    setShowAssignForm(false);
                }
            }
        );
    };

    const handleAccept = async () => {
        await run(
            () => updateTaskStatus(subtask._id, 'in_progress'),
            {
                loadingMessage: 'Đang xác nhận nhận việc...',
                successMessage: 'Đã nhận việc và bắt đầu làm',
                notify: 'success',
                onSuccess: () => onStatusChanged?.(subtask._id, 'in_progress')
            }
        );
    };

    const handleReject = async () => {
        await run(
            () => updateTask(subtask._id, { 
                status: 'rejected',
                assignee: null,
                'assigneeConfirm.status': 'rejected',
                'assigneeConfirm.at': new Date()
            }),
            {
                loadingMessage: 'Đang từ chối công việc...',
                successMessage: 'Đã từ chối công việc',
                notify: 'success',
                onSuccess: () => onStatusChanged?.(subtask._id, 'rejected', null)
            }
        );
    };

    const handleApprove = async () => {
        await run(
            () => updateTask(subtask._id, { 
                status: 'draft',
                'approval.status': 'approved',
                'approval.by': currentUserId,
                'approval.at': new Date()
            }),
            {
                loadingMessage: 'Đang duyệt...',
                successMessage: 'Duyệt công việc thành công',
                notify: 'success',
                onSuccess: () => onStatusChanged?.(subtask._id, 'draft')
            }
        );
    };

    const handleReviewApprove = async () => {
        await run(
            () => updateTaskStatus(subtask._id, 'completed'),
            {
                loadingMessage: 'Đang duyệt hoàn thành...',
                successMessage: 'Duyệt hoàn thành thành công',
                notify: 'success',
                onSuccess: () => onStatusChanged?.(subtask._id, 'completed')
            }
        );
    };

    return (
        <>
            <Overlays />
            <div className={clsx(
                "flex items-center gap-3 py-3 px-4 bg-white rounded-lg border transition-all hover:shadow-sm group",
                isRejected ? "border-red-300 bg-red-50/50" : "border-gray-200"
            )}>
                <div className="flex-shrink-0">
                    <StatusIcon className={clsx("h-5 w-5", statusInfo.color)} />
                </div>
                
                <div className="flex-grow min-w-0 flex items-center gap-3">
                    <div className="flex-grow min-w-0">
                        <Link href={`/tasks/${subtask._id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
                            {subtask.title}
                        </Link>
                    </div>
                    
                    {workTypeInfo && (
                        <div className={clsx("flex-shrink-0 text-xs px-2 py-1 rounded border font-medium whitespace-nowrap", getWorkTypeColor(workTypeInfo.color))}>
                            <span className="mr-1">{workTypeInfo.icon}</span>
                            <span className="hidden sm:inline">{workTypeInfo.name}</span>
                        </div>
                    )}
                    
                    <div className={clsx("flex-shrink-0 text-xs px-2 py-1 rounded border font-medium", priorityInfo.color, priorityInfo.bg, priorityInfo.border)}>
                        {priorityInfo.label}
                    </div>
                    
                    <div className={clsx("flex-shrink-0 text-xs px-2 py-1 rounded font-medium", statusInfo.color, statusInfo.bg)}>
                        {statusInfo.label}
                    </div>
                    
                    <div className="flex-shrink-0 flex items-center gap-1.5 text-xs text-gray-600 min-w-[120px]">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate">{assigneeInfo ? assigneeInfo.label : <span className="text-gray-400">Chưa giao</span>}</span>
                    </div>
                    
                    <div className="flex-shrink-0 flex items-center gap-1.5 text-xs text-gray-600 w-16">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                        <span>{dueDate}</span>
                    </div>
                    
                    <div className="flex-shrink-0">
                        <TaskPointsBadge task={subtask} size="sm" />
                    </div>
                </div>
                
                {canInteract && (
                    <div className="flex-shrink-0">
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100" title="Thao tác">
                                    <MoreVertical className="h-4 w-4" />
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content position="bottom-right" width="w-56" className="z-10">
                                <div className="p-1 space-y-0.5">
                                    {isRejected && (
                                        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 mb-2">
                                            <strong> Đã từ chối</strong><br/>Cần giao lại cho người khác
                                        </div>
                                    )}
                                    
                                    {canManageSubtask && (
                                        <>
                                            {(!subtask.assignee || isRejected) && (
                                                <button onClick={() => setShowAssignForm(!showAssignForm)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded">
                                                    <UserPlus className="h-4 w-4" />
                                                    <span>{isRejected ? 'Giao lại' : 'Giao việc'}</span>
                                                </button>
                                            )}
                                            {needsApproval && (
                                                <button onClick={handleApprove} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded">
                                                    <Check className="h-4 w-4" />
                                                    <span>Duyệt công việc</span>
                                                </button>
                                            )}
                                            {needsReview && (
                                                <button onClick={handleReviewApprove} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    <span>Duyệt hoàn thành</span>
                                                </button>
                                            )}
                                            <div className="border-t border-gray-200 my-1"></div>
                                        </>
                                    )}
                                    
                                    {isAssignee && (
                                        <>
                                            {needsConfirm && (
                                                <>
                                                    <button onClick={handleAccept} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded">
                                                        <UserCheck className="h-4 w-4" />
                                                        <span>Nhận việc</span>
                                                    </button>
                                                    <button onClick={handleReject} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded">
                                                        <UserX className="h-4 w-4" />
                                                        <span>Từ chối việc</span>
                                                    </button>
                                                    <div className="border-t border-gray-200 my-1"></div>
                                                </>
                                            )}
                                            {subtask.status === 'draft' && (
                                                <button onClick={() => handleStatusChange('in_progress')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded">
                                                    <Play className="h-4 w-4" />
                                                    <span>Bắt đầu</span>
                                                </button>
                                            )}
                                            {subtask.status === 'in_progress' && (
                                                <>
                                                    <button onClick={() => handleStatusChange('on_hold')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded">
                                                        <Pause className="h-4 w-4" />
                                                        <span>Tạm dừng</span>
                                                    </button>
                                                    <button onClick={() => handleStatusChange('completed_await_review')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        <span>Hoàn thành</span>
                                                    </button>
                                                </>
                                            )}
                                            {subtask.status === 'on_hold' && (
                                                <button onClick={() => handleStatusChange('in_progress')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded">
                                                    <Play className="h-4 w-4" />
                                                    <span>Tiếp tục</span>
                                                </button>
                                            )}
                                        </>
                                    )}
                                    
                                    <div className="border-t border-gray-200 my-1"></div>
                                    <Link href={`/tasks/${subtask._id}`} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                                        <Edit className="h-4 w-4" />
                                        <span>Chi tiết</span>
                                    </Link>
                                </div>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                )}
            </div>
            
            {showAssignForm && (
                <div className="ml-8 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                        {isRejected ? 'Giao lại cho người khác' : 'Chọn người thực hiện'}
                    </label>
                    <div className="flex items-center gap-2">
                        <select value={selectedAssignee} onChange={(e) => setSelectedAssignee(e.target.value)} className="flex-grow text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <option value="">-- Chọn người --</option>
                            {users.filter(u => u.value !== subtask.assignee).map(u => (
                                <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                        </select>
                        <button onClick={handleAssign} disabled={!selectedAssignee} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">Giao</button>
                        <button onClick={() => { setShowAssignForm(false); setSelectedAssignee(subtask.assignee || ''); }} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">Hủy</button>
                    </div>
                </div>
            )}
        </>
    );
}
