// components/tasks/SubtaskListSimple.client.js
// Mục đích: Hiển thị read-only subtasks trong TaskItem (không có editing)

'use client';

import { useState, useEffect } from 'react';
import { listSubtasks } from '@/data/task/actions/server';
import CreateSubtaskDialog from './CreateSubtaskDialog.client';
import { 
    CheckCircle2, Circle, CircleDashed, CircleHelp,
    PauseCircle, PlayCircle, XCircle, Loader2, AlertCircle, Plus
} from 'lucide-react';
import clsx from 'clsx';

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

function SubtaskItem({ subtask }) {
    const statusInfo = getStatusInfo(subtask.status);
    const StatusIcon = statusInfo.icon;

    return (
        <div className="flex items-center gap-2 py-2 px-3 bg-white rounded border border-gray-100 hover:border-gray-200 transition-colors">
            {/* Status icon */}
            <StatusIcon className={clsx("h-4 w-4 flex-shrink-0", statusInfo.color)} />
            
            {/* Title */}
            <div className="flex-grow min-w-0">
                <p className="text-sm text-gray-800 truncate">{subtask.title}</p>
            </div>
            
            {/* Points */}
            {(subtask.finalPoints > 0 || subtask.initialPoints > 0) && (
                <div className="flex-shrink-0 text-xs text-gray-600 font-medium">
                    {subtask.finalPoints || subtask.initialPoints}đ
                </div>
            )}
            
            {/* Status label */}
            <div className="flex-shrink-0">
                <span className={clsx(
                    "text-xs px-2 py-0.5 rounded font-medium",
                    statusInfo.color,
                    statusInfo.color.includes('green') && "bg-green-50",
                    statusInfo.color.includes('blue') && "bg-blue-50",
                    statusInfo.color.includes('amber') && "bg-amber-50",
                    statusInfo.color.includes('yellow') && "bg-yellow-50",
                    statusInfo.color.includes('red') && "bg-red-50",
                    statusInfo.color.includes('gray') && "bg-gray-50"
                )}>
                    {statusInfo.label}
                </span>
            </div>
        </div>
    );
}

export default function SubtaskListSimple({ 
    parentTaskId, 
    parentTask = null, 
    projectMembers = [], 
    users = [],
    workTypes = [],
    platforms = [],
    currentUserId = '',
    canManage = false 
}) {
    const [subtasks, setSubtasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchSubtasks = async () => {
            try {
                setIsLoading(true);
                setError(null);
                
                const result = await listSubtasks(parentTaskId);
                
                if (!isMounted) return;
                
                if (result.ok) {
                    setSubtasks(result.data || []);
                } else {
                    setError(result.message || 'Không thể tải subtasks');
                }
            } catch (err) {
                if (!isMounted) return;
                console.error('Fetch subtasks error:', err);
                setError('Có lỗi xảy ra khi tải subtasks');
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchSubtasks();

        return () => {
            isMounted = false;
        };
    }, [parentTaskId, showCreateDialog]); // Re-fetch khi dialog đóng

    const handleSubtaskCreated = (newSubtask) => {
        setSubtasks(prev => [...prev, newSubtask]);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="pl-12 pr-4 py-3 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang tải subtasks...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="pl-12 pr-4 py-3 border-t border-gray-100 bg-red-50">
                <div className="flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    // Empty state
    if (subtasks.length === 0) {
        return (
            <div className="pl-12 pr-4 py-3 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 italic">Chưa có công việc con nào</p>
                    {canManage && (
                        <button
                            onClick={() => setShowCreateDialog(true)}
                            className="text-xs px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                        >
                            <Plus className="h-3 w-3" />
                            Thêm công việc con
                        </button>
                    )}
                </div>
                
                {/* Create Dialog */}
                {showCreateDialog && parentTask && (
                    <CreateSubtaskDialog
                        open={showCreateDialog}
                        onClose={() => setShowCreateDialog(false)}
                        parentTask={parentTask}
                        projectMembers={projectMembers}
                        users={users}
                        workTypes={workTypes}
                        platforms={platforms}
                        currentUserId={currentUserId}
                        onSuccess={handleSubtaskCreated}
                    />
                )}
            </div>
        );
    }

    // Subtasks list
    return (
        <div className="pl-12 pr-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-600">
                        Công việc con ({subtasks.length})
                    </p>
                    {canManage && (
                        <button
                            onClick={() => setShowCreateDialog(true)}
                            className="text-xs px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                        >
                            <Plus className="h-3 w-3" />
                            Thêm
                        </button>
                    )}
                </div>
                {subtasks.map((subtask) => (
                    <SubtaskItem key={subtask._id} subtask={subtask} />
                ))}
            </div>
            
            {/* Create Dialog */}
            {showCreateDialog && parentTask && (
                <CreateSubtaskDialog
                    open={showCreateDialog}
                    onClose={() => setShowCreateDialog(false)}
                    parentTask={parentTask}
                    projectMembers={projectMembers}
                    users={users}
                    workTypes={workTypes}
                    platforms={platforms}
                    currentUserId={currentUserId}
                    onSuccess={handleSubtaskCreated}
                />
            )}
        </div>
    );
}
