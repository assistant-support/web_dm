// components/tasks/SubtaskCard.client.js
// Enhanced subtask card with expand/edit capability

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
    ChevronDown, ChevronRight, CheckCircle2, Circle, 
    GripVertical, Trash2, User, Award, Clock, Edit2, Save, X,
    AlertCircle
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskStatusBadge from '@/components/ui/TaskStatusBadge';
import TaskPriorityBadge from '@/components/ui/TaskPriorityBadge';
import UserDisplay from '@/components/ui/user-display';
import { Input, Textarea, Select } from '@/components/ui/input';

/**
 * SubtaskCard - Enhanced subtask item with expand/edit
 */
export default function SubtaskCard({ 
    subtask, 
    onUpdate, 
    onDelete,
    users = [],
    workTypes = [],
    platforms = []
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Edit form state
    const [editData, setEditData] = useState({
        title: subtask.title,
        description: subtask.description || '',
        assignedTo: subtask.assignedTo || '',
        priority: subtask.priority || 'normal',
        workType: subtask.workType || '',
        estimatedHours: subtask.estimatedHours || 0,
    });

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: subtask._id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isCompleted = subtask.status === 'completed';
    const isAwaitingConfirm = subtask.status === 'waiting_confirm';
    const isAwaitingReview = subtask.status === 'completed_await_review';

    const handleToggleComplete = async () => {
        setIsUpdating(true);
        const newStatus = isCompleted ? 'in_progress' : 'completed_await_review';
        await onUpdate(subtask._id, { status: newStatus });
        setIsUpdating(false);
    };

    const handleSaveEdit = async () => {
        setIsUpdating(true);
        await onUpdate(subtask._id, editData);
        setIsUpdating(false);
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditData({
            title: subtask.title,
            description: subtask.description || '',
            assignedTo: subtask.assignedTo || '',
            priority: subtask.priority || 'normal',
            workType: subtask.workType || '',
            estimatedHours: subtask.estimatedHours || 0,
        });
        setIsEditing(false);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`border rounded-lg transition-all ${
                isExpanded ? 'border-blue-300 shadow-md' : 'border-gray-200'
            } bg-white group`}
        >
            {/* Compact row */}
            <div className="flex items-center gap-3 p-3">
                {/* Drag handle */}
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                    <GripVertical className="h-4 w-4" />
                </div>

                {/* Expand button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-gray-400 hover:text-gray-600"
                >
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </button>

                {/* Checkbox */}
                <button
                    onClick={handleToggleComplete}
                    disabled={isUpdating}
                    className="flex-shrink-0 transition-transform hover:scale-110"
                >
                    {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                        <Circle className="h-5 w-5 text-gray-300 hover:text-green-500" />
                    )}
                </button>

                {/* Title */}
                <div className="flex-1 min-w-0">
                    <Link 
                        href={`/tasks/${subtask._id}`}
                        className={`text-sm font-medium hover:text-blue-600 ${
                            isCompleted ? 'line-through text-gray-400' : 'text-gray-900'
                        }`}
                    >
                        {subtask.title}
                    </Link>
                    
                    {/* Status indicators */}
                    <div className="flex items-center gap-2 mt-1">
                        {isAwaitingConfirm && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Chờ xác nhận
                            </span>
                        )}
                        {isAwaitingReview && (
                            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Chờ duyệt
                            </span>
                        )}
                    </div>
                </div>

                {/* Quick info */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    {subtask.assignedTo && (
                        <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <UserDisplay userId={subtask.assignedTo} size="xs" showAvatar={false} />
                        </div>
                    )}
                    {subtask.points > 0 && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">
                            {subtask.points}đ
                        </span>
                    )}
                </div>

                {/* Status badge */}
                <TaskStatusBadge status={subtask.status} size="sm" />

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isEditing && (
                        <button
                            onClick={() => {
                                setIsExpanded(true);
                                setIsEditing(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                            title="Chỉnh sửa"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(subtask._id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                        title="Xóa"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
                <div className="border-t border-gray-200 p-4 space-y-4">
                    {isEditing ? (
                        /* Edit Mode */
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tiêu đề
                                    </label>
                                    <Input
                                        value={editData.title}
                                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                        disabled={isUpdating}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mô tả
                                    </label>
                                    <Textarea
                                        value={editData.description}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                        rows={3}
                                        disabled={isUpdating}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Người thực hiện
                                    </label>
                                    <Select
                                        value={editData.assignedTo}
                                        onChange={(e) => setEditData({ ...editData, assignedTo: e.target.value })}
                                        disabled={isUpdating}
                                    >
                                        <option value="">-- Chọn người --</option>
                                        {users.map(u => (
                                            <option key={u.value} value={u.value}>
                                                {u.label}
                                            </option>
                                        ))}
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Độ ưu tiên
                                    </label>
                                    <Select
                                        value={editData.priority}
                                        onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                                        disabled={isUpdating}
                                    >
                                        <option value="low">Thấp</option>
                                        <option value="normal">Bình thường</option>
                                        <option value="high">Cao</option>
                                        <option value="urgent">Khẩn cấp</option>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Loại công việc
                                    </label>
                                    <Select
                                        value={editData.workType}
                                        onChange={(e) => setEditData({ ...editData, workType: e.target.value })}
                                        disabled={isUpdating}
                                    >
                                        <option value="">-- Chọn loại --</option>
                                        {workTypes.map(wt => (
                                            <option key={wt._id} value={wt.name}>
                                                {wt.name}
                                            </option>
                                        ))}
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Giờ ước tính
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={editData.estimatedHours}
                                        onChange={(e) => setEditData({ ...editData, estimatedHours: parseFloat(e.target.value) || 0 })}
                                        disabled={isUpdating}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isUpdating}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Save className="h-4 w-4" />
                                    Lưu
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={isUpdating}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    <X className="h-4 w-4" />
                                    Hủy
                                </button>
                            </div>
                        </>
                    ) : (
                        /* View Mode */
                        <>
                            {/* Description */}
                            {subtask.description && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Mô tả</h4>
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                        {subtask.description}
                                    </p>
                                </div>
                            )}

                            {/* Metadata grid */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {subtask.assignedTo && (
                                    <div>
                                        <span className="text-gray-500">Người thực hiện:</span>
                                        <div className="mt-1">
                                            <UserDisplay userId={subtask.assignedTo} size="sm" />
                                        </div>
                                    </div>
                                )}

                                {subtask.workType && (
                                    <div>
                                        <span className="text-gray-500">Loại công việc:</span>
                                        <p className="mt-1 font-medium">{subtask.workType}</p>
                                    </div>
                                )}

                                {subtask.points > 0 && (
                                    <div>
                                        <span className="text-gray-500">Điểm:</span>
                                        <p className="mt-1 font-medium text-blue-600">{subtask.points} điểm</p>
                                    </div>
                                )}

                                {subtask.estimatedHours > 0 && (
                                    <div>
                                        <span className="text-gray-500">Giờ ước tính:</span>
                                        <p className="mt-1 font-medium">{subtask.estimatedHours}h</p>
                                    </div>
                                )}
                            </div>

                            {/* Platforms */}
                            {subtask.platforms && subtask.platforms.length > 0 && (
                                <div>
                                    <span className="text-sm text-gray-500">Nền tảng:</span>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {subtask.platforms.map((platform, idx) => (
                                            <span key={idx} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                                                {platform}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Dates */}
                            <div className="flex gap-4 text-xs text-gray-500">
                                {subtask.plannedStartAt && (
                                    <div>
                                        <span>Bắt đầu:</span> {new Date(subtask.plannedStartAt).toLocaleDateString('vi-VN')}
                                    </div>
                                )}
                                {subtask.plannedDueAt && (
                                    <div>
                                        <span>Hạn:</span> {new Date(subtask.plannedDueAt).toLocaleDateString('vi-VN')}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
