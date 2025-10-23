// components/tasks/TaskItem.client.js
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    CheckCircle2, Circle, CircleDashed, CircleHelp,
    PauseCircle, PlayCircle, XCircle, CalendarDays, User,
    ChevronRight, ChevronDown, MessageSquare, Paperclip, BarChart3
} from 'lucide-react';
import clsx from 'clsx';
import Button from '@/components/ui/button';
import SubtaskListSimple from './SubtaskListSimple.client';

// --- Helpers ---
const fmt = (d) =>
    d ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(d)) : '—';

const getStatusInfo = (status) => {
    switch (status) {
        case 'draft': return { icon: CircleDashed, color: 'text-gray-400', label: 'Nháp' };
        case 'pending_approval': return { icon: CircleHelp, color: 'text-amber-600', label: 'Chờ duyệt' };
        case 'waiting_confirm': return { icon: CircleHelp, color: 'text-blue-500', label: 'Chờ xác nhận' };
        case 'in_progress': return { icon: PlayCircle, color: 'text-blue-600', label: 'Đang làm' };
        case 'on_hold': return { icon: PauseCircle, color: 'text-gray-500', label: 'Tạm dừng' };
        case 'completed_await_review': return { icon: CheckCircle2, color: 'text-yellow-600', label: 'Chờ duyệt' };
        case 'completed': return { icon: CheckCircle2, color: 'text-green-600', label: 'Hoàn thành' };
        case 'rejected': return { icon: XCircle, color: 'text-red-600', label: 'Từ chối' };
        case 'cancelled': return { icon: XCircle, color: 'text-gray-400', label: 'Đã hủy' };
        default: return { icon: Circle, color: 'text-gray-400', label: status };
    }
};

const getPriorityInfo = (priority) => {
    switch (priority) {
        case 'urgent': return { color: 'text-red-600 border-red-300 bg-red-50', label: '🔥 Khẩn' };
        case 'high': return { color: 'text-orange-600 border-orange-300 bg-orange-50', label: 'Cao' };
        case 'normal': return { color: 'text-gray-600 border-gray-300 bg-gray-50', label: 'TB' };
        case 'low': return { color: 'text-gray-400 border-gray-200 bg-gray-50', label: 'Thấp' };
        default: return { color: 'text-gray-400 border-gray-200 bg-gray-50', label: '-' };
    }
};

export default function TaskItem({ 
    task, 
    users = [], 
    projectMembers = [],
    workTypes = [],
    platforms = [],
    currentUserId = '',
    canManage = false,
    actions, 
    onRefresh 
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedAssignee, setSelectedAssignee] = useState(task.assignee || '');

    const { onAssign, onUpdateStatus, onMarkDone, onCancel } = actions;

    // Toggle start/pause
    const toggleStartOnHold = () => {
        if (task.status === 'on_hold') return onUpdateStatus(task._id, 'in_progress', onRefresh);
        if (task.status === 'in_progress') return onUpdateStatus(task._id, 'on_hold', onRefresh);
        return onUpdateStatus(task._id, 'in_progress', onRefresh);
    };

    // Handle assignee change
    const handleAssigneeChange = (e) => {
        const newAssignee = e.target.value;
        setSelectedAssignee(newAssignee);
        if (newAssignee !== (task.assignee || '')) {
            onAssign(task._id, newAssignee || null, onRefresh);
        }
    };

    const statusInfo = getStatusInfo(task.status);
    const priorityInfo = getPriorityInfo(task.priority);
    const StatusIcon = statusInfo.icon;

    // Progress calculation
    const progress = task.progress || { total: 0, completed: 0, percentage: 0 };
    const hasSubtasks = progress.total > 0;

    // Find assignee info
    const assigneeInfo = users.find(u => u.value === task.assignee);
    const assigneeDisplay = assigneeInfo?.label || task.assignee || '';

    return (
        <div 
            className={clsx(
                "border rounded-lg transition-all hover:shadow-md group",
                "bg-white border-gray-200",
                isExpanded && "shadow-lg"
            )}
        >
            <div className="flex items-center gap-3 p-3">
                {/* 1. Expand button */}
                <div className="flex-shrink-0 w-5">
                    {hasSubtasks ? (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    ) : (
                        <span className="inline-block w-4"></span>
                    )}
                </div>

                {/* 2. Status icon */}
                <div className="flex-shrink-0" title={statusInfo.label}>
                    <StatusIcon className={clsx("h-5 w-5", statusInfo.color)} />
                </div>

                {/* 3. Title - clickable */}
                <div className="flex-grow min-w-0">
                    <Link
                        href={`/tasks/${task._id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                        title={task.title}
                    >
                        {task.title}
                    </Link>
                    {/* Project name if available */}
                    {task.projectName && (
                        <p className="text-xs text-gray-500 mt-0.5">📁 {task.projectName}</p>
                    )}
                </div>

                {/* 4. Progress badge */}
                {hasSubtasks && (
                    <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded text-xs">
                        <BarChart3 className="h-3 w-3 text-blue-600" />
                        <span className="font-medium text-blue-700">{progress.percentage}%</span>
                        <span className="text-gray-500">({progress.completed}/{progress.total})</span>
                    </div>
                )}

                {/* 5. Priority badge */}
                <div className={clsx("flex-shrink-0 text-xs px-2 py-1 rounded border font-medium", priorityInfo.color)}>
                    {priorityInfo.label}
                </div>

                {/* 6. Assignee dropdown */}
                <div className="flex-shrink-0 flex items-center gap-1.5 min-w-[140px]">
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <select
                        value={selectedAssignee}
                        onChange={handleAssigneeChange}
                        className="text-xs border border-gray-200 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full bg-white"
                        title={assigneeDisplay}
                    >
                        <option value="">Chưa giao</option>
                        {users.map(u => (
                            <option key={u.value} value={u.value}>
                                {u.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 7. Due date */}
                <div className="flex-shrink-0 flex items-center gap-1.5 text-xs text-gray-600 min-w-[80px]">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    <span>{fmt(task.plannedDueAt)}</span>
                </div>

                {/* 8. Comments & Attachments count */}
                <div className="flex-shrink-0 flex items-center gap-2 text-xs text-gray-500">
                    {task.commentsCount > 0 && (
                        <div className="flex items-center gap-1" title={`${task.commentsCount} comments`}>
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>{task.commentsCount}</span>
                        </div>
                    )}
                    {task.attachmentsCount > 0 && (
                        <div className="flex items-center gap-1" title={`${task.attachmentsCount} attachments`}>
                            <Paperclip className="h-3.5 w-3.5" />
                            <span>{task.attachmentsCount}</span>
                        </div>
                    )}
                </div>

                {/* 9. Points */}
                <div className="flex-shrink-0 text-xs font-semibold text-gray-700 w-12 text-center px-2 py-1 bg-gray-50 rounded border border-gray-200">
                    {task.finalPoints || task.initialPoints || 0}đ
                </div>

                {/* 10. Quick actions */}
                <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Start/Pause button */}
                    {!['completed', 'cancelled', 'rejected', 'pending_approval'].includes(task.status) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="!p-1.5 h-auto"
                            onClick={toggleStartOnHold}
                            title={task.status === 'in_progress' ? 'Tạm dừng' : 'Bắt đầu'}
                        >
                            {task.status === 'in_progress' ? (
                                <PauseCircle className="h-4 w-4 text-gray-600" />
                            ) : (
                                <PlayCircle className="h-4 w-4 text-blue-600" />
                            )}
                        </Button>
                    )}
                    
                    {/* Mark done button */}
                    {!['completed', 'cancelled', 'rejected'].includes(task.status) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="!p-1.5 h-auto"
                            onClick={() => onMarkDone(task._id, onRefresh)}
                            title="Hoàn thành"
                        >
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                    )}
                    
                    {/* Cancel button */}
                    {!['completed', 'cancelled'].includes(task.status) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="!p-1.5 h-auto hover:!bg-red-50"
                            onClick={() => onCancel(task._id, onRefresh)}
                            title="Hủy bỏ"
                        >
                            <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Expanded subtasks */}
            {isExpanded && hasSubtasks && (
                <SubtaskListSimple 
                    parentTaskId={task._id}
                    parentTask={task}
                    projectMembers={projectMembers}
                    users={users}
                    workTypes={workTypes}
                    platforms={platforms}
                    currentUserId={currentUserId}
                    canManage={canManage}
                />
            )}
        </div>
    );
}