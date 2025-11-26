// components/tasks/TaskDetail.client.js
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    CheckCircle2, Circle, CircleDashed, Clock, UserCheck, ShieldCheck, Send, Check, X, Users,
    PauseCircle, PlayCircle, XCircle, CalendarDays, BarChart3, CornerUpLeft, MessageSquare, Paperclip,
    MoreVertical, PlusCircle, Edit, Trash2, ChevronRight, CheckCheck, Undo2, Users2, GitMerge, ListTree,
    FolderClock, // Added previously
    Play,       // Added previously
    Flag        // <-- ADD THIS ICON
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { getUserId } from '@/lib/permissions.js';

// Hooks và Actions
import { useAsyncNotifier } from '@/hooks/loading.hook.js';
import {
    approveTaskCreation, confirmAssignment, approveTaskCompletion,
    updateTaskStatus, deleteTask, updateTask,
    distributePointsToSubtasks, inviteCollaborator, removeCollaboratorFromTask
} from '@/data/task/actions';

// Components UI
import Button from '@/components/ui/button';
import Dropdown from '@/components/ui/dropdown';
import Avatar from '@/components/ui/avatar';
import { driveImage } from '@/functions';
import Badge from '@/components/ui/badge';
import UserDisplay from '@/components/ui/user-display';
import { formatTaskPoints } from '@/lib/points';

// Components Task Specific
import CommentList from '@/components/comments/CommentList.client';
import AttachmentList from '@/components/attachments/AttachmentList.client';
import CollaboratorsPanel from '@/components/tasks/CollaboratorsPanel.client';
import PointDistributionPanel from '@/components/tasks/PointDistributionPanel.client';
import TaskPointsBadge from './TaskPointsBadge.client';

// Dialogs
import CreateSubtaskDialog from './CreateSubtaskDialog.client';
import EditTaskDialog from './EditTaskDialog.client';

// Enums and Helpers
import { TASK_STATUS } from '@/model/common/enums';

// --- Helpers ---
const fmt = (d, includeTime = false) => {
    if (!d) return '—';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return '—'; // Handle invalid date strings

        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return new Intl.DateTimeFormat('vi-VN', options).format(date);
    } catch (e) {
        console.error("Error formatting date:", d, e);
        return '—'; // Fallback for any unexpected error
    }
};

const getStatusInfo = (status) => {
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
    switch (priority) {
        case 'urgent': return { color: 'text-red-600', label: '🔥 Khẩn' };
        case 'high': return { color: 'text-orange-600', label: 'Cao' };
        case 'medium': return { color: 'text-gray-600', label: 'TB' };
        case 'low': return { color: 'text-gray-400', label: 'Thấp' };
        default: return { color: 'text-gray-400', label: '-' };
    }
};

// --- Component Card Phụ ---
const MetadataItem = ({ icon: Icon, label, children, iconClassName = "text-gray-500" }) => (
    <div className="flex items-start justify-between py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 flex-shrink-0 mr-4">
            {Icon && <Icon className={clsx("h-4 w-4", iconClassName)} />}
            <span>{label}</span>
        </div>
        <div className="text-sm text-gray-900 font-medium text-right min-w-0 break-words">
            {children}
        </div>
    </div>
);
const UserAvatarItem = ({ userId, label, allUsers = [] }) => {
    const user = userId ? allUsers.find(u => u.id === userId) : null;
    // Determine project active state if available on task
    const projectActive = (() => {
        if (!task) return true;
        if (task.project && typeof task.project === 'object' && 'isActive' in task.project) return task.project.isActive;
        if ('projectIsActive' in task) return task.projectIsActive;
        return true;
    })();

    return (
        <MetadataItem icon={UserCheck} label={label}>
            {user ? (
                <div className="flex items-center justify-end gap-2">
                    <span className="truncate max-w-[150px]" title={user.name}>{user.name}</span>
                    <Avatar userId={user.id} name={user.name} src={driveImage(user.avatarUrl)} size="xs" tooltip={user.name} />
                </div>
            ) : (<span className="text-gray-500 italic">Chưa gán</span>)}
        </MetadataItem>
    );
};

// --- Component Chính ---
export default function TaskDetail({
    task: initialTask,
    parentTask,
    projectName,
    canManage,
    currentUser,
    users,
    allUsersWithDetails = [],
    projectMembers,
    subtasks = [],
    workTypes = [],
    platforms = [],
}) {
    const router = useRouter();
    const { run } = useAsyncNotifier();

    // State
    const [task, setTask] = useState(initialTask);
    const [showCreateSubtask, setShowCreateSubtask] = useState(false);
    const [showEditTask, setShowEditTask] = useState(false);

    useEffect(() => { setTask(initialTask); }, [initialTask]);

    // Permissions & Info
    const currentUserId = currentUser.externalUserId;
    const isAssignee = getUserId(task.assignee) === currentUserId;
    const isCreator = getUserId(task.createdBy) === currentUserId;
    const canEditTask = canManage || isCreator;
    const canManagePanels = canManage;
    const statusInfo = useMemo(() => getStatusInfo(task.status), [task.status]);
    const priorityInfo = useMemo(() => getPriorityInfo(task.priority), [task.priority]);
    const assigneeId = getUserId(task.assignee);
    const creatorId = getUserId(task.createdBy);

    // Determine whether the related project is active (UI-level)
    const projectActive = (() => {
        if (!task) return true;
        if (task.project && typeof task.project === 'object' && 'isActive' in task.project) return task.project.isActive;
        if ('projectIsActive' in task) return task.projectIsActive;
        return true;
    })();

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

    // --- ADD THIS FUNCTION ---
    const formatRelativeTime = (dateString) => {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return null;
            // Use Vietnamese locale for relative time
            return formatDistanceToNowStrict(date, { addSuffix: true, locale: vi });
        } catch (e) {
            console.error("Error formatting relative time:", dateString, e);
            return null; // Fallback for any unexpected error
        }
    };

    // --- Action Handlers ---
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
            note = prompt('Vui lòng nhập lý do yêu cầu làm lại:'); if (note === null || note.trim() === "") return alert('Vui lòng nhập lý do.');
        }
        await run(() => approveTaskCompletion(task._id, { approve, note, finalPoints }), {
            loadingMessage: approve ? 'Đang duyệt hoàn thành...' : 'Đang gửi yêu cầu làm lại...',
            successMessage: approve ? 'Task đã hoàn thành!' : 'Đã gửi yêu cầu làm lại.', onSuccess: router.refresh
        });
    };
    const handleUpdateStatus = (newStatus) => {
        let loadingMsg = 'Đang cập nhật trạng thái...'; let successMsg = 'Đã cập nhật trạng thái!';
        if (newStatus === TASK_STATUS.COMPLETED_AWAIT_REVIEW) { loadingMsg = 'Đang gửi duyệt hoàn thành...'; successMsg = 'Đã gửi duyệt!'; }
        else if (newStatus === TASK_STATUS.ON_HOLD) { loadingMsg = 'Đang tạm dừng...'; successMsg = 'Đã tạm dừng công việc.'; }
        else if (newStatus === TASK_STATUS.IN_PROGRESS) { loadingMsg = 'Đang tiếp tục/bắt đầu công việc...'; successMsg = 'Đã tiếp tục/bắt đầu công việc!'; }
        run(() => updateTaskStatus(task._id, newStatus), { loadingMessage: loadingMsg, successMessage: successMsg, onSuccess: router.refresh });
    };
    const handleDelete = () => {
        if (!confirm('Bạn có chắc muốn XÓA vĩnh viễn nhiệm vụ này? Hành động này không thể hoàn tác.')) return;
        run(async () => { const result = await deleteTask(task._id); if (!result.ok) throw new Error(result.message); return result; }, {
            loadingMessage: 'Đang xóa nhiệm vụ...', successMessage: 'Đã xóa nhiệm vụ!',
            onSuccess: () => router.push(task.project ? `/projects/${task.project}` : '/tasks')
        });
    };
    const handlePanelUpdate = () => { router.refresh(); };
    const handleNotifyAssignee = () => { alert('Đã gửi thông báo nhắc nhở người thực hiện (chức năng đang phát triển).'); };
    const handleNotifyManager = () => { alert('Đã gửi thông báo nhắc nhở quản lý (chức năng đang phát triển).'); };
    

    return (
        <div className="flex-1 min-h-0 flex flex-col w-full overflow-hidden">

            {/* --- Top Section (Not scrollable independently) --- */}
            {/* --- Top Section (Redesigned) --- */}
            <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-4 pb-4 border-b border-gray-200 bg-white space-y-3">
                {/* Row 1: Breadcrumbs & Main Actions */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap mr-4">
                        <Link href={task.project ? `/projects/${task.project}` : '/tasks'} className="flex items-center gap-1 hover:text-blue-600 hover:underline">
                            <CornerUpLeft className="h-4 w-4" />
                            <span className="truncate max-w-[200px] sm:max-w-xs">{projectName || 'Danh sách Tasks'}</span>
                        </Link>
                        {parentTask && (
                            <>
                                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <Link href={`/tasks/${parentTask._id}`} className="hover:text-blue-600 hover:underline truncate max-w-[200px] sm:max-w-xs" title={parentTask.title}>
                                    {parentTask.title}
                                </Link>
                            </>
                        )}
                    </div>
                    {/* Main Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Conditional Action Buttons */}
                        {task.status === TASK_STATUS.PENDING_APPROVAL && canManage && (
                            <>
                                <Button size="sm" variant="success" icon={Check} onClick={() => handleApproveCreation(true)}>Duyệt</Button>
                                <Button size="sm" variant="danger_outline" icon={X} onClick={() => handleApproveCreation(false)}>Từ chối</Button>
                            </>
                        )}
                        {task.status === TASK_STATUS.WAITING_ASSIGNEE_CONFIRM && isAssignee && (
                            <>
                                <Button size="sm" variant="success" icon={PlayCircle} onClick={() => handleConfirmAssignment(true)}>Bắt đầu</Button>
                                <Button size="sm" variant="danger_outline" icon={X} onClick={() => handleConfirmAssignment(false)}>Từ chối</Button>
                            </>
                        )}
                        {task.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW && canManage && (
                            <>
                                <Button size="sm" variant="success" icon={CheckCheck} onClick={() => handleApproveCompletion(true)}>Duyệt HT</Button>
                                <Button size="sm" variant="danger_outline" icon={Undo2} onClick={() => handleApproveCompletion(false)}>Làm lại</Button>
                            </>
                        )}
                        {/* Edit Button */}
                        {canEditTask && (
                            <Button variant="outline" size="sm" icon={Edit} onClick={() => projectActive && setShowEditTask(true)} disabled={!projectActive} title={!projectActive ? 'Dự án đã lưu trữ — không thể chỉnh sửa task' : undefined}>
                                Sửa
                            </Button>
                        )}
                    </div>
                </div>

                {/* Row 2: Title & Status/Reminder */}
                <div>
                    {/* Task Title */}
                    <h1 className="text-xl lg:text-2xl font-bold text-gray-900 break-words mb-1">
                        {task.title}
                    </h1>
                    {/* Conditional Status/Reminder Display */}
                    {(task.status === TASK_STATUS.WAITING_ASSIGNEE_CONFIRM || task.status === TASK_STATUS.PENDING_APPROVAL || task.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW) && (
                        <div className="flex items-center gap-3 mt-1 p-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs w-fit">
                            <div className="flex items-center gap-1">
                                <Clock size={12} className={statusInfo.color} />
                                <span className={clsx("font-medium", statusInfo.color)}>{statusInfo.label}</span>
                            </div>
                            {(task.status === TASK_STATUS.WAITING_ASSIGNEE_CONFIRM && (isCreator || canManage)) && (<Button size="xs" variant="outline_primary" icon={Send} onClick={handleNotifyAssignee}>Nhắc</Button>)}
                            {(task.status === TASK_STATUS.PENDING_APPROVAL && (isCreator || isAssignee)) && (<Button size="xs" variant="outline_warning" icon={Send} onClick={handleNotifyManager}>Nhắc QL</Button>)}
                            {(task.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW && isAssignee) && (<Button size="xs" variant="outline_warning" icon={Send} onClick={handleNotifyManager}>Nhắc duyệt</Button>)}
                        </div>
                    )}
                </div>

                {/* Row 3: Metadata Summary */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 border-t border-gray-100 pt-3 mt-2">
                    {/* Status (always show) */}
                    <div className="flex items-center gap-1" title="Trạng thái">
                        <statusInfo.icon className={clsx("h-3.5 w-3.5", statusInfo.color)} />
                        <span className={clsx("font-medium", statusInfo.color)}>{statusInfo.label}</span>
                    </div>
                    {/* Priority */}
                    <div className="flex items-center gap-1" title="Ưu tiên">
                        <Flag className={clsx("h-3.5 w-3.5", priorityInfo.color)} />
                        <span>{priorityInfo.label}</span>
                    </div>
                    {/* Dates */}
                    <div className="flex items-center gap-1" title="Ngày bắt đầu dự kiến">
                        <FolderClock className="h-3.5 w-3.5 text-gray-400" />
                        <span>{fmt(task.plannedStartAt) || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Hạn chót">
                        <CalendarDays className="h-3.5 w-3.5 text-red-500" />
                        <span>{fmt(task.plannedDueAt) || 'N/A'}</span>
                    </div>
                    {/* Start/Complete Actual */}
                    {task.startedAt && <div className="flex items-center gap-1" title={`Bắt đầu ${formatRelativeTime(task.startedAt)}`}><Play className="h-3.5 w-3.5 text-blue-500" /><span>{fmt(task.startedAt)}</span></div>}
                    {task.completedAt && <div className="flex items-center gap-1" title={`Hoàn thành ${formatRelativeTime(task.completedAt)}`}><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /><span>{fmt(task.completedAt)}</span></div>}
                    {/* Counts & Progress */}
                    {!task.parentTask && task.progress?.total > 0 && (
                        <div className="flex items-center gap-1" title={`Tiến độ (${task.progress.completed}/${task.progress.total})`}>
                            <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
                            <span>{task.progress.percentage}%</span>
                        </div>
                    )}
                    {!task.parentTask && subtasks.length > 0 && (
                        <div className="flex items-center gap-1" title="Số nhiệm vụ con">
                            <GitMerge className="h-3.5 w-3.5 text-gray-400" />
                            <span>{subtasks.length}</span>
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

                {/* Row 4: Scrollable Description and Tags */}
                <div className="max-h-[120px] overflow-y-auto custom-scrollbar pr-2 space-y-2 bg-gray-50 p-2 rounded border border-gray-200">
                    {/* Description */}
                    <div>
                        {task.description ? (
                            <div className="prose prose-sm max-w-none text-gray-700 text-xs" dangerouslySetInnerHTML={{ __html: task.description }} />
                        ) : (
                            <p className="text-xs text-gray-400 italic">Không có mô tả.</p>
                        )}
                    </div>
                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                        <div className="pt-2 border-t border-gray-200">
                            <div className="flex flex-wrap gap-1.5">
                                {task.tags.map((tag, idx) => (<Badge key={idx} variant="secondary" className="text-xs font-normal">{tag}</Badge>))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Main Content Area (Two scrollable columns) --- */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden px-4 sm:px-6 lg:px-8 pb-6">

                {/* --- LEFT SCROLLABLE COLUMN --- */}
                <div className="lg:w-2/3 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
                        {/* Workflow Link (Parent only) */}
                        {!task.parentTask && (
                            <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2"> <ListTree className="h-5 w-5 text-purple-600" /> <h3 className="text-sm font-semibold text-gray-900">Workflow</h3> </div>
                                    <Link href={`/tasks/${task._id}/workflow`} className="text-sm text-purple-600 hover:text-purple-700 font-medium hover:underline"> Quản lý workflow → </Link>
                                </div>
                                <p className="text-xs text-gray-600 mt-1.5">Sắp xếp thứ tự và quản lý luồng công việc của các nhiệm vụ con.</p>
                            </div>
                        )}

                        {/* Subtasks List (Parent only) */}
                        {!task.parentTask && (
                            <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2"><GitMerge className="h-5 w-5 text-gray-500" /> Nhiệm vụ con ({subtasks.length})</h2>
                                        {(canManage || isAssignee) && (
                                            <Button size="xs" variant="outline" icon={PlusCircle} onClick={() => projectActive && setShowCreateSubtask(true)} disabled={!projectActive} title={!projectActive ? 'Dự án đã lưu trữ — không thể thêm việc con' : undefined}>
                                                Thêm việc con
                                            </Button>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {subtasks.length > 0 ? (subtasks.map(sub => {
                                            const subStatusInfo = getStatusInfo(sub.status); const SubStatusIcon = subStatusInfo.icon;
                                            const subAssigneeId = getUserId(sub.assignee);
                                            const subAssignee = subAssigneeId ? allUsersWithDetails.find(u => u.id === subAssigneeId) : null;
                                            return (
                                                <Link href={`/tasks/${sub._id}`} key={sub._id} className="flex items-center justify-between p-2.5 rounded-md border border-gray-100 bg-gray-50 hover:bg-gray-100 group transition-colors duration-150">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-4">
                                                        <SubStatusIcon className={clsx("h-4 w-4 flex-shrink-0", subStatusInfo.color)} />
                                                        <span className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600" title={sub.title}>{sub.title}</span>
                                                        {sub.status === TASK_STATUS.COMPLETED && <CheckCheck className="h-4 w-4 text-green-600 flex-shrink-0 ml-1" />}
                                                    </div>
                                                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                                                        <span className="text-xs text-gray-500 hidden sm:inline">{fmt(sub.plannedDueAt)}</span>
                                                        {subAssignee ? (<Avatar userId={subAssignee.id} name={subAssignee.name} src={driveImage(subAssignee.avatarUrl)} size="xs" tooltip={subAssignee.name} />)
                                                            : (<div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center" title="Chưa gán"><UserCheck className="h-3 w-3 text-gray-500" /></div>)}
                                                    </div>
                                                </Link>
                                            )
                                        }))
                                            : (<p className="text-sm text-gray-500 italic text-center py-4 border border-dashed border-gray-200 rounded-md">Chưa có nhiệm vụ con nào.</p>)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Attachments */}
                        <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="p-5">
                                <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2"><Paperclip className="h-5 w-5 text-gray-500" /> Tệp đính kèm</h2>
                                <AttachmentList taskId={task._id} projectId={task.project} scope="task" currentUser={currentUser} canManage={canManage || isCreator || isAssignee} initialCount={task.attachmentsCount || 0} isActive={projectActive} />
                            </div>
                        </div>

                        {/* Comments */}
                        <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="p-5 border-b border-gray-100"> <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-gray-500" /> Thảo luận</h2> </div>
                                <div className="p-5"> <CommentList taskId={task._id} currentUser={currentUser} canManage={canManage} initialCount={task.commentsCount || 0} isActive={projectActive} /> </div>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT SCROLLABLE COLUMN --- */}
                <div className="lg:w-1/3 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
                        {/* Action Box */}
                        <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-700">Hành động</h3></div>
                            <div className="p-4">
                                {task.status === TASK_STATUS.PENDING_APPROVAL && canManage && (<div className="space-y-2"> <Button variant="success" className="w-full justify-center" icon={Check} onClick={() => handleApproveCreation(true)}>Duyệt tạo Task</Button> <Button variant="danger" className="w-full justify-center" icon={X} onClick={() => handleApproveCreation(false)}>Từ chối</Button> </div>)}
                                {task.status === TASK_STATUS.WAITING_ASSIGNEE_CONFIRM && isAssignee && (<div className="space-y-2"> <Button variant="success" className="w-full justify-center" icon={PlayCircle} onClick={() => handleConfirmAssignment(true)}>Bắt đầu làm</Button> <Button variant="danger" className="w-full justify-center" icon={X} onClick={() => handleConfirmAssignment(false)}>Từ chối nhận</Button> </div>)}
                                {task.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW && canManage && (<div className="space-y-2"> <Button variant="success" className="w-full justify-center" icon={CheckCheck} onClick={() => handleApproveCompletion(true)}>Duyệt hoàn thành</Button> <Button variant="danger" className="w-full justify-center" icon={Undo2} onClick={() => handleApproveCompletion(false)}>Yêu cầu làm lại</Button> </div>)}
                                {[TASK_STATUS.IN_PROGRESS, TASK_STATUS.ON_HOLD].includes(task.status) && isAssignee && (<div className="space-y-2"> <Button variant="primary" className="w-full justify-center" icon={CheckCircle2} onClick={() => handleUpdateStatus(TASK_STATUS.COMPLETED_AWAIT_REVIEW)}>Gửi duyệt Hoàn thành</Button> {task.status === TASK_STATUS.IN_PROGRESS ? (<Button variant="secondary" className="w-full justify-center" icon={PauseCircle} onClick={() => handleUpdateStatus(TASK_STATUS.ON_HOLD)}>Tạm dừng</Button>) : (<Button variant="secondary" className="w-full justify-center" icon={PlayCircle} onClick={() => handleUpdateStatus(TASK_STATUS.IN_PROGRESS)}>Tiếp tục làm</Button>)} </div>)}
                                {!((task.status === TASK_STATUS.PENDING_APPROVAL && canManage) || (task.status === TASK_STATUS.WAITING_ASSIGNEE_CONFIRM && isAssignee) || (task.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW && canManage) || ([TASK_STATUS.IN_PROGRESS, TASK_STATUS.ON_HOLD].includes(task.status) && isAssignee)) && (<p className="text-sm text-gray-500 italic text-center py-2">Không có hành động nào.</p>)}
                            </div>
                        </div>

                        {/* Metadata Box */}
                        <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-700">Thông tin chi tiết</h3></div>
                            <div className="px-4 divide-y divide-gray-100">
                                <MetadataItem icon={statusInfo.icon} label="Trạng thái" iconClassName={statusInfo.color}><span className={clsx("font-bold", statusInfo.color)}>{statusInfo.label}</span></MetadataItem>
                                <UserAvatarItem userId={assigneeId} label="Giao cho" allUsers={allUsersWithDetails} />
                                <UserAvatarItem userId={creatorId} label="Người tạo" allUsers={allUsersWithDetails} />
                                <MetadataItem icon={BarChart3} label="Độ ưu tiên" iconClassName={priorityInfo.color}><span className={priorityInfo.color}>{priorityInfo.label}</span></MetadataItem>
                                <MetadataItem icon={CalendarDays} label="Hạn chót">{fmt(task.plannedDueAt)}</MetadataItem>
                                <MetadataItem icon={CheckCircle2} label="Ngày hoàn thành" iconClassName="text-green-600">{fmt(task.completedAt)}</MetadataItem>
                                <MetadataItem icon={Circle} label="Điểm"><TaskPointsBadge task={task} size="md" /></MetadataItem>
                                <div className="pt-3 pb-3 text-xs text-gray-500 space-y-1">
                                    <div><span className="font-medium">Tạo lúc:</span> {fmt(task.createdAt, true)}</div>
                                    {task.updatedAt && task.updatedAt !== task.createdAt && (<div><span className="font-medium">Cập nhật:</span> {fmt(task.updatedAt, true)}</div>)}
                                </div>
                            </div>
                        </div>

                        {/* Collaborators Panel */}
                        <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Users2 className="h-4 w-4 text-gray-500" /> Người tham gia</h3></div>
                            <div className="p-4">
                                <CollaboratorsPanel task={task} users={users} projectMembers={projectMembers} currentUserId={currentUserId} canManage={canManagePanels} onUpdate={handlePanelUpdate} inviteAction={inviteCollaborator} removeAction={removeCollaboratorFromTask} />
                            </div>
                        </div>

                        {/* Point Distribution Panel (Parent only) */}
                        {!task.parentTask && (
                            <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
                                <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-700">Phân phối điểm</h3></div>
                                <div className="p-4">
                                    <PointDistributionPanel task={task} canManage={canManagePanels} onUpdate={handlePanelUpdate} distributeAction={distributePointsToSubtasks} subtasks={subtasks} allUsersWithDetails={allUsersWithDetails} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Dialogs --- */}
            {showCreateSubtask && (
                <CreateSubtaskDialog
                    open={showCreateSubtask}
                    onClose={() => setShowCreateSubtask(false)}
                    parentTask={task}
                    projectMembers={projectMembers}
                    users={users}
                    allUsersWithDetails={allUsersWithDetails}
                    currentUserId={currentUserId}
                    onSuccess={() => { router.refresh(); setShowCreateSubtask(false); }}
                    workTypes={workTypes}
                    platforms={platforms}
                    isActive={projectActive}
                />
            )}
            {showEditTask && (
                <EditTaskDialog
                    open={showEditTask}
                    onClose={() => setShowEditTask(false)}
                    mode="edit"
                    task={task}
                    projectMembers={projectMembers}
                    users={users}
                    allUsersWithDetails={allUsersWithDetails}
                    onSuccess={() => { router.refresh(); setShowEditTask(false); }}
                    workTypes={workTypes}
                    platforms={platforms}
                    canManage={canManage}
                    currentUserId={currentUserId}
                />
            )}
        </div>
    );
}