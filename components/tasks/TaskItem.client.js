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
import { formatTaskPoints } from '@/lib/points';
import { TASK_STATUS } from '@/model/common/enums';
import UserInfoPopup from './UserInfoPopup.client';
import Avatar from '@/components/ui/avatar';
import { driveImage } from '@/functions';
import { useAsyncNotifier } from '@/hooks/loading.hook.js';
import {
    approveTaskCreation,
    confirmAssignment,
    approveTaskCompletion
} from '@/data/task/actions/approval.server.js';
// Import Dialog Zalo và action
import NotifyZaloDialog from '@/components/zalo/NotifyZaloDialog.client';
import DialogComponent from '@/components/ui/dialog'; // Import DialogComponent


// --- Helper Functions (Giữ nguyên) ---
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

// --- Sub Components (Giữ nguyên) ---
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
                "flex items-center justify-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
                colors[variant] || colors.default,
                className
            )}
        >
            {Icon && <Icon size={14} className="flex-shrink-0" />}
            {label && <span className="leading-tight">{label}</span>}
        </button>
    );
};

// --- Main Component ---
export default function TaskItem({
    task,
    users = [], // Dùng cho dropdown gán việc
    allUsersWithDetails = [], // Dùng để tìm thông tin user đầy đủ (id=externalUserId)
    projectMembers = [],
    workTypes = [],
    platforms = [],
    currentUserId = '', // externalUserId của người đang xem
    canManage = false,
    actions, // { onAssign, onUpdateStatus, onEdit, onDelete, onAddSubtask }
    onRefresh, // Hàm gọi lại để refresh list
    disableNavigation = false, // Nếu true, không cho click toàn bộ item để navigate
    // [THÊM] Props cho subtask
    isSubtask = false, // Đánh dấu đây là subtask
    parentTaskAssignee = null, // externalUserId của người được giao task cha
}) {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showUserPopup, setShowUserPopup] = useState(false);
    const { run } = useAsyncNotifier();

    // --- State cho Dialog Zalo ---
    const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
    const [notifyRecipient, setNotifyRecipient] = useState(null); // { id (externalUserId), name }
    const [notifyContext, setNotifyContext] = useState(''); // 'assignee', 'manager_approval', 'manager_completion'

    const {
        onAssign,
        onUpdateStatus,
        onEdit,
        onDelete,
        onAddSubtask
    } = actions || {}; // Đảm bảo actions không null

    // --- Action Handlers (Sử dụng `run` từ useAsyncNotifier) ---
    const handleConfirmAssignment = async (accept) => {
        let note = '';
        if (!accept) {
            note = prompt('Vui lòng nhập lý do từ chối (không bắt buộc):');
            if (note === null) return; // User cancelled prompt
        }
        await run(
            () => confirmAssignment(task._id, { accept, note }),
            {
                loadingMessage: accept ? 'Đang xác nhận nhận việc...' : 'Đang từ chối nhận việc...',
                successMessage: accept ? 'Đã bắt đầu nhận việc!' : 'Đã từ chối nhận việc.',
                onSuccess: onRefresh
            }
        );
    };

    const handleApproveCreation = async (approve) => {
        let note = '';
        const initialPoints = task.initialPoints || 0;
        if (!approve) {
            note = prompt('Vui lòng nhập lý do từ chối (không bắt buộc):');
            if (note === null) return;
        }
        await run(
            () => approveTaskCreation(task._id, { approve, note, initialPoints }),
            {
                loadingMessage: approve ? 'Đang duyệt task...' : 'Đang từ chối task...',
                successMessage: approve ? 'Task đã được duyệt!' : 'Đã từ chối task.',
                onSuccess: onRefresh
            }
        );
    };

    const handleApproveCompletion = async (approve) => {
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
        await run(
            () => approveTaskCompletion(task._id, { approve, note, finalPoints }),
            {
                loadingMessage: approve ? 'Đang duyệt hoàn thành...' : 'Đang gửi yêu cầu làm lại...',
                successMessage: approve ? 'Task đã hoàn thành!' : 'Đã gửi yêu cầu làm lại.',
                onSuccess: onRefresh
            }
        );
    };

    // --- Handlers Mở Dialog Zalo ---
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

    const handleNotifyAssignee = (e) => openNotifyDialog(e, task.assignee, 'assignee');
    const handleNotifyManagerApproval = (e) => openNotifyDialog(e, task.createdBy, 'manager_approval'); // Giả định người tạo là người duyệt
    const handleNotifyManagerCompletion = (e) => openNotifyDialog(e, task.createdBy, 'manager_completion'); // Giả định người tạo là người duyệt

    // --- Other Action Handlers ---
    const handleEdit = (e) => { e.stopPropagation(); onEdit?.(task._id); };

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (!confirm('Bạn có chắc muốn XÓA vĩnh viễn nhiệm vụ này? Hành động này không thể hoàn tác.')) return;
        if (onDelete) {
            await run(() => onDelete(task._id), {
                loadingMessage: 'Đang xóa nhiệm vụ...',
                successMessage: 'Đã xóa nhiệm vụ thành công!',
                onSuccess: onRefresh
            });
        }
    };

    const handleAddSubtask = (e) => { e.stopPropagation(); onAddSubtask?.(task._id); };

    const toggleStartOnHold = async (e) => {
        e.stopPropagation();
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
            // Chỉ cho phép Start/Hold từ IN_PROGRESS hoặc ON_HOLD
            return;
        }

        if (onUpdateStatus) {
            await run(() => onUpdateStatus(task._id, targetStatus), {
                loadingMessage: loadingMsg,
                successMessage: successMsg,
                onSuccess: onRefresh
            });
        }
    };

    const handleAssigneeChange = async (e) => {
        e.stopPropagation();
        const newAssignee = e.target.value;
        // Chỉ gọi nếu giá trị thực sự thay đổi
        if (newAssignee !== (task.assignee || '')) {
            if (onAssign) {
                await run(() => onAssign(task._id, newAssignee || null), {
                    loadingMessage: 'Đang cập nhật người thực hiện...',
                    successMessage: 'Đã giao việc thành công!',
                    onSuccess: onRefresh
                });
            }
        }
    };

    // [THÊM] Handler giao việc con
    const handleAssignSubtask = async (assigneeId) => {
        if (!isSubtask || !assigneeId) return;
        
        // Kiểm tra xem có phải tự giao cho mình không
        const isSelfAssign = assigneeId === parentTaskAssignee;
        
        await run(
            () => onAssign(task._id, assigneeId),
            {
                loadingMessage: 'Đang giao việc con...',
                successMessage: isSelfAssign 
                    ? 'Đã nhận việc. Bắt đầu làm việc!' 
                    : 'Đã giao việc. Chờ người thực hiện xác nhận!',
                onSuccess: onRefresh
            }
        );
    };

    const handleMarkDoneClick = async (e) => {
        e.stopPropagation();
        // Chỉ cho phép từ IN_PROGRESS hoặc ON_HOLD
        if (![TASK_STATUS.IN_PROGRESS, TASK_STATUS.ON_HOLD].includes(task.status)) return;
        
        if (onUpdateStatus) {
            // [SỬA] Nếu là subtask và người làm là parent owner → Tự động hoàn thành
            if (isSubtask && isParentOwner) {
                // Tự động hoàn thành, không cần duyệt
                await run(() => onUpdateStatus(task._id, TASK_STATUS.COMPLETED), {
                    loadingMessage: 'Đang hoàn thành công việc...',
                    successMessage: 'Đã hoàn thành công việc!',
                    onSuccess: onRefresh
                });
            } else {
                // Người khác cần gửi duyệt
                await run(() => onUpdateStatus(task._id, TASK_STATUS.COMPLETED_AWAIT_REVIEW), {
                    loadingMessage: 'Đang gửi duyệt hoàn thành...',
                    successMessage: 'Đã gửi duyệt. Vui lòng chờ quản lý!',
                    onSuccess: onRefresh
                });
            }
        }
    };

    const handleCancelClick = async (e) => {
        e.stopPropagation();
        // Chỉ cho phép hủy khi chưa hoàn thành hoặc bị từ chối/hủy
        if ([TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED].includes(task.status)) return;
        if (!confirm('Bạn có chắc muốn HỦY nhiệm vụ này?')) return;
        if (onUpdateStatus) {
            await run(() => onUpdateStatus(task._id, TASK_STATUS.CANCELLED), {
                loadingMessage: 'Đang hủy nhiệm vụ...',
                successMessage: 'Đã hủy nhiệm vụ thành công.',
                onSuccess: onRefresh
            });
        }
    };

    // --- Calculated values ---
    const statusInfo = getStatusInfo(task.status);
    const priorityInfo = getPriorityInfo(task.priority);
    const StatusIcon = statusInfo.icon;
    const progress = task.progress || { total: 0, completed: 0, percentage: 0 };
    const hasSubtasks = !task.parentTask && progress.total > 0;
    const workTypeInfo = task.workType ? getWorkTypeByCode(task.workType) : null;
    const isAssignee = task.assignee === currentUserId;
    const isCreator = task.createdBy === currentUserId;
    const isProjectManager = canManage;
    const isWaitingConfirm = task.status === TASK_STATUS.WAITING_ASSIGNEE_CONFIRM;
    const isPendingApproval = task.status === TASK_STATUS.PENDING_APPROVAL;
    const isPendingCompletionReview = task.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW;
    const isEditable = [TASK_STATUS.DRAFT, TASK_STATUS.PENDING_APPROVAL, TASK_STATUS.WAITING_ASSIGNEE_CONFIRM, TASK_STATUS.REJECTED].includes(task.status);
    const canStartOrHold = [TASK_STATUS.IN_PROGRESS, TASK_STATUS.ON_HOLD].includes(task.status);
    const canMarkDone = [TASK_STATUS.IN_PROGRESS, TASK_STATUS.ON_HOLD].includes(task.status);
    const canCancel = ![TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED].includes(task.status);
    const canDelete = [TASK_STATUS.DRAFT, TASK_STATUS.REJECTED, TASK_STATUS.CANCELLED].includes(task.status); // Chỉ cho xóa khi ở trạng thái nháp, bị từ chối hoặc đã hủy

    // [THÊM] Subtask-specific permissions
    const isParentOwner = isSubtask && parentTaskAssignee === currentUserId;
    const canManageSubtask = isSubtask ? (isProjectManager || isParentOwner) : canManage;
    const canAssignSubtask = canManageSubtask;
    const canEditSubtask = canManageSubtask;
    const canApproveSubtask = canManageSubtask;
    const isSubtaskAssignee = isSubtask && isAssignee;

    // --- Adjusted Permissions for Subtask Approval ---
    const canApproveOrReject = isSubtask && task.createdBy === currentUserId; // Only creator of the task can approve/reject
    const showApprovalButtons = canApproveOrReject && isPendingCompletionReview;
    const showPendingApproval = isSubtaskAssignee && isPendingCompletionReview && !canApproveOrReject; // Subtask assignee sees pending status and reminder button

    // Memoize relevant users to avoid recalculation
    const relevantUsers = useMemo(() => {
        const userMap = new Map();
        // Helper to add user to map
        const addUser = (userId, role) => {
            if (!userId) return;
            const user = allUsersWithDetails.find(u => u.id === userId);
            if (!user) return;
            if (userMap.has(userId)) {
                // If user is both creator and assignee
                if (userMap.get(userId).role !== role) {
                    userMap.get(userId).role = 'Tạo & Thực hiện';
                }
            } else {
                userMap.set(userId, { ...user, role });
            }
        };

        addUser(task.createdBy, 'Người tạo');
        addUser(task.assignee, 'Người thực hiện');

        return Array.from(userMap.values());
    }, [task.createdBy, task.assignee, allUsersWithDetails]);

    // Avatar calculation with safeguard
    const maxVisibleAvatars = 2;
    const visibleAvatars = Array.isArray(relevantUsers) ? relevantUsers.slice(0, maxVisibleAvatars) : [];
    // Ensure hiddenAvatarCount is never negative, fixing the potential RangeError source
    const hiddenAvatarCount = Array.isArray(relevantUsers) ? Math.max(0, relevantUsers.length - maxVisibleAvatars) : 0;


    const mainActionBtnClass = "py-2 px-4 text-sm rounded-md font-semibold";
    const notifyActionBtnClass = "py-1.5 px-3 text-xs rounded-md font-medium";

    // --- Render ---
    return (
        <>
            <div
                className={clsx(
                    "border rounded-lg transition-all hover:shadow-md group",
                    "bg-white border-gray-200",
                    isExpanded && "shadow-lg" // Optional: highlight expanded item
                )}
            >
                <div 
                    className={clsx(
                        "flex items-stretch gap-3 p-3",
                        !disableNavigation && "cursor-pointer"
                    )} 
                    
                >
                    {/* Left side: Status, Title, Project/Parent */}
                    <div className="flex flex-grow items-center gap-3 min-w-0" onClick={!disableNavigation ? () => router.push(`/tasks/${task._id}`) : undefined}>
                        {/* Status Icon/Chip */}
                        <div className="flex-shrink-0 w-6 lg:w-28 flex items-center justify-center">
                            {/* Desktop Status Chip */}
                            <div className={clsx(
                                "hidden lg:flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded border whitespace-nowrap",
                                getStatusChipColor(statusInfo.color)
                            )} title={statusInfo.label}>
                                <StatusIcon className="h-3.5 w-3.5" />
                                <span>{statusInfo.label}</span>
                            </div>
                            {/* Mobile Status Icon */}
                            <div className="flex-shrink-0 w-6 flex items-center justify-center lg:hidden" title={statusInfo.label}>
                                <StatusIcon className={clsx("h-5 w-5", statusInfo.color)} />
                            </div>
                        </div>

                        {/* Title and Project/Parent Link */}
                        <div className="flex-grow min-w-0 py-1 self-center mr-2">
                            {disableNavigation ? (
                                <Link 
                                    href={`/tasks/${task._id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-1 block"
                                    title={task.title}
                                >
                                    {task.title}
                                </Link>
                            ) : (
                                <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 line-clamp-1 block" title={task.title}>
                                    {task.title}
                                </span>
                            )}
                            {task.projectName && !task.parentTask ? (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">📁 {task.projectName}</p>
                            ) : task.parentTask ? (
                                <Link href={`/tasks/${task.parentTask}`} onClick={(e) => e.stopPropagation()} className="text-xs text-blue-500 hover:underline mt-0.5 truncate block" title="Xem task cha">
                                    <span className="rotate-90 inline-block mr-1 text-gray-400">↳</span> Task cha
                                </Link>
                            ) : null}
                        </div>

                        {/* Right side details: Type, Progress, Priority, Users, DueDate, Points */}
                        <div className="flex-shrink-0 flex items-center gap-3">
                            {workTypeInfo && (<div className={clsx("hidden md:flex items-center gap-1 text-xs px-2 py-1 rounded border font-medium whitespace-nowrap", getWorkTypeColor(workTypeInfo.color))} title={workTypeInfo.name}><span>{workTypeInfo.icon}</span><span className="hidden lg:inline">{workTypeInfo.name}</span></div>)}
                            {hasSubtasks && (<div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded text-xs whitespace-nowrap" title={`Tiến độ: ${progress.percentage}%`}><BarChart3 className="h-3 w-3 text-blue-600" /><span className="font-medium text-blue-700">{progress.percentage}%</span><span className="text-gray-500 hidden xl:inline">({progress.completed}/{progress.total})</span></div>)}
                            <div className={clsx("hidden sm:block text-xs px-2 py-1 rounded border font-medium text-center whitespace-nowrap min-w-[70px]", priorityInfo.color)} title={`Ưu tiên: ${priorityInfo.label}`}>{priorityInfo.label}</div>
                            {/* Avatars */}
                            <div className="hidden md:flex items-center -space-x-2 flex-shrink-0 cursor-pointer hover:opacity-80"
                                onClick={(e) => { e.stopPropagation(); setShowUserPopup(true); }}
                                title={Array.isArray(relevantUsers) ? relevantUsers.map(u => u.name).join(', ') : ''}
                            >
                                {visibleAvatars.map(user => (
                                    <Avatar
                                        key={user.id} userId={user.id} name={user.name}
                                        src={driveImage(user.avatarUrl)} size="xs" className="border border-white"
                                    />
                                ))}
                                {hiddenAvatarCount > 0 && (<div className="w-6 h-6 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[10px] font-medium text-gray-600">+{hiddenAvatarCount}</div>)}
                                {/* Show placeholder if no users */}
                                {(!Array.isArray(relevantUsers) || relevantUsers.length === 0) && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400" title="Chưa có người liên quan"><Users size={16} /></div>
                                )}
                            </div>
                            <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap" title={`Hạn: ${fmt(task.plannedDueAt)}`}><CalendarDays className="h-4 w-4 text-gray-400" /><span>{fmt(task.plannedDueAt)}</span></div>
                            <div className="hidden sm:block text-xs font-semibold text-gray-700 px-2 py-1 bg-gray-50 rounded border border-gray-200">{formatTaskPoints(task)}</div>
                            {/* Toggle Subtasks Button */}
                            {hasSubtasks && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                    title={isExpanded ? "Thu gọn việc con" : "Xem việc con"}
                                >
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons Area */}
                    <div className="flex-shrink-0 w-80 flex items-center justify-end gap-2">
                        {/* [THÊM] Subtask: Chưa giao việc */}
                        {isSubtask && !task.assignee && canAssignSubtask && (
                            <div className="flex items-center justify-end gap-2 w-full">
                                <div className="text-xs text-gray-500 italic">Chưa giao việc</div>
                                <div className="flex-1 max-w-[200px]">
                                    <select
                                        value=""
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            const newAssignee = e.target.value;
                                            if (newAssignee) {
                                                handleAssignSubtask(newAssignee);
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs border border-blue-300 bg-blue-50 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full text-blue-700 font-medium cursor-pointer"
                                    >
                                        <option value="">-- Chọn người thực hiện --</option>
                                        {projectMembers.map(member => {
                                            const userInfo = users.find(u => u.value === member.userId);
                                            return userInfo ? (
                                                <option key={userInfo.value} value={userInfo.value}>
                                                    {userInfo.label}
                                                </option>
                                            ) : null;
                                        })}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Conditional Action Buttons based on status and user role */}
                        {/* Chờ xác nhận nhận việc */}
                        {isWaitingConfirm && (
                            <>
                                {/* TASK CON: Parent owner tự giao → bỏ qua xác nhận, không hiển thị gì */}
                                {isSubtask && isParentOwner ? null : (
                                    <>
                                        {/* TASK CHA + TASK CON (người khác): Hiển thị nút xác nhận cho assignee */}
                                        {isAssignee ? (
                                            <>
                                                <ActionButton icon={PlayCircle} label="Bắt đầu" onClick={(e) => { e.stopPropagation(); handleConfirmAssignment(true); }} variant="success" tooltip="Chấp nhận và bắt đầu làm việc" className={mainActionBtnClass} />
                                                <ActionButton icon={X} label="Từ chối" onClick={(e) => { e.stopPropagation(); handleConfirmAssignment(false); }} variant="danger" tooltip="Từ chối nhận việc" className={mainActionBtnClass} />
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-end gap-2 w-full">
                                                <div className="flex items-center gap-1 text-xs text-blue-600" title="Chờ xác nhận"><Clock size={14} /><span className="hidden xl:inline">Chờ xác nhận</span></div>
                                                {(isCreator || isProjectManager || (isSubtask && isParentOwner)) && (<ActionButton icon={Send} label="Nhắc" onClick={handleNotifyAssignee} variant="info" tooltip="Nhắc nhở người thực hiện" className={notifyActionBtnClass} />)}
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                        {/* [SỬA] Chỉ task chính mới cần duyệt tạo */}
                        {!isSubtask && isPendingApproval && (
                            <>
                                {isProjectManager ? (
                                    <>
                                        <ActionButton icon={Check} label="Duyệt" onClick={(e) => { e.stopPropagation(); handleApproveCreation(true); }} variant="success" tooltip="Duyệt tạo task" className={mainActionBtnClass} />
                                        <ActionButton icon={X} label="Từ chối" onClick={(e) => { e.stopPropagation(); handleApproveCreation(false); }} variant="danger" tooltip="Từ chối tạo task" className={mainActionBtnClass} />
                                    </>
                                ) : (
                                    <div className="flex items-center justify-end gap-2 w-full">
                                        <div className="flex items-center gap-1 text-xs text-amber-600" title="Chờ quản lý duyệt"><Clock size={14} /><span className="hidden xl:inline">Chờ duyệt tạo</span></div>
                                        {(isCreator || isAssignee) && (<ActionButton icon={Send} label="Nhắc" onClick={handleNotifyManagerApproval} variant="warning" tooltip="Nhắc quản lý duyệt" className={notifyActionBtnClass} />)}
                                    </div>
                                )}
                            </>
                        )}
                        {/* Duyệt hoàn thành */}
                        {showApprovalButtons && (
                            <>
                                <ActionButton icon={Check} label="Duyệt HT" onClick={(e) => { e.stopPropagation(); handleApproveCompletion(true); }} variant="success" tooltip="Duyệt hoàn thành" className={mainActionBtnClass} />
                                <ActionButton icon={X} label="Làm lại" onClick={(e) => { e.stopPropagation(); handleApproveCompletion(false); }} variant="danger" tooltip="Yêu cầu làm lại" className={mainActionBtnClass} />
                            </>
                        )}
                        {/* Chỉ hiển thị trạng thái chờ duyệt cho subtask assignee */}
                        {showPendingApproval && (
                            <div className="flex items-center justify-end gap-2 w-full">
                                <div className="flex items-center gap-1 text-xs text-yellow-600" title="Chờ duyệt hoàn thành"><Clock size={14} /><span className="hidden xl:inline">Chờ duyệt HT</span></div>
                                {/* Assignee có thể nhắc */}
                                {(isSubtask ? isSubtaskAssignee : isAssignee) && (<ActionButton icon={Send} label="Nhắc" onClick={handleNotifyManagerCompletion} variant="warning" tooltip="Nhắc nhở người duyệt" className={notifyActionBtnClass} />)}
                            </div>
                        )}

                        {/* General Actions Dropdown */}
                        {/* Hiển thị dropdown khi:
                            1. TASK CHA: Không ở trạng thái đặc biệt (waiting confirm, pending approval, pending completion)
                            2. TASK CON: 
                               - Không ở trạng thái đặc biệt HOẶC
                               - Parent owner tự giao (đang waiting confirm nhưng cần dropdown để làm việc)
                               - Không phải trạng thái chưa giao việc
                        */}
                        {((!isWaitingConfirm && !isPendingApproval && !isPendingCompletionReview) || 
                          (isSubtask && isParentOwner && isWaitingConfirm)) && 
                         !(isSubtask && !task.assignee && canAssignSubtask) && (
                            <Dropdown>
                                <Dropdown.Trigger>
                                    {/* Stop propagation to prevent row click */}
                                    <Button variant="ghost" size="sm" className="!p-0 !h-auto opacity-80 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap text-gray-600 hover:bg-gray-100 border border-gray-200 hover:border-gray-300" title="Thao tác thêm">
                                            <MoreVertical size={14} className="flex-shrink-0" />
                                            <span className="leading-tight hidden sm:inline">Thao tác</span>
                                        </div>
                                    </Button>
                                </Dropdown.Trigger>
                                <Dropdown.Content position="bottom-right" width="w-56" className="z-10">
                                    <div className="p-1">
                                        {/* Chỉ task cha mới có tạo việc con */}
                                        {!task.parentTask && <DropdownItem icon={PlusCircle} label="Tạo việc con" onClick={handleAddSubtask} />}
                                        
                                        {/* Sửa chi tiết: TASK CHA (editable) | TASK CON (PM hoặc parent owner) */}
                                        {isSubtask ? (
                                            canEditSubtask && isEditable && <DropdownItem icon={Edit} label="Sửa chi tiết" onClick={handleEdit} />
                                        ) : (
                                            isEditable && <DropdownItem icon={Edit} label="Sửa chi tiết" onClick={handleEdit} />
                                        )}
                                        
                                        {(isEditable || !task.parentTask) && <div className="border-t border-gray-200 my-1"></div>}

                                        {/* Start/Hold: TASK CHA (assignee) | TASK CON (chỉ assignee) */}
                                        {canStartOrHold && (isSubtask ? isSubtaskAssignee : isAssignee) && (
                                            <DropdownItem icon={task.status === TASK_STATUS.IN_PROGRESS ? PauseCircle : PlayCircle} label={task.status === TASK_STATUS.IN_PROGRESS ? 'Tạm dừng' : 'Tiếp tục'} onClick={toggleStartOnHold} />
                                        )}
                                        
                                        {/* Đánh dấu hoàn thành: TASK CHA (assignee) | TASK CON (chỉ assignee) */}
                                        {canMarkDone && (isSubtask ? isSubtaskAssignee : isAssignee) && (
                                            <DropdownItem icon={CheckCircle2} label="Đánh dấu Hoàn thành" onClick={handleMarkDoneClick} className="text-green-600 hover:!bg-green-50" />
                                        )}
                                        
                                        {/* Assignee Select - Chỉ cho task cha */}
                                        {!isSubtask && (isProjectManager || isCreator) && (
                                            <div className="p-2 border-t border-gray-200 mt-1">
                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Giao cho</label>
                                                <select
                                                    value={task.assignee || ''}
                                                    onChange={handleAssigneeChange}
                                                    onClick={(e) => e.stopPropagation()} // Prevent dropdown close
                                                    className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full bg-white"
                                                >
                                                    <option value="">Chưa giao</option>
                                                    {projectMembers.map(member => {
                                                        const userInfo = users.find(u => u.value === member.userId);
                                                        // Ensure userInfo exists before rendering option
                                                        return userInfo ? (<option key={userInfo.value} value={userInfo.value}>{userInfo.label}</option>) : null;
                                                    })}
                                                </select>
                                            </div>
                                        )}
                                        {/* Cancel / Delete Actions */}
                                        {/* TASK CHA: PM hoặc creator | TASK CON: PM hoặc parent owner */}
                                        <div className="border-t border-gray-200 my-1 pt-1">
                                            {canCancel && (isSubtask ? canManageSubtask : (isProjectManager || isCreator)) && (
                                                <DropdownItem icon={XCircle} label="Hủy bỏ" onClick={handleCancelClick} className="text-red-600 hover:!bg-red-50" />
                                            )}
                                            {canDelete && (isSubtask ? canManageSubtask : (isProjectManager || isCreator)) && (
                                                <DropdownItem icon={Trash2} label="Xóa vĩnh viễn" onClick={handleDelete} className="text-red-600 hover:!bg-red-50" />
                                            )}
                                        </div>
                                    </div>
                                </Dropdown.Content>
                            </Dropdown>
                        )}
                    </div>
                </div>

                {/* Subtasks List (Conditional Render) */}
                {isExpanded && hasSubtasks && (
                    <div className="border-t border-gray-100">
                        <SubtaskListSimple
                            parentTaskId={task._id}
                            parentTask={task} // Pass parent task if needed by sublist
                            initialSubtasks={task.subtasks || []} // Pass initial subtasks
                            projectMembers={projectMembers}
                            users={users}
                            allUsersWithDetails={allUsersWithDetails}
                            workTypes={workTypes}
                            platforms={platforms}
                            currentUserId={currentUserId}
                            canManage={canManage}
                            onRefresh={onRefresh} // Allow sublist to trigger refresh
                            // Pass necessary actions down if sublist needs them
                            actions={{ onEdit, onDelete, onAssign, onUpdateStatus, onAddSubtask }}
                        />
                    </div>
                )}
            </div>

            {/* User Info Popup */}
            <UserInfoPopup
                isOpen={showUserPopup}
                onClose={() => setShowUserPopup(false)}
                users={Array.isArray(relevantUsers) ? relevantUsers : []} // Ensure users is an array
            />

            {/* Zalo Notification Dialog */}
            <NotifyZaloDialog
                open={notifyDialogOpen}
                onClose={() => setNotifyDialogOpen(false)}
                recipient={notifyRecipient}
                task={task}
                context={notifyContext}
                statusInfo={statusInfo} // Pass status info for default message
                fmtDate={fmt} // Pass date formatter
            />

            {/* --- Adjusted Approval Button Logic --- */}
            <DialogComponent />
        </>
    );
}

