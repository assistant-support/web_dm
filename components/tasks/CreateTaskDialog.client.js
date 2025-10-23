// components/tasks/CreateTaskDialog.client.js
// Mục đích: Dialog tạo task đầy đủ với workflow phê duyệt

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DialogComponent from '@/components/ui/dialog';
import { Input, Textarea, Select, Checkbox } from '@/components/ui/input';
import { createTask } from '@/data/task/actions/server';
import { Loader2, Info } from 'lucide-react';

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Thấp' },
    { value: 'normal', label: 'Bình thường' },
    { value: 'high', label: 'Cao' },
    { value: 'urgent', label: 'Khẩn cấp' },
];

/**
 * CreateTaskDialog - Dialog tạo task đầy đủ
 * 
 * WORKFLOW:
 * 1. Manager tạo task:
 *    - Có thể gán cho bản thân hoặc nhân viên
 *    - Nếu gán cho nhân viên → requiresAssigneeConfirm = true
 *    - Có thể set điểm initialPoints
 *    - Status mặc định: draft hoặc waiting_assignee_confirm
 * 
 * 2. Nhân viên tạo task:
 *    - Task luôn ở trạng thái pending_approval
 *    - Cần manager duyệt mới được tiếp tục
 *    - Không thể set điểm
 * 
 * @param {Object} props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onClose - Close callback
 * @param {string} props.projectId - Project ID
 * @param {Array} props.projectMembers - Danh sách members của project
 * @param {Array} props.users - Danh sách tất cả users (để hiển thị tên)
 * @param {boolean} props.canManage - User có quyền manage project không
 * @param {string} props.currentUserId - External user ID của user hiện tại
 * @param {Function} props.onSuccess - Success callback
 */
export default function CreateTaskDialog({ 
    open, 
    onClose, 
    projectId,
    projectMembers = [],
    users = [],
    canManage = false,
    currentUserId = '',
    onSuccess 
}) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    // Lọc users thuộc project từ projectMembers
    const projectUserOptions = projectMembers
        .map(member => {
            const user = users.find(u => u.value === member.userId);
            return user ? { value: user.value, label: user.label } : null;
        })
        .filter(Boolean);
    
    // Nếu là member (không phải manager), chỉ cho phép giao cho bản thân
    const assigneeOptions = canManage ? projectUserOptions : projectUserOptions.filter(u => u.value === currentUserId);
    
    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'normal',
        assignee: canManage ? '' : currentUserId, // Nhân viên mặc định giao cho bản thân
        requiresAssigneeConfirm: false, // Manager gán cho nhân viên → cần confirm
        plannedStartAt: '',
        plannedDueAt: '',
        tags: '',
        initialPoints: 0, // Điểm dự kiến (chỉ manager set được)
        autoBypassForSubtask: false, // Auto-complete khi subtasks xong
    });

    const handleChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            
            // Nếu manager gán cho người khác (không phải bản thân)
            if (field === 'assignee' && canManage) {
                updated.requiresAssigneeConfirm = value && value !== currentUserId;
            }
            
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim()) {
            setError('Tiêu đề task là bắt buộc');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // Xác định status và approval
            let status = 'draft';
            let approvalRequired = false;
            let assigneeConfirmRequired = false;

            if (!canManage) {
                // Nhân viên tạo task → cần manager duyệt
                status = 'pending_approval';
                approvalRequired = true;
            } else {
                // Manager tạo task
                if (formData.assignee && formData.assignee !== currentUserId) {
                    // Gán cho người khác → cần người đó confirm
                    status = 'waiting_confirm';
                    assigneeConfirmRequired = true;
                } else {
                    // Tự làm hoặc không gán → draft
                    status = 'draft';
                }
            }

            const payload = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                priority: formData.priority,
                assignee: formData.assignee || null,
                plannedStartAt: formData.plannedStartAt || null,
                plannedDueAt: formData.plannedDueAt || null,
                tags: formData.tags 
                    ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) 
                    : [],
                status,
                approval: {
                    required: approvalRequired,
                    status: approvalRequired ? 'pending' : 'none',
                },
                assigneeConfirm: {
                    required: assigneeConfirmRequired,
                },
                initialPoints: canManage ? (Number(formData.initialPoints) || 0) : 0,
                autoBypassForSubtask: formData.autoBypassForSubtask,
            };

            const result = await createTask(projectId, payload);

            if (!result.ok) {
                setError(result.message || 'Không thể tạo task');
                return;
            }

            // Reset form
            setFormData({
                title: '',
                description: '',
                priority: 'normal',
                assignee: '',
                requiresAssigneeConfirm: false,
                plannedStartAt: '',
                plannedDueAt: '',
                tags: '',
                initialPoints: 0,
                autoBypassForSubtask: false,
            });

            if (onSuccess) {
                onSuccess(result.data);
            } else {
                router.refresh();
            }
            
            onClose();
        } catch (err) {
            console.error('Create task error:', err);
            setError(err.message || 'Có lỗi không mong muốn xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Check if assigning to someone else
    const isAssigningToOthers = formData.assignee && formData.assignee !== currentUserId;

    return (
        <DialogComponent
            open={open}
            onOpenChange={(open) => !open && onClose()}
            title="Tạo nhiệm vụ mới"
            description={canManage 
                ? "Tạo task cho bản thân hoặc gán cho thành viên trong dự án"
                : "Task của bạn sẽ được gửi đến quản lý để phê duyệt"}
            size="2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error message */}
                {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Info banner cho nhân viên */}
                {!canManage && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex gap-2">
                        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <strong>Lưu ý:</strong> Task của bạn sẽ ở trạng thái "Chờ phê duyệt" và cần quản lý xác nhận trước khi bắt đầu.
                        </div>
                    </div>
                )}

                {/* Info banner khi manager gán cho người khác */}
                {canManage && isAssigningToOthers && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2">
                        <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <strong>Gán cho người khác:</strong> Người được gán cần xác nhận trước khi task bắt đầu tính thời gian.
                        </div>
                    </div>
                )}

                {/* Grid layout - 2 columns on large screens */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Left column */}
                    <div className="space-y-5">
                        {/* Title - Full width */}
                        <div className="lg:col-span-2">
                            <Input
                                label="Tiêu đề"
                                required
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                placeholder="Nhập tiêu đề nhiệm vụ..."
                                disabled={isSubmitting}
                                className="w-full"
                            />
                        </div>

                        {/* Description */}
                        <Textarea
                            label="Mô tả"
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Mô tả chi tiết nhiệm vụ..."
                            disabled={isSubmitting}
                            rows={4}
                        />

                        {/* Tags */}
                        <Input
                            label="Tags"
                            value={formData.tags}
                            onChange={(e) => handleChange('tags', e.target.value)}
                            placeholder="Nhập tags, cách nhau bằng dấu phẩy"
                            disabled={isSubmitting}
                            helperText="Ví dụ: urgent, design, backend"
                        />
                    </div>

                    {/* Right column */}
                    <div className="space-y-5">
                        {/* Assignee */}
                        <div>
                            <Select
                                label="Người thực hiện"
                                value={formData.assignee}
                                onChange={(e) => handleChange('assignee', e.target.value)}
                                disabled={isSubmitting || !canManage}
                            >
                                {canManage && (
                                    <option value="">Chưa gán (tự làm sau)</option>
                                )}
                                {assigneeOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label} {opt.value === currentUserId ? '(Bản thân)' : ''}
                                    </option>
                                ))}
                            </Select>
                            {!canManage && (
                                <p className="mt-1 text-sm text-gray-500">
                                    Task của bạn sẽ được gán cho bản thân và cần quản lý phê duyệt
                                </p>
                            )}
                            {canManage && formData.assignee && (
                                <p className="mt-1 text-sm text-gray-500">
                                    {isAssigningToOthers 
                                        ? 'Người này sẽ nhận thông báo và cần xác nhận' 
                                        : 'Bạn sẽ tự thực hiện task này'}
                                </p>
                            )}
                        </div>

                        {/* Priority */}
                        <Select
                            label="Độ ưu tiên"
                            value={formData.priority}
                            onChange={(e) => handleChange('priority', e.target.value)}
                            disabled={isSubmitting}
                        >
                            {PRIORITY_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </Select>

                        {/* Điểm dự kiến - Chỉ manager */}
                        {canManage && (
                            <Input
                                label="Điểm dự kiến"
                                type="number"
                                min="0"
                                step="0.5"
                                value={formData.initialPoints}
                                onChange={(e) => handleChange('initialPoints', e.target.value)}
                                placeholder="0"
                                disabled={isSubmitting}
                                helperText="Điểm dự kiến cho task này (có thể điều chỉnh sau)"
                            />
                        )}

                        {/* Planned dates */}
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Ngày bắt đầu"
                                type="date"
                                value={formData.plannedStartAt}
                                onChange={(e) => handleChange('plannedStartAt', e.target.value)}
                                disabled={isSubmitting}
                            />
                            <Input
                                label="Hạn hoàn thành"
                                type="date"
                                value={formData.plannedDueAt}
                                onChange={(e) => handleChange('plannedDueAt', e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Auto-complete subtasks - Chỉ manager */}
                        {canManage && (
                            <Checkbox
                                label="Tự động hoàn thành khi tất cả subtasks xong"
                                checked={formData.autoBypassForSubtask}
                                onChange={(e) => handleChange('autoBypassForSubtask', e.target.checked)}
                                disabled={isSubmitting}
                                helperText="Task cha sẽ tự động chuyển sang hoàn thành khi tất cả subtasks đã hoàn thành"
                            />
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !formData.title.trim()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Đang tạo...' : 'Tạo nhiệm vụ'}
                    </button>
                </div>
            </form>
        </DialogComponent>
    );
}
