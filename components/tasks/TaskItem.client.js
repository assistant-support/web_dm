'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    CheckCircle2, Circle, CircleDashed, Clock, UserCheck, ShieldCheck, Send, Check, X, Users,
    PauseCircle, PlayCircle, XCircle, CalendarDays,
    ChevronRight, ChevronDown, BarChart3,
    MoreVertical, PlusCircle, Edit, Trash2
} from 'lucide-react';
import clsx from 'clsx';
import Button from '@/components/ui/button';
import SubtaskListSimple from './SubtaskListSimple.client';
import Dropdown from '@/components/ui/dropdown';
import { getWorkTypeByCode, getWorkTypeColor } from '@/data/workTypes/constants';
import { TASK_STATUS } from '@/model/common/enums';
import { getUserId } from '@/lib/permissions.js';
import UserInfoPopup from './UserInfoPopup.client';
import Avatar from '@/components/ui/avatar';
import { driveImage } from '@/functions';
import { useAsyncNotifier } from '@/hooks/loading.hook.js';
import {
    approveTaskCreation,
    confirmAssignment,
    approveTaskCompletion
} from '@/data/task/actions/approval.server.js';
import NotifyZaloDialog from '@/components/zalo/NotifyZaloDialog.client';
import DialogComponent from '@/components/ui/dialog';
import TaskPointsBadge from './TaskPointsBadge.client';

const fmt = (d) =>
    d ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(d)) : '—';

const getStatusInfo = (status) => {
    switch (status) {
        case TASK_STATUS.DRAFT: return { icon: CircleDashed, color: 'text-gray-400', label: 'Nháp' };
        case TASK_STATUS.PENDING_APPROVAL: return { icon: ShieldCheck, color: 'text-amber-600', label: 'Chờ duyệt' };
        case TASK_STATUS.WAITING_ASSIGNEE_CONFIRM: return { icon: UserCheck, color: 'text-blue-500', label: 'Chờ xác nhận' };
        case TASK_STATUS.IN_PROGRESS: return { icon: PlayCircle, color: 'text-blue-600', label: 'Đang làm' };
        case TASK_STATUS.ON_HOLD: return { icon: PauseCircle, color: 'text-gray-500', label: 'Tạm dừng' };
        case TASK_STATUS.COMPLETED_AWAIT_REVIEW: return { icon: CheckCircle2, color: 'text-yellow-600', label: 'Chờ duyệt HT' };
        case TASK_STATUS.COMPLETED: return { icon: CheckCircle2, color: 'text-green-600', label: 'Hoàn thành' };
        case TASK_STATUS.REJECTED: return { icon: XCircle, color: 'text-red-600', label: 'Từ chối' };
        case TASK_STATUS.CANCELLED: return { icon: XCircle, color: 'text-gray-400', label: 'Đã hủy' };
        default: return { icon: Circle, color: 'text-gray-400', label: status };
    }
};

const getPriorityInfo = (priority) => {
    switch (priority) {
        case 'urgent': return { color: 'text-red-600 border-red-300 bg-red-50', label: '🔥 Khẩn' };
        case 'high': return { color: 'text-orange-600 border-orange-300 bg-orange-50', label: 'Cao' };
        case 'medium': return { color: 'text-gray-600 border-gray-300 bg-gray-50', label: 'TB' };
        case 'low': return { color: 'text-gray-400 border-gray-200 bg-gray-50', label: 'Thấp' };
        default: return { color: 'text-gray-400 border-gray-200 bg-gray-50', label: '-' };
    }
};

const getStatusChipColor = (color) => {
    if (color.includes('green')) return 'bg-green-50 border-green-200 text-green-600';
    if (color.includes('red')) return 'bg-red-50 border-red-200 text-red-600';
    if (color.includes('blue')) return 'bg-blue-50 border-blue-200 text-blue-600';
    if (color.includes('amber')) return 'bg-amber-50 border-amber-200 text-amber-600';
    if (color.includes('yellow')) return 'bg-yellow-50 border-yellow-200 text-yellow-600';
    if (color.includes('gray-500')) return 'bg-gray-100 border-gray-300 text-gray-600';
    return 'bg-gray-50 border-gray-200 text-gray-500';
};

const DropdownItem = ({ icon: Icon, label, onClick, className = '' }) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded",
            className
        )}
    >
        {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
        <span className="truncate">{label}</span>
    </button>
);

const ActionButton = ({ icon: Icon, label, onClick, variant = 'default', tooltip = '', className = '' }) => {
    const colors = {
        success: 'text-green-600 hover:bg-green-100 border border-green-200 hover:border-green-300',
        danger: 'text-red-600 hover:bg-red-100 border border-red-200 hover:border-red-300',
        info: 'text-blue-600 hover:bg-blue-100 border border-blue-200 hover:border-blue-300',
        warning: 'text-amber-600 hover:bg-amber-100 border border-amber-200 hover:border-amber-300',
        default: 'text-gray-600 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
    };
    return (
        <button
            type="button"
            onClick={onClick}
            title={tooltip || label}
            className={clsx(
                "flex items-center justify-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer",
                colors[variant] || colors.default,
                className
            )}
        >
            {Icon && <Icon size={14} className="flex-shrink-0" />}
            {label && <span className="leading-tight">{label}</span>}
        </button>
    );
};

export default function TaskItem({
    task,
    users = [],
    allUsersWithDetails = [],
    projectMembers = [],
    workTypes = [],
    platforms = [],
    currentUserId = '',
    canManage = false,
    actions,
    onRefresh,
    disableNavigation = false,
    isSubtask = false,
    parentTaskAssignee = null,
}) {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showUserPopup, setShowUserPopup] = useState(false);
    const { run } = useAsyncNotifier();
    const [isBlocking, setIsBlocking] = useState(false);

    // Helper: determine whether the related project is active
    const projectActive = (() => {
        if (!task) return true;
        if (task.project && typeof task.project === 'object' && 'isActive' in task.project) return task.project.isActive;
        if ('projectIsActive' in task) return task.projectIsActive;
        return true;
    })();

    const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
    const [notifyRecipient, setNotifyRecipient] = useState(null);
    const [notifyContext, setNotifyContext] = useState('');

    const {
        onAssign,
        onUpdateStatus,
        onEdit,
        onDelete,
        onAddSubtask
    } = actions || {};

    const statusInfo = getStatusInfo(task.status);
    const priorityInfo = getPriorityInfo(task.priority);
    const StatusIcon = statusInfo.icon;
    const progress = task.progress || { total: 0, completed: 0, percentage: 0 };
    const hasSubtasks = !task.parentTask && progress.total > 0;
    const workTypeInfo = task.workType ? getWorkTypeByCode(task.workType) : null;
    const isCreator = getUserId(task.createdBy) === currentUserId;
    const isAssignee = getUserId(task.assignee) === currentUserId;
    const isProjectManager = canManage;
    const isWaitingConfirm = task.status === TASK_STATUS.WAITING_ASSIGNEE_CONFIRM;
    const isPendingApproval = task.status === TASK_STATUS.PENDING_APPROVAL;
    const isPendingCompletionReview = task.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW;
    const isCompleted = task.status === TASK_STATUS.COMPLETED;
    const isEditable = [TASK_STATUS.DRAFT, TASK_STATUS.PENDING_APPROVAL, TASK_STATUS.WAITING_ASSIGNEE_CONFIRM, TASK_STATUS.REJECTED].includes(task.status);
    const canStartOrHold = [TASK_STATUS.IN_PROGRESS, TASK_STATUS.ON_HOLD].includes(task.status);
    const canMarkDone = [TASK_STATUS.IN_PROGRESS, TASK_STATUS.ON_HOLD].includes(task.status);
    const canCancel = ![TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED].includes(task.status);
    const canDelete = [TASK_STATUS.DRAFT, TASK_STATUS.REJECTED, TASK_STATUS.CANCELLED].includes(task.status);

    const isParentOwner = isSubtask && parentTaskAssignee === currentUserId;
    const canManageSubtask = isSubtask ? (isProjectManager || isParentOwner) : isProjectManager;
    const canAssignSubtask = canManageSubtask || (isSubtask && isCreator);
    const canEditSubtask = canManageSubtask || (isSubtask && (isCreator || isAssignee));
    const isSubtaskAssignee = isSubtask && isAssignee;
    const canApproveOrReject = isProjectManager || (isSubtask && getUserId(task.createdBy) === currentUserId);
    const showApprovalButtons = canApproveOrReject && isPendingCompletionReview;
    const showPendingApproval = isSubtaskAssignee && isPendingCompletionReview && !canApproveOrReject;

    const handleConfirmAssignment = async (accept) => {
        if (!projectActive) {
            alert('Dự án đã lưu trữ — thao tác này bị vô hiệu');
            return;
        }
        let note = '';
        if (!accept) {
            note = prompt('Vui lòng nhập lý do từ chối (không bắt buộc):');
            if (note === null) return;
        }
        setIsBlocking(true);
        try {
            await run(
                () => confirmAssignment(task._id, { accept, note }),
                {
                    loadingMessage: accept ? 'Đang xác nhận nhận việc...' : 'Đang từ chối nhận việc...',
                    successMessage: accept ? 'Đã bắt đầu nhận việc!' : 'Đã từ chối nhận việc.',
                    onSuccess: onRefresh
                }
            );
        } finally {
            setIsBlocking(false);
        }
    };

    const handleApproveCreation = async (approve) => {
        if (!projectActive) {
            alert('Dự án đã lưu trữ — thao tác này bị vô hiệu');
            return;
        }
        let note = '';
        const initialPoints = task.initialPoints || 0;
        if (!approve) {
            note = prompt('Vui lòng nhập lý do từ chối (không bắt buộc):');
            if (note === null) return;
        }
        setIsBlocking(true);
        try {
            await run(
                () => approveTaskCreation(task._id, { approve, note, initialPoints }),
                {
                    loadingMessage: approve ? 'Đang duyệt task...' : 'Đang từ chối task...',
                    successMessage: approve ? 'Task đã được duyệt!' : 'Đã từ chối task.',
                    onSuccess: onRefresh
                }
            );
        } finally {
            setIsBlocking(false);
        }
    };

    const handleApproveCompletion = async (approve) => {
        if (!projectActive) {
            alert('Dự án đã lưu trữ — thao tác này bị vô hiệu');
            return;
        }
        let note = '';
        let finalPoints = task.initialPoints || 0;
        if (approve) {
            const pointsInput = prompt('Duyệt hoàn thành. Nhập điểm cuối cùng:', finalPoints);
            if (pointsInput === null) return;
            finalPoints = Number(pointsInput) || 0;
            note = prompt('Nhập ghi chú (không bắt buộc):');
            if (note === null) return;
        } else {
            note = prompt('Vui lòng nhập lý do yêu cầu làm lại (không bắt buộc):');
            if (note === null) return;
        }
        setIsBlocking(true);
        try {
            await run(
                () => approveTaskCompletion(task._id, { approve, note, finalPoints }),
                {
                    loadingMessage: approve ? 'Đang duyệt hoàn thành...' : 'Đang gửi yêu cầu làm lại...',
                    successMessage: approve ? 'Task đã hoàn thành!' : 'Đã gửi yêu cầu làm lại.',
                    onSuccess: onRefresh
                }
            );
        } finally {
            setIsBlocking(false);
        }
    };

    const findUser = (id) => allUsersWithDetails.find(u => u.id === id);

    const openNotifyDialog = (e, recipientId, context) => {
        e.stopPropagation();
        const recipientUser = findUser(recipientId);
        if (recipientUser) {
            setNotifyRecipient({ id: recipientUser.id, name: recipientUser.name });
            setNotifyContext(context);
            setNotifyDialogOpen(true);
        } else {
            run(() => Promise.reject({ message: 'Không tìm thấy thông tin người nhận.' }), { notify: 'error' });
        }
    };

    const handleNotifyAssignee = (e) => openNotifyDialog(e, getUserId(task.assignee), 'assignee');
    const handleNotifyManagerApproval = (e) => openNotifyDialog(e, getUserId(task.createdBy), 'manager_approval');
    const handleNotifyManagerCompletion = (e) => openNotifyDialog(e, getUserId(task.createdBy), 'manager_completion');

    const handleEdit = (e) => { e.stopPropagation(); onEdit?.(task._id); };

    // Guard edit to prevent opening edit when project archived
    const handleEditGuarded = (e) => { e.stopPropagation(); if (!projectActive) { alert('Dự án đã lưu trữ — không thể chỉnh sửa nhiệm vụ'); return; } onEdit?.(task._id); };

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (!projectActive) {
            alert('Dự án đã lưu trữ — không thể xóa nhiệm vụ');
            return;
        }
        if (!confirm('Bạn có chắc muốn XÓA vĩnh viễn nhiệm vụ này? Hành động này không thể hoàn tác.')) return;
        if (onDelete) {
            setIsBlocking(true);
            try {
                await run(() => onDelete(task._id), {
                    loadingMessage: 'Đang xóa nhiệm vụ...',
                    successMessage: 'Đã xóa nhiệm vụ thành công!',
                    onSuccess: onRefresh
                });
            } finally {
                setIsBlocking(false);
            }
        }
    };

    const handleAddSubtask = (e) => { e.stopPropagation(); onAddSubtask?.(task._id); };

    const handleAddSubtaskGuarded = (e) => { e.stopPropagation(); if (!projectActive) { alert('Dự án đã lưu trữ — không thể thêm việc con'); return; } onAddSubtask?.(task._id); };

    const toggleStartOnHold = async (e) => {
        e.stopPropagation();
        if (!projectActive) {
            alert('Dự án đã lưu trữ — thao tác này bị vô hiệu');
            return;
        }
        let targetStatus = TASK_STATUS.IN_PROGRESS;
        let loadingMsg = 'Đang bắt đầu công việc...';
        let successMsg = 'Đã bắt đầu công việc!';

        if (task.status === TASK_STATUS.IN_PROGRESS) {
            targetStatus = TASK_STATUS.ON_HOLD;
            loadingMsg = 'Đang tạm dừng...';
            successMsg = 'Đã tạm dừng công việc.';
        } else if (task.status === TASK_STATUS.ON_HOLD) {
            targetStatus = TASK_STATUS.IN_PROGRESS;
            loadingMsg = 'Đang tiếp tục công việc...';
            successMsg = 'Đã tiếp tục công việc!';
        } else {
            return;
        }

        if (onUpdateStatus) {
            setIsBlocking(true);
            try {
                await run(() => onUpdateStatus(task._id, targetStatus), {
                    loadingMessage: loadingMsg,
                    successMessage: successMsg,
                    onSuccess: onRefresh
                });
            } finally {
                setIsBlocking(false);
            }
        }
    };

    // Quick-assign handlers removed; assignment is handled in EditTaskDialog

    const handleMarkDoneClick = async (e) => {
        e.stopPropagation();
        if (!projectActive) {
            alert('Dự án đã lưu trữ — thao tác này bị vô hiệu');
            return;
        }
        if (![TASK_STATUS.IN_PROGRESS, TASK_STATUS.ON_HOLD].includes(task.status)) return;

        if (onUpdateStatus) {
            const canAutoComplete = isProjectManager || isCreator || (isSubtask && isParentOwner);
            setIsBlocking(true);
            try {
                if (canAutoComplete) {
                    await run(() => onUpdateStatus(task._id, TASK_STATUS.COMPLETED), {
                        loadingMessage: 'Đang hoàn thành công việc...',
                        successMessage: 'Đã hoàn thành công việc!',
                        onSuccess: onRefresh
                    });
                } else {
                    await run(() => onUpdateStatus(task._id, TASK_STATUS.COMPLETED_AWAIT_REVIEW), {
                        loadingMessage: 'Đang gửi duyệt hoàn thành...',
                        successMessage: 'Đã gửi duyệt. Vui lòng chờ quản lý!',
                        onSuccess: onRefresh
                    });
                }
            } finally {
                setIsBlocking(false);
            }
        }
    };

    const handleCancelClick = async (e) => {
        e.stopPropagation();
        if (!projectActive) {
            alert('Dự án đã lưu trữ — thao tác này bị vô hiệu');
            return;
        }
        if ([TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED].includes(task.status)) return;
        if (!confirm('Bạn có chắc muốn HỦY nhiệm vụ này?')) return;
        if (onUpdateStatus) {
            setIsBlocking(true);
            try {
                await run(() => onUpdateStatus(task._id, TASK_STATUS.CANCELLED), {
                    loadingMessage: 'Đang hủy nhiệm vụ...',
                    successMessage: 'Đã hủy nhiệm vụ thành công.',
                    onSuccess: onRefresh
                });
            } finally {
                setIsBlocking(false);
            }
        }
    };

    const handleRevertToDraft = async (e) => {
        e.stopPropagation();
        if (!projectActive) {
            alert('Dự án đã lưu trữ — thao tác này bị vô hiệu');
            return;
        }
        if (!confirm('Chắc chắn đưa task về trạng thái NHÁP để sửa/giao lại?')) return;
        if (!onUpdateStatus) return;
        setIsBlocking(true);
        try {
            await run(() => onUpdateStatus(task._id, TASK_STATUS.DRAFT), {
                loadingMessage: 'Đang đặt về nháp...',
                successMessage: 'Task đã được đặt về nháp.',
                onSuccess: onRefresh
            });
        } finally {
            setIsBlocking(false);
        }
    };

    const relevantUsers = useMemo(() => {
        const userMap = new Map();
        const addUser = (userId, role) => {
            if (!userId) return;
            const user = allUsersWithDetails.find(u => u.id === userId);
            if (!user) return;
            if (userMap.has(userId)) {
                if (userMap.get(userId).role !== role) {
                    userMap.get(userId).role = 'Tạo & Thực hiện';
                }
            } else {
                userMap.set(userId, { ...user, role });
            }
        };
        addUser(getUserId(task.createdBy), 'Người tạo');
        addUser(getUserId(task.assignee), 'Người thực hiện');
        return Array.from(userMap.values());
    }, [task.createdBy, task.assignee, allUsersWithDetails]);

    const maxVisibleAvatars = 2;
    const visibleAvatars = Array.isArray(relevantUsers) ? relevantUsers.slice(0, maxVisibleAvatars) : [];
    const hiddenAvatarCount = Array.isArray(relevantUsers) ? Math.max(0, relevantUsers.length - maxVisibleAvatars) : 0;

    const mainActionBtnClass = "py-2 px-4 text-sm rounded-md font-semibold whitespace-nowrap flex-shrink-0";
    const notifyActionBtnClass = "py-1.5 px-3 text-xs rounded-md font-medium whitespace-nowrap flex-shrink-0";

    return (
        <>
            <div
                className={clsx(
                    "border rounded-lg transition-all hover:shadow-md group",
                    "bg-white border-gray-200",
                    isExpanded && "shadow-lg"
                )}
            >
                <div
                    className={clsx(
                        "flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3",
                        !disableNavigation && "cursor-pointer"
                    )}
                >
                    <div
                        className="flex-1 w-full min-w-0 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                        onClick={!disableNavigation ? () => router.push(`/tasks/${task._id}`) : undefined}
                    >
                        <div className="flex items-start w-full sm:w-auto gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 pt-1 sm:pt-0 sm:flex sm:items-center sm:justify-center sm:w-24 lg:w-28">
                                <div className={clsx(
                                    "hidden sm:flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded border whitespace-nowrap",
                                    getStatusChipColor(statusInfo.color)
                                )} title={statusInfo.label}>
                                    <StatusIcon className="h-3.5 w-3.5" />
                                    <span>{statusInfo.label}</span>
                                </div>
                                <div className="sm:hidden" title={statusInfo.label}>
                                    <StatusIcon className={clsx("h-5 w-5", statusInfo.color)} />
                                </div>
                            </div>

                            <div className="flex-grow min-w-0">
                                <div className="mb-1">
                                    {disableNavigation ? (
                                        <Link
                                            href={`/tasks/${task._id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-sm font-medium text-gray-900 hover:text-blue-600 break-words line-clamp-2 sm:line-clamp-1 block"
                                            title={task.title}
                                        >
                                            {task.title}
                                        </Link>
                                    ) : (
                                        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 break-words line-clamp-2 sm:line-clamp-1 block" title={task.title}>
                                            {task.title}
                                        </span>
                                    )}

                                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                        {task.projectName && !task.parentTask && (
                                            <span className="truncate max-w-[150px]">📁 {task.projectName}</span>
                                        )}
                                        {task.parentTask && (
                                            <Link href={`/tasks/${task.parentTask}`} onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:underline flex items-center">
                                                <span className="rotate-90 inline-block mr-1 text-gray-400">↳</span> Task cha
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-1 sm:hidden">
                                    <div className={clsx("text-xs px-1.5 py-0.5 rounded border font-medium", priorityInfo.color)}>{priorityInfo.label}</div>
                                    <div className="flex items-center gap-1 text-xs text-gray-600"><CalendarDays size={12} className="text-gray-400" /> {fmt(task.plannedDueAt)}</div>
                                    <TaskPointsBadge task={task} size="xs" />
                                </div>
                            </div>
                        </div>

                        <div className="hidden sm:flex flex-wrap items-center justify-end gap-2 xl:gap-3 flex-shrink-0 ml-auto">
                            {workTypeInfo && (
                                <div className={clsx("flex items-center gap-1 text-xs px-2 py-1 rounded border font-medium whitespace-nowrap", getWorkTypeColor(workTypeInfo.color))} title={workTypeInfo.name}>
                                    <span>{workTypeInfo.icon}</span>
                                    <span className="hidden xl:inline">{workTypeInfo.name}</span>
                                </div>
                            )}
                            {hasSubtasks && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded text-xs whitespace-nowrap" title={`Tiến độ: ${progress.percentage}%`}>
                                    <BarChart3 className="h-3 w-3 text-blue-600" />
                                    <span className="font-medium text-blue-700">{progress.percentage}%</span>
                                </div>
                            )}
                            <div className={clsx("text-xs px-2 py-1 rounded border font-medium text-center whitespace-nowrap min-w-[60px]", priorityInfo.color)} title={`Ưu tiên: ${priorityInfo.label}`}>{priorityInfo.label}</div>

                            <div className="flex items-center -space-x-2 flex-shrink-0 cursor-pointer hover:opacity-80"
                                onClick={(e) => { e.stopPropagation(); setShowUserPopup(true); }}
                            >
                                {visibleAvatars.map(user => (
                                    <Avatar key={user.id} userId={user.id} name={user.name} src={driveImage(user.avatarUrl)} size="xs" className="border border-white" />
                                ))}
                                {hiddenAvatarCount > 0 && (<div className="w-6 h-6 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[10px] font-medium text-gray-600">+{hiddenAvatarCount}</div>)}
                                {(!Array.isArray(relevantUsers) || relevantUsers.length === 0) && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400"><Users size={16} /></div>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap"><CalendarDays className="h-4 w-4 text-gray-400" /><span>{fmt(task.plannedDueAt)}</span></div>
                            <div className="hidden md:block"><TaskPointsBadge task={task} size="sm" /></div>

                            {hasSubtasks && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={clsx(
                        "w-full sm:w-auto sm:max-w-xs flex-shrink-0 flex items-center justify-between sm:justify-end gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100",
                        isBlocking && 'pointer-events-none opacity-60'
                    )}>
                        {!isCompleted ? (
                            <>
                                {/* Quick assign UI removed: assignment handled in Edit dialog */}

                                <div className="flex items-center justify-end gap-2 w-full flex-wrap">
                            {isWaitingConfirm && (
                                <>
                                    {isSubtask && isParentOwner ? null : (
                                        <>
                                            {isAssignee ? (
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <ActionButton icon={PlayCircle} label="Bắt đầu" onClick={(e) => { e.stopPropagation(); handleConfirmAssignment(true); }} variant="success" className="flex-1 sm:flex-none" />
                                                    <ActionButton icon={X} label="Từ chối" onClick={(e) => { e.stopPropagation(); handleConfirmAssignment(false); }} variant="danger" className="flex-1 sm:flex-none" />
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <div className="flex items-center gap-1 text-xs text-blue-600 whitespace-nowrap"><Clock size={14} /><span>Chờ XN</span></div>
                                                    {(isProjectManager || isCreator || (isSubtask && isParentOwner)) && (<ActionButton icon={Send} label="Nhắc" onClick={handleNotifyAssignee} variant="info" className={notifyActionBtnClass} />)}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            {!isSubtask && isPendingApproval && (
                                <>
                                    {isProjectManager ? (
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <ActionButton icon={Check} label="Duyệt" onClick={(e) => { e.stopPropagation(); handleApproveCreation(true); }} variant="success" className="flex-1 sm:flex-none" />
                                            <ActionButton icon={X} label="Hủy" onClick={(e) => { e.stopPropagation(); handleApproveCreation(false); }} variant="danger" className="flex-1 sm:flex-none" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 ml-auto">
                                            <div className="flex items-center gap-1 text-xs text-amber-600 whitespace-nowrap"><Clock size={14} /><span>Chờ duyệt</span></div>
                                            {(isCreator || isAssignee) && (<ActionButton icon={Send} label="Nhắc" onClick={handleNotifyManagerApproval} variant="warning" className={notifyActionBtnClass} />)}
                                        </div>
                                    )}
                                </>
                            )}

                            {showApprovalButtons && (
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <ActionButton icon={Check} label="Duyệt" onClick={(e) => { e.stopPropagation(); handleApproveCompletion(true); }} variant="success" className="flex-1 sm:flex-none" />
                                    <ActionButton icon={X} label="Lại" onClick={(e) => { e.stopPropagation(); handleApproveCompletion(false); }} variant="danger" className="flex-1 sm:flex-none" />
                                </div>
                            )}

                            {showPendingApproval && (
                                <div className="flex items-center gap-2 ml-auto">
                                    <div className="flex items-center gap-1 text-xs text-yellow-600 whitespace-nowrap"><Clock size={14} /><span>Chờ duyệt HT</span></div>
                                    {(isSubtask ? isSubtaskAssignee : isAssignee) && (<ActionButton icon={Send} label="Nhắc" onClick={handleNotifyManagerCompletion} variant="warning" className={notifyActionBtnClass} />)}
                                </div>
                            )}

                            {isPendingApproval && (isProjectManager || isCreator) && (
                                <div className="flex items-center gap-2">
                                    <ActionButton icon={X} label="Về nháp" onClick={handleRevertToDraft} variant="default" className="text-sm" />
                                    <ActionButton icon={Trash2} label="Xóa" onClick={handleDelete} variant="danger" className="text-sm" />
                                </div>
                            )}
                            {((!isWaitingConfirm && !isPendingApproval && !isPendingCompletionReview) ||
                                (isSubtask && isParentOwner && isWaitingConfirm)) &&
                                !(isSubtask && !task.assignee && canAssignSubtask) && (
                                    <Dropdown>
                                        <Dropdown.Trigger>
                                            <Button variant="ghost" size="sm" className="!p-0 !h-auto" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-50 hover:bg-gray-100 border border-gray-200">
                                                    <MoreVertical size={14} />
                                                    <span className="leading-tight sm:hidden xl:inline">Thao tác</span>
                                                </div>
                                            </Button>
                                        </Dropdown.Trigger>
                                        <Dropdown.Content position="bottom-right" width="w-56" className="z-20">
                                            <div className="p-1">
                                                {!task.parentTask && (isProjectManager || isCreator || isAssignee) && (
                                                    <DropdownItem icon={PlusCircle} label="Tạo việc con" onClick={handleAddSubtask} />
                                                )}
                                                {(isProjectManager || canEditSubtask) && isEditable && (
                                                    <DropdownItem icon={Edit} label="Sửa chi tiết" onClick={handleEdit} />
                                                )}
                                                {(isEditable || !task.parentTask) && <div className="border-t border-gray-200 my-1"></div>}
                                                {canStartOrHold && (isProjectManager || isAssignee) && (
                                                    <DropdownItem icon={task.status === TASK_STATUS.IN_PROGRESS ? PauseCircle : PlayCircle} label={task.status === TASK_STATUS.IN_PROGRESS ? 'Tạm dừng' : 'Tiếp tục'} onClick={toggleStartOnHold} />
                                                )}
                                                {canMarkDone && (isProjectManager || isAssignee) && (
                                                    <DropdownItem icon={CheckCircle2} label="Đánh dấu Hoàn thành" onClick={handleMarkDoneClick} className="text-green-600 hover:!bg-green-50" />
                                                )}
                                                {/* Assignment moved to Edit dialog; use Edit to change assignee */}
                                                <div className="border-t border-gray-200 my-1 pt-1">
                                                    {canCancel && (isProjectManager || canManageSubtask || isCreator) && (
                                                        <DropdownItem icon={XCircle} label="Hủy bỏ" onClick={handleCancelClick} className="text-red-600 hover:!bg-red-50" />
                                                    )}
                                                    {canDelete && (isProjectManager || canManageSubtask || isCreator) && (
                                                        <DropdownItem icon={Trash2} label="Xóa vĩnh viễn" onClick={handleDelete} className="text-red-600 hover:!bg-red-50" />
                                                    )}
                                                </div>
                                            </div>
                                        </Dropdown.Content>
                                    </Dropdown>
                                )}
                        </div>
                            </>
                        ) : (
                            <div className="text-sm text-gray-500 italic">Đã hoàn thành</div>
                        )}
                    </div>
                </div>

                {isExpanded && hasSubtasks && (
                    <div className="border-t border-gray-100 pl-2 sm:pl-4">
                        <SubtaskListSimple
                            parentTaskId={task._id}
                            parentTask={task}
                            initialSubtasks={task.subtasks || []}
                            projectMembers={projectMembers}
                            users={users}
                            allUsersWithDetails={allUsersWithDetails}
                            workTypes={workTypes}
                            platforms={platforms}
                            currentUserId={currentUserId}
                            canManage={canManage}
                            onRefresh={onRefresh}
                            actions={{ onEdit, onDelete, onAssign, onUpdateStatus, onAddSubtask }}
                        />
                    </div>
                )}
            </div>

            <UserInfoPopup isOpen={showUserPopup} onClose={() => setShowUserPopup(false)} users={Array.isArray(relevantUsers) ? relevantUsers : []} />
            <NotifyZaloDialog open={notifyDialogOpen} onClose={() => setNotifyDialogOpen(false)} recipient={notifyRecipient} task={task} context={notifyContext} statusInfo={statusInfo} fmtDate={fmt} />
            <DialogComponent />
        </>
    );
}