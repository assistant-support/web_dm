// components/tasks/TaskDetail.client.js
// Mục đích: Component hiển thị chi tiết task với edit inline

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/ui/badge';
import Avatar from '@/components/ui/avatar';
import { Select, Textarea, Input } from '@/components/ui/input';
import UserDisplay from '@/components/ui/user-display';
import CommentList from '@/components/comments/CommentList.client';
import AttachmentList from '@/components/attachments/AttachmentList.client';
import SubtaskList from '@/components/tasks/SubtaskList.client';
import ApprovalPanel from '@/components/tasks/ApprovalPanel.client';
import CollaboratorsPanel from '@/components/tasks/CollaboratorsPanel.client';
import PointDistributionPanel from '@/components/tasks/PointDistributionPanel.client';
import WorkflowVisual from '@/components/tasks/WorkflowVisual.client';
import SubtaskApprovalButton from '@/components/tasks/SubtaskApprovalButton.client';
import TaskNotifications from '@/components/tasks/TaskNotifications.client';
import TaskStatusBadge from '@/components/ui/TaskStatusBadge';
import TaskPriorityBadge from '@/components/ui/TaskPriorityBadge';
import TaskDetailHeader from '@/components/tasks/TaskDetailHeader.client';
import { updateTask, deleteTask } from '@/data/task/actions/server.js';
import { Calendar, User, Flag, Trash2, Edit2, Save, X, ListTree } from 'lucide-react';
import { format } from 'date-fns';

/**
 * TaskDetail - Hiển thị và edit task detail
 * @param {Object} props
 * @param {Object} props.task - Task object
 * @param {Object} props.parentTask - Parent task (if this is a subtask)
 * @param {string} props.projectName - Project name for breadcrumb
 * @param {boolean} props.canManage - Có quyền manage không
 * @param {Object} props.currentUser - Current user object
 * @param {Array} props.users - All users for subtask creation
 * @param {Array} props.projectMembers - Project members for subtask assignment
 * @param {Array} props.workTypes - Work types for subtask creation
 * @param {Array} props.platforms - Platforms for subtask creation
 * @param {Array} props.subtasks - Subtasks (for notifications)
 */
export default function TaskDetail({ 
    task: initialTask,
    parentTask = null,
    projectName = '',
    canManage = false, 
    currentUser = null,
    users = [],
    projectMembers = [],
    workTypes = [],
    platforms = [],
    subtasks = []
}) {
    const router = useRouter();
    const [task, setTask] = useState(initialTask);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        description: task.description || '',
        priority: task.priority || 'normal',
        status: task.status,
        plannedDueAt: task.plannedDueAt ? new Date(task.plannedDueAt).toISOString().split('T')[0] : '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const STATUS_OPTIONS = [
        { value: 'draft', label: 'Nháp' },
        { value: 'pending_approval', label: 'Chờ phê duyệt' },
        { value: 'waiting_confirm', label: 'Chờ xác nhận' },
        { value: 'in_progress', label: 'Đang thực hiện' },
        { value: 'on_hold', label: 'Tạm dừng' },
        { value: 'completed_await_review', label: 'Chờ review' },
        { value: 'completed', label: 'Hoàn thành' },
        { value: 'rejected', label: 'Từ chối' },
        { value: 'cancelled', label: 'Đã hủy' },
    ];

    const PRIORITY_OPTIONS = [
        { value: 'low', label: 'Thấp' },
        { value: 'normal', label: 'Bình thường' },
        { value: 'high', label: 'Cao' },
        { value: 'urgent', label: 'Khẩn cấp' },
    ];

    const handleUpdate = (updatedTask) => {
        setTask(updatedTask);
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        setError('');

        try {
            const result = await updateTask(task._id, {
                description: editData.description.trim(),
                priority: editData.priority,
                status: editData.status,
                plannedDueAt: editData.plannedDueAt || undefined,
            });

            if (!result.ok) {
                setError(result.message || 'Không thể cập nhật nhiệm vụ');
                return;
            }

            setTask(result.data);
            setIsEditing(false);
            router.refresh();
        } catch (err) {
            console.error('Update task error:', err);
            setError(err.message || 'Có lỗi không mong muốn xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setEditData({
            description: task.description || '',
            priority: task.priority || 'normal',
            status: task.status,
            plannedDueAt: task.plannedDueAt ? new Date(task.plannedDueAt).toISOString().split('T')[0] : '',
        });
        setIsEditing(false);
        setError('');
    };

    return (
        <>
            {/* Header */}
            <TaskDetailHeader
                task={task}
                projectName={projectName}
                canManage={canManage}
                onUpdate={handleUpdate}
            />

            <div className="bg-white shadow rounded-lg max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Body */}
                <div className="px-6 py-4">
                    {/* Edit mode toggle */}
                    {canManage && !isEditing && (
                        <div className="mb-4 flex justify-end">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <Edit2 className="h-4 w-4" />
                                Chỉnh sửa chi tiết
                            </button>
                        </div>
                    )}

                    {isEditing && canManage && (
                        <div className="mb-4 flex gap-2 justify-end">
                            <button
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                <Save className="h-4 w-4" />
                                Lưu thay đổi
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <X className="h-4 w-4" />
                                Hủy
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Approval Panel - Hiển thị nếu cần approve */}
                    <ApprovalPanel
                        task={task}
                        canApprove={canManage}
                        isAssignee={task.assignedTo === currentUser?.externalUserId}
                        onUpdate={handleUpdate}
                    />

                    {/* Subtask Approval - If this is a subtask awaiting parent's approval */}
                    {task.parentTask && parentTask && (
                        <SubtaskApprovalButton
                            subtask={task}
                            parentAssignee={parentTask.assignedTo}
                            currentUserId={currentUser?.externalUserId}
                        />
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Mô tả</h3>
                                {isEditing ? (
                                    <Textarea
                                        value={editData.description}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                        rows={6}
                                        placeholder="Thêm mô tả..."
                                        disabled={isSubmitting}
                                    />
                                ) : (
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {task.description || <span className="text-gray-400 italic">Chưa có mô tả</span>}
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            {task.tags && task.tags.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 mb-2">Thẻ</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {task.tags.map((tag, idx) => (
                                            <Badge key={idx} variant="outline">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Checklist placeholder */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Checklist</h3>
                                <p className="text-sm text-gray-500 italic">Sắp ra mắt...</p>
                            </div>

                            {/* Subtasks - Only show if this is NOT a subtask itself */}
                            {!task.parentTask && (
                                <div className="space-y-6">
                                    {/* Notifications for task owner */}
                                    <TaskNotifications
                                        task={task}
                                        subtasks={subtasks}
                                        currentUserId={currentUser?.externalUserId}
                                    />

                                    {/* Workflow Visualization - Link to separate page */}
                                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-medium text-gray-900">Workflow</h3>
                                            <Link
                                                href={`/tasks/${task._id}/workflow`}
                                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                Chỉnh sửa workflow →
                                            </Link>
                                        </div>
                                        <WorkflowVisual taskId={task._id} task={task} />
                                    </div>

                                    {/* Point Distribution */}
                                    <div>
                                        <PointDistributionPanel
                                            task={task}
                                            canManage={canManage}
                                        />
                                    </div>

                                    {/* Subtasks */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <ListTree className="h-5 w-5 text-gray-700" />
                                            <h3 className="text-sm font-medium text-gray-900">Nhiệm vụ con</h3>
                                        </div>
                                        <SubtaskList
                                            parentTaskId={task._id}
                                            parentTask={task}
                                            projectMembers={projectMembers}
                                            users={users}
                                            workTypes={workTypes}
                                            platforms={platforms}
                                            currentUserId={currentUser?.externalUserId}
                                            canManage={canManage}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Show parent task link if this is a subtask */}
                            {task.parentTask && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-sm text-blue-800">
                                        <ListTree className="h-4 w-4" />
                                        <span className="font-medium">Subtask của:</span>
                                        <a 
                                            href={`/tasks/${task.parentTask}`}
                                            className="text-blue-600 hover:text-blue-700 hover:underline"
                                        >
                                            #{task.parentTask.slice(-8)}
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Trạng thái
                            </label>
                            {isEditing ? (
                                <Select
                                    value={editData.status}
                                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                    options={STATUS_OPTIONS}
                                    disabled={isSubmitting}
                                />
                            ) : (
                                <TaskStatusBadge status={task.status} size="md" />
                            )}
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Flag className="h-4 w-4 inline mr-1" />
                                Độ ưu tiên
                            </label>
                            {isEditing ? (
                                <Select
                                    value={editData.priority}
                                    onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                                    options={PRIORITY_OPTIONS}
                                    disabled={isSubmitting}
                                />
                            ) : (
                                <TaskPriorityBadge priority={task.priority} size="md" />
                            )}
                        </div>

                        {/* Assignee */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <User className="h-4 w-4 inline mr-1" />
                                Người phụ trách
                            </label>
                            {task.assignee ? (
                                <UserDisplay userId={task.assignee} size="sm" />
                            ) : (
                                <span className="text-sm text-gray-400 italic">Chưa gán</span>
                            )}
                        </div>

                        {/* Due Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="h-4 w-4 inline mr-1" />
                                Hạn hoàn thành
                            </label>
                            {isEditing ? (
                                <Input
                                    type="date"
                                    value={editData.plannedDueAt}
                                    onChange={(e) => setEditData({ ...editData, plannedDueAt: e.target.value })}
                                    disabled={isSubmitting}
                                />
                            ) : task.plannedDueAt ? (
                                <div className="text-sm text-gray-900">
                                    {format(new Date(task.plannedDueAt), 'MMM dd, yyyy')}
                                </div>
                            ) : (
                                <span className="text-sm text-gray-400 italic">Không có hạn</span>
                            )}
                        </div>

                        {/* Timestamps */}
                        <div className="pt-4 border-t border-gray-200 space-y-2">
                            <div className="text-xs text-gray-500">
                                <span className="font-medium">Tạo lúc:</span>{' '}
                                {format(new Date(task.createdAt), 'dd/MM/yyyy HH:mm')}
                            </div>
                            {task.updatedAt && (
                                <div className="text-xs text-gray-500">
                                    <span className="font-medium">Cập nhật:</span>{' '}
                                    {format(new Date(task.updatedAt), 'dd/MM/yyyy HH:mm')}
                                </div>
                            )}
                        </div>

                        {/* Collaborators */}
                        <div className="pt-4 border-t border-gray-200">
                            <CollaboratorsPanel
                                task={task}
                                users={users}
                                projectMembers={projectMembers}
                                currentUserId={currentUser?.externalUserId}
                                canManage={canManage}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Comments Section */}
            <div className="px-6 py-6 border-t border-gray-200 bg-gray-50">
                <CommentList
                    taskId={task._id}
                    currentUser={currentUser}
                    canManage={canManage}
                    initialCount={task.commentsCount || 0}
                />
            </div>

            {/* Attachments Section */}
            <div className="px-6 py-6 border-t border-gray-200">
                <AttachmentList
                    taskId={task._id}
                    projectId={task.project}
                    scope="task"
                    currentUser={currentUser}
                    canManage={canManage}
                    initialCount={task.attachmentsCount || 0}
                />
            </div>
        </div>
        </>
    );
}
