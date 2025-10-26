// components/tasks/detail/TaskHeader.client.js
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    CheckCircle2, Circle, CircleDashed, Clock, UserCheck, ShieldCheck, Send, Check, X,
    PauseCircle, PlayCircle, XCircle, CalendarDays, BarChart3, CornerUpLeft, MessageSquare, Paperclip,
    Edit, CheckCheck, Undo2, GitMerge, ListTree, FolderClock, Play, Flag,
    MoreVertical,
    Trash2
} from 'lucide-react';
import clsx from 'clsx';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { vi } from 'date-fns/locale';

// Hooks và Actions
import { useAsyncNotifier } from '@/hooks/loading.hook.js';
import {
    approveTaskCreation, confirmAssignment, approveTaskCompletion,
    updateTaskStatus, deleteTask
} from '@/data/task/actions';

// Components UI
import Button from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import Dropdown from '@/components/ui/dropdown';

// Dialogs
import EditTaskDialog from '@/components/tasks/EditTaskDialog.client';
import NotifyZaloDialog from '@/components/zalo/NotifyZaloDialog.client';

// Enums and Helpers
import { TASK_STATUS } from '@/model/common/enums';

// --- Helpers (Giữ nguyên) ---
const fmt = (d, includeTime = false) => {
    if (!d) return '—';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return '—';
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        if (includeTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
        return new Intl.DateTimeFormat('vi-VN', options).format(date);
    } catch (e) { console.error("Error formatting date:", d, e); return '—'; }
};

const formatRelativeTime = (dateString) => {
    if (!dateString) return null;
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        return formatDistanceToNowStrict(date, { addSuffix: true, locale: vi });
    } catch (e) { console.error("Error formatting relative time:", dateString, e); return null; }
};

const getStatusInfo = (status) => {
    // (Giữ nguyên logic)
    switch (status) {
        case TASK_STATUS.DRAFT: return { icon: CircleDashed, color: 'text-gray-400', label: 'Nháp' };
        case TASK_STATUS.PENDING_APPROVAL: return { icon: ShieldCheck, color: 'text-amber-600', label: 'Chờ duyệt tạo' };
        case TASK_STATUS.WAITING_ASSIGNEE_CONFIRM: return { icon: UserCheck, color: 'text-blue-500', label: 'Chờ xác nhận' };
        case TASK_STATUS.IN_PROGRESS: return { icon: PlayCircle, color: 'text-blue-600', label: 'Đang làm' };
        case TASK_STATUS.ON_HOLD: return { icon: PauseCircle, color: 'text-gray-500', label: 'Tạm dừng' };
        case TASK_STATUS.COMPLETED_AWAIT_REVIEW: return { icon: CheckCircle2, color: 'text-yellow-600', label: 'Chờ duyệt HT' };
        case TASK_STATUS.COMPLETED: return { icon: CheckCircle2, color: 'text-green-600', label: 'Hoàn thành' };
        case TASK_STATUS.REJECTED: return { icon: XCircle, color: 'text-red-600', label: 'Từ chối' };
        case TASK_STATUS.CANCELLED: return { icon: XCircle, color: 'text-gray-400', label: 'Đã hủy' };
        default: return { icon: Circle, color: 'text-gray-400', label: status || 'Không rõ' };
    }
};

const getPriorityInfo = (priority) => {
    // (Giữ nguyên logic)
    switch (priority) {
        case 'urgent': return { color: 'text-red-600', label: '🔥 Khẩn' };
        case 'high': return { color: 'text-orange-600', label: 'Cao' };
        case 'medium': return { color: 'text-gray-600', label: 'TB' };
        case 'low': return { color: 'text-gray-400', label: 'Thấp' };
        default: return { color: 'text-gray-400', label: '-' };
    }
};

// --- Component DropdownItem (Giữ nguyên) ---
const DropdownItem = ({ icon: Icon, label, onClick, className = '' }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(e); }}
        className={clsx(
            "flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded",
            className
        )}
    >
        {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
        <span className="truncate">{label}</span>
    </button>
);

// --- Component ActionButton (Giữ nguyên) ---
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

// --- Hằng số Class (Giữ nguyên) ---
const mainActionBtnClass = "py-2 px-4 text-sm rounded-md font-semibold";
const notifyActionBtnClass = "py-1.5 px-3 text-xs rounded-md font-medium";


export default function TaskHeader({
    task,
    parentTask,
    projectName,
    canManage,      // = isProjectManager
    canEditTask,
    isAssignee,
    isCreator,
    currentUser,
    users, // Dùng cho dialog
    allUsersWithDetails, // Dùng để tra cứu user
    projectMembers, // Dùng cho dialog
    workTypes, // Dùng cho dialog
    platforms, // Dùng cho dialog
    subtasksCount = 0
}) {
    const router = useRouter();
    const { run } = useAsyncNotifier();

    // State (Giữ nguyên)
    const [showEditTask, setShowEditTask] = useState(false);
    const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
    const [notifyRecipient, setNotifyRecipient] = useState(null);
    const [notifyContext, setNotifyContext] = useState('');

    // Permissions & Info (Giữ nguyên)
    const statusInfo = useMemo(() => getStatusInfo(task.status), [task.status]);
    const priorityInfo = useMemo(() => getPriorityInfo(task.priority), [task.priority]);

    // Biến tính toán logic (Giữ nguyên)
    const isProjectManager = canManage;
    const isWaitingConfirm = task.status === TASK_STATUS.WAITING_ASSIGNEE_CONFIRM;
    const isPendingApproval = task.status === TASK_STATUS.PENDING_APPROVAL;
    const isPendingCompletionReview = task.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW;
    const canStartOrHold = [TASK_STATUS.IN_PROGRESS, TASK_STATUS.ON_HOLD].includes(task.status);
    const canMarkDone = [TASK_STATUS.IN_PROGRESS, TASK_STATUS.ON_HOLD].includes(task.status);
    const canCancel = ![TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED].includes(task.status);
    const canDelete = [TASK_STATUS.DRAFT, TASK_STATUS.REJECTED, TASK_STATUS.CANCELLED].includes(task.status);

    // --- Action Handlers (Giữ nguyên) ---
    const handleConfirmAssignment = async (accept) => {
        let note = '';
        if (!accept) { note = prompt('Vui lòng nhập lý do từ chối (không bắt buộc):'); if (note === null) return; }
        await run(() => confirmAssignment(task._id, { accept, note }), {
            loadingMessage: accept ? 'Đang xác nhận...' : 'Đang từ chối...',
            successMessage: accept ? 'Đã bắt đầu nhận việc!' : 'Đã từ chối nhận việc.', onSuccess: router.refresh
        });
    };
    const handleApproveCreation = async (approve) => {
        let note = '';
        if (!approve) { note = prompt('Vui lòng nhập lý do từ chối (không bắt buộc):'); if (note === null) return; }
        await run(() => approveTaskCreation(task._id, { approve, note, initialPoints: task.initialPoints || 0 }), {
            loadingMessage: approve ? 'Đang duyệt task...' : 'Đang từ chối task...',
            successMessage: approve ? 'Task đã được duyệt!' : 'Đã từ chối task.', onSuccess: router.refresh
        });
    };
    const handleApproveCompletion = async (approve) => {
        let note = ''; let finalPoints = task.initialPoints || 0;
        if (approve) {
            const pointsInput = prompt('Duyệt hoàn thành. Nhập điểm cuối cùng:', finalPoints); if (pointsInput === null) return;
            finalPoints = Number(pointsInput) || 0; note = prompt('Nhập ghi chú (không bắt buộc):'); if (note === null) return;
        } else {
            note = prompt('Vui lòng nhập lý do yêu cầu làm lại:');
            if (note === null || note.trim() === "") {
                alert('Vui lòng nhập lý do.');
                return;
            }
        }
        await run(() => approveTaskCompletion(task._id, { approve, note, finalPoints }), {
            loadingMessage: approve ? 'Đang duyệt hoàn thành...' : 'Đang gửi yêu cầu làm lại...',
            successMessage: approve ? 'Task đã hoàn thành!' : 'Đã gửi yêu cầu làm lại.', onSuccess: router.refresh
        });
    };
    const handleDelete = () => {
        if (!confirm('Bạn có chắc muốn XÓA vĩnh viễn nhiệm vụ này? Hành động này không thể hoàn tác.')) return;
        run(async () => { const result = await deleteTask(task._id); if (!result.ok) throw new Error(result.message); return result; }, {
            loadingMessage: 'Đang xóa nhiệm vụ...', successMessage: 'Đã xóa nhiệm vụ!',
            onSuccess: () => router.push(task.project ? `/projects/${task.project}` : '/tasks')
        });
    };
    const toggleStartOnHold = async (e) => {
        e?.stopPropagation();
        let targetStatus = TASK_STATUS.IN_PROGRESS;
        let loadingMsg = 'Đang tiếp tục công việc...';
        let successMsg = 'Đã tiếp tục công việc!';

        if (task.status === TASK_STATUS.IN_PROGRESS) {
            targetStatus = TASK_STATUS.ON_HOLD;
            loadingMsg = 'Đang tạm dừng...';
            successMsg = 'Đã tạm dừng công việc.';
        }
        await run(() => updateTaskStatus(task._id, targetStatus), {
            loadingMessage: loadingMsg,
            successMessage: successMsg,
            onSuccess: router.refresh
        });
    };
    const handleMarkDoneClick = async (e) => {
        e?.stopPropagation();
        await run(() => updateTaskStatus(task._id, TASK_STATUS.COMPLETED_AWAIT_REVIEW), {
            loadingMessage: 'Đang gửi duyệt hoàn thành...',
            successMessage: 'Đã gửi duyệt. Vui lòng chờ quản lý!',
            onSuccess: router.refresh
        });
    };
    const handleCancelClick = async (e) => {
        e?.stopPropagation();
        if (!confirm('Bạn có chắc muốn HỦY nhiệm vụ này?')) return;
        await run(() => updateTaskStatus(task._id, TASK_STATUS.CANCELLED), {
            loadingMessage: 'Đang hủy nhiệm vụ...',
            successMessage: 'Đã hủy nhiệm vụ thành công.',
            onSuccess: router.refresh
        });
    };
    // --- Zalo Handlers (Giữ nguyên) ---
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
    const handleNotifyManagerApproval = (e) => openNotifyDialog(e, task.createdBy, 'manager_approval');
    const handleNotifyManagerCompletion = (e) => openNotifyDialog(e, task.createdBy, 'manager_completion');


    return (
        <>
            <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-4 pb-4 border-b border-gray-200 bg-white space-y-3">

                {/* HÀNG 1: Tiêu đề và Nút hành động chính (Giữ nguyên) */}
                <div className="flex items-center justify-between gap-4">
                    {/* Bên trái: Tiêu đề và nút Sửa */}
                    <div className="flex items-center gap-2 min-w-0">
                        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate" title={task.title}>
                            {task.title}
                        </h1>
                        {canEditTask && (
                            <Button
                                variant="ghost"
                                size="sm"
                                icon={Edit}
                                onClick={() => setShowEditTask(true)}
                                className="!p-1.5 text-gray-500 hover:text-blue-600 flex-shrink-0"
                                title="Sửa chi tiết"
                            />
                        )}
                    </div>

                    {/* Bên phải: Các nút hành động (Giữ nguyên) */}
                    <div className="flex items-center justify-end gap-2 flex-shrink-0">
                        {isWaitingConfirm && (
                            <>
                                {isAssignee ? (
                                    <>
                                        <ActionButton icon={PlayCircle} label="Bắt đầu" onClick={(e) => { e.stopPropagation(); handleConfirmAssignment(true); }} variant="success" tooltip="Chấp nhận và bắt đầu làm việc" className={mainActionBtnClass} />
                                        <ActionButton icon={X} label="Từ chối" onClick={(e) => { e.stopPropagation(); handleConfirmAssignment(false); }} variant="danger" tooltip="Từ chối nhận việc" className={mainActionBtnClass} />
                                    </>
                                ) : (
                                    <div className="flex items-center justify-end gap-2 w-full">
                                        <div className="flex items-center gap-1 text-xs text-blue-600" title="Chờ xác nhận"><Clock size={14} /><span className="hidden xl:inline">Chờ xác nhận</span></div>
                                        {(isCreator || isProjectManager) && (<ActionButton icon={Send} label="Nhắc" onClick={handleNotifyAssignee} variant="info" tooltip="Nhắc nhở người thực hiện" className={notifyActionBtnClass} />)}
                                    </div>
                                )}
                            </>
                        )}
                        {isPendingApproval && (
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
                        {isPendingCompletionReview && (
                            <>
                                {isProjectManager ? (
                                    <>
                                        <ActionButton icon={Check} label="Duyệt HT" onClick={(e) => { e.stopPropagation(); handleApproveCompletion(true); }} variant="success" tooltip="Duyệt hoàn thành" className={mainActionBtnClass} />
                                        <ActionButton icon={X} label="Làm lại" onClick={(e) => { e.stopPropagation(); handleApproveCompletion(false); }} variant="danger" tooltip="Yêu cầu làm lại" className={mainActionBtnClass} />
                                    </>
                                ) : (
                                    <div className="flex items-center justify-end gap-2 w-full">
                                        <div className="flex items-center gap-1 text-xs text-yellow-600" title="Chờ duyệt hoàn thành"><Clock size={14} /><span className="hidden xl:inline">Chờ duyệt HT</span></div>
                                        {isAssignee && (<ActionButton icon={Send} label="Nhắc" onClick={handleNotifyManagerCompletion} variant="warning" tooltip="Nhắc nhở người duyệt" className={notifyActionBtnClass} />)}
                                    </div>
                                )}
                            </>
                        )}
                        {!isWaitingConfirm && !isPendingApproval && !isPendingCompletionReview && (
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()} icon={MoreVertical} className="!px-2 sm:!px-3">
                                        <span className="hidden sm:inline ml-1.5">Thao tác</span>
                                    </Button>
                                </Dropdown.Trigger>
                                <Dropdown.Content position="bottom-right" width="w-56" className="z-10">
                                    <div className="p-1">
                                        {canStartOrHold && isAssignee && (
                                            <DropdownItem icon={task.status === TASK_STATUS.IN_PROGRESS ? PauseCircle : PlayCircle} label={task.status === TASK_STATUS.IN_PROGRESS ? 'Tạm dừng' : 'Tiếp tục'} onClick={toggleStartOnHold} />
                                        )}
                                        {canMarkDone && isAssignee && (
                                            <DropdownItem icon={CheckCircle2} label="Đánh dấu Hoàn thành" onClick={handleMarkDoneClick} className="text-green-600 hover:!bg-green-50" />
                                        )}
                                        {((canStartOrHold || canMarkDone) && isAssignee) && ((canCancel || canDelete) && (isProjectManager || isCreator)) && (
                                            <div className="border-t border-gray-200 my-1"></div>
                                        )}
                                        {canCancel && (isProjectManager || isCreator) && (
                                            <DropdownItem icon={XCircle} label="Hủy bỏ" onClick={handleCancelClick} className="text-red-600 hover:!bg-red-50" />
                                        )}
                                        {canDelete && (isProjectManager || isCreator) && (
                                            <DropdownItem icon={Trash2} label="Xóa vĩnh viễn" onClick={handleDelete} className="text-red-600 hover:!bg-red-50" />
                                        )}
                                    </div>
                                </Dropdown.Content>
                            </Dropdown>
                        )}
                    </div>
                </div>

                {/* HÀNG 2: Metadata Summary (Giữ nguyên, đã bỏ nút thu gọn) */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 border-t border-gray-100 pt-3 mt-2">
                    <div className="flex items-center gap-1" title="Trạng thái">
                        <statusInfo.icon className={clsx("h-3.5 w-3.5", statusInfo.color)} />
                        <span className={clsx("font-medium", statusInfo.color)}>{statusInfo.label}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Ưu tiên">
                        <Flag className={clsx("h-3.5 w-3.5", priorityInfo.color)} />
                        <span>{priorityInfo.label}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Ngày bắt đầu dự kiến">
                        <FolderClock className="h-3.5 w-3.5 text-gray-400" />
                        <span>{fmt(task.plannedStartAt) || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Hạn chót">
                        <CalendarDays className="h-3.5 w-3.5 text-red-500" />
                        <span>{fmt(task.plannedDueAt) || 'N/A'}</span>
                    </div>
                    {task.startedAt && <div className="flex items-center gap-1" title={`Bắt đầu ${formatRelativeTime(task.startedAt)}`}><Play className="h-3.5 w-3.5 text-blue-500" /><span>{fmt(task.startedAt)}</span></div>}
                    {task.completedAt && <div className="flex items-center gap-1" title={`Hoàn thành ${formatRelativeTime(task.completedAt)}`}><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /><span>{fmt(task.completedAt)}</span></div>}
                    {!task.parentTask && task.progress?.total > 0 && (
                        <div className="flex items-center gap-1" title={`Tiến độ (${task.progress.completed}/${task.progress.total})`}>
                            <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
                            <span>{task.progress.percentage}%</span>
                        </div>
                    )}
                    {!task.parentTask && subtasksCount > 0 && (
                        <div className="flex items-center gap-1" title="Số nhiệm vụ con">
                            <GitMerge className="h-3.5 w-3.5 text-gray-400" />
                            <span>{subtasksCount}</span>
                        </div>
                    )}
                    {task.attachmentsCount > 0 && (
                        <div className="flex items-center gap-1" title="Số tệp đính kèm">
                            <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                            <span>{task.attachmentsCount}</span>
                        </div>
                    )}
                    {task.commentsCount > 0 && (
                        <div className="flex items-center gap-1" title="Số bình luận">
                            <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                            <span>{task.commentsCount}</span>
                        </div>
                    )}
                </div>

                {/* HÀNG 3: ĐÃ BỎ */}

            </div>

            {/* --- Dialogs (Giữ nguyên) --- */}
            {showEditTask && (<EditTaskDialog open={showEditTask} onClose={() => setShowEditTask(false)} mode="edit" task={task} projectMembers={projectMembers} users={users} allUsersWithDetails={allUsersWithDetails} onSuccess={() => { router.refresh(); setShowEditTask(false); }} workTypes={workTypes} platforms={platforms} />)}

            <NotifyZaloDialog
                open={notifyDialogOpen}
                onClose={() => setNotifyDialogOpen(false)}
                recipient={notifyRecipient}
                task={task}
                context={notifyContext}
                statusInfo={statusInfo}
                fmtDate={(d) => fmt(d)}
            />
        </>
    );
}