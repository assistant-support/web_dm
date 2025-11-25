// components/tasks/EditTaskDialog.client.js
// Dialog edit task hoặc tạo subtask với useAsyncNotifier

'use client';

import { useState, useEffect } from 'react';
import DialogComponent from '@/components/ui/dialog';
import { Input, Textarea, Select } from '@/components/ui/input';
import { useAsyncNotifier } from '@/hooks/loading.hook';
import { updateTask } from '@/data/task/actions/server';
import { assignTask } from '@/data/task/actions/server';
import { createSubtask } from '@/data/task/actions/subtasks.server.js';
import { WORK_TYPES } from '@/data/workTypes/constants';
import { PRIORITY } from '@/model/common/enums.js';

const PRIORITY_OPTIONS = [
    { value: PRIORITY.LOW, label: 'Thấp' },
    { value: PRIORITY.MEDIUM, label: 'Bình thường' },
    { value: PRIORITY.HIGH, label: 'Cao' },
    { value: PRIORITY.URGENT, label: 'Khẩn cấp' },
];

/**
 * EditTaskDialog - Dialog edit task hoặc tạo subtask
 * @param {Object} props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onClose - Close callback
 * @param {Object} props.task - Task data (nếu là edit mode)
 * @param {string} props.parentTaskId - Parent task ID (nếu là create subtask mode)
 * @param {string} props.projectId - Project ID (cho create subtask)
 * @param {Array} props.users - Danh sách users để chọn assignee
 * @param {Function} props.onSuccess - Success callback
 * @param {'edit'|'createSubtask'} props.mode - Edit hoặc create subtask
 */
export default function EditTaskDialog({
    open,
    onClose,
    task = null,
    parentTaskId = null,
    projectId = null,
    users = [],
    allUsersWithDetails = [],
    onSuccess,
    mode = 'edit', // 'edit' or 'createSubtask'
    // caller props
    canManage = false,
    currentUserId = null,
}) {
    

    const { run, Overlays } = useAsyncNotifier();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
    priority: PRIORITY.MEDIUM,
        workType: '',
        assignee: '',
        estimatedHours: '',
        plannedStartAt: '',
        plannedDueAt: '',
        tags: '',
    });

    // Sync form với task data khi dialog mở (edit mode)
    useEffect(() => {
        if (open && mode === 'edit' && task) {
            // Normalize assignee to externalUserId string when task.assignee may be populated as an object
            let assigneeValue = '';
            if (task.assignee) {
                if (typeof task.assignee === 'object') {
                    assigneeValue = task.assignee.externalUserId || task.assignee.id || task.assignee._id || '';
                } else {
                    assigneeValue = task.assignee;
                }
            }

            setFormData({
                title: task.title || '',
                description: task.description || '',
                priority: task.priority || PRIORITY.MEDIUM,
                workType: task.workType || '',
                assignee: assigneeValue || '',
                estimatedHours: task.estimatedHours || '',
                plannedStartAt: task.plannedStartAt ? new Date(task.plannedStartAt).toISOString().slice(0, 16) : '',
                plannedDueAt: task.plannedDueAt ? new Date(task.plannedDueAt).toISOString().slice(0, 16) : '',
                tags: Array.isArray(task.tags) ? task.tags.join(', ') : '',
            });
        } else if (open && mode === 'createSubtask') {
            // Reset form cho subtask mới
            setFormData({
                title: '',
                description: '',
                priority: PRIORITY.MEDIUM,
                workType: '',
                assignee: '',
                estimatedHours: '',
                plannedStartAt: '',
                plannedDueAt: '',
                tags: '',
            });
        }
    }, [open, mode, task]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Determine which user list to show in the assignee picker.
    // For creating subtasks we want to allow selecting any user in the system.
    let assigneeOptions = [];
    if (mode === 'createSubtask' && Array.isArray(allUsersWithDetails) && allUsersWithDetails.length) {
        assigneeOptions = allUsersWithDetails.map(u => ({ value: u.id || u._id || u.value, label: u.label || u.name }));
    } else if (Array.isArray(users)) {
        assigneeOptions = users;
    } else {
        assigneeOptions = [];
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            alert('Tiêu đề không được để trống');
            return;
        }

        const payload = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            priority: formData.priority,
            workType: formData.workType || null,
            assignee: formData.assignee || null,
            estimatedHours: formData.estimatedHours ? Number(formData.estimatedHours) : null,
            plannedStartAt: formData.plannedStartAt || null,
            plannedDueAt: formData.plannedDueAt || null,
            tags: formData.tags
                ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
                : [],
        };

        if (mode === 'edit') {
            // If assignee changed and caller is not a manager, prefer using assignTask first
            // Normalize originalAssignee to string (task.assignee may be populated object)
            let originalAssignee = null;
            if (task?.assignee) {
                if (typeof task.assignee === 'object') {
                    originalAssignee = task.assignee.externalUserId || task.assignee.id || task.assignee._id || null;
                } else {
                    originalAssignee = task.assignee;
                }
            }
            const newAssignee = payload.assignee || null;

            if (originalAssignee !== newAssignee && !canManage) {
                // perform assign via assignTask, then remove assignee from payload to avoid double-handling
                const assignResult = await run(
                    () => assignTask(task._id, newAssignee),
                    {
                        loadingMessage: 'Đang cập nhật người thực hiện...',
                        successMessage: 'Cập nhật người thực hiện thành công',
                        notify: 'all'
                    }
                );

                // If assign failed, abort further update to avoid inconsistent state
                if (!assignResult || assignResult.ok === false) {
                    return; // run() already shows error notification
                }

                delete payload.assignee;
            }

            await run(
                () => updateTask(task._id, payload),
                {
                    loadingMessage: 'Đang cập nhật...',
                    successMessage: 'Cập nhật thành công',
                    notify: 'all',
                    onSuccess: (result) => {
                        onSuccess?.(result.data);
                        onClose();
                    }
                }
            );
        } else {
            // Create subtask
            await run(
                () => createSubtask(projectId, parentTaskId, payload),
                {
                    loadingMessage: 'Đang tạo công việc con...',
                    successMessage: 'Tạo công việc con thành công',
                    notify: 'all',
                    onSuccess: (result) => {
                        onSuccess?.(result.data);
                        onClose();
                    }
                }
            );
        }
    };

    const title = mode === 'edit' ? 'Chỉnh sửa công việc' : 'Tạo công việc con';
    const description = mode === 'edit'
        ? 'Cập nhật thông tin công việc'
        : 'Tạo công việc con cho: ' + (task?.title || '');

    return (
        <>
            <Overlays />
            <DialogComponent
                open={open}
                onOpenChange={(open) => !open && onClose()}
                title={title}
                description={description}
                size="2xl"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left column */}
                        <div className="space-y-4">
                            <Input
                                label="Tiêu đề"
                                required
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                placeholder="Nhập tiêu đề..."
                            />

                            <Textarea
                                label="Mô tả"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Mô tả chi tiết..."
                                rows={4}
                            />

                            <Input
                                label="Tags"
                                value={formData.tags}
                                onChange={(e) => handleChange('tags', e.target.value)}
                                placeholder="Nhập tags, cách nhau bằng dấu phẩy"
                            />
                        </div>

                        {/* Right column */}
                        <div className="space-y-4">
                            <Select
                                label="Loại công việc"
                                value={formData.workType}
                                onChange={(e) => handleChange('workType', e.target.value)}
                            >
                                <option value="">-- Chọn loại công việc --</option>
                                {WORK_TYPES.map(wt => (
                                    <option key={wt.code} value={wt.code}>
                                        {wt.icon} {wt.name}
                                    </option>
                                ))}
                            </Select>

                            <Select
                                label="Độ ưu tiên"
                                value={formData.priority}
                                onChange={(e) => handleChange('priority', e.target.value)}
                            >
                                {PRIORITY_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </Select>

                            <Select
                                label="Người thực hiện"
                                value={formData.assignee}
                                onChange={(e) => handleChange('assignee', e.target.value)}
                            >
                                <option value="">-- Chưa gán --</option>
                                {assigneeOptions.map(u => (
                                    <option key={u.value} value={u.value}>
                                        {u.label}
                                    </option>
                                ))}
                            </Select>

                            <Input
                                label="Thời gian ước tính (giờ)"
                                type="number"
                                min="0"
                                step="0.5"
                                value={formData.estimatedHours}
                                onChange={(e) => handleChange('estimatedHours', e.target.value)}
                            />

                            <Input
                                label="Ngày bắt đầu"
                                type="datetime-local"
                                value={formData.plannedStartAt}
                                onChange={(e) => handleChange('plannedStartAt', e.target.value)}
                            />

                            <Input
                                label="Ngày kết thúc"
                                type="datetime-local"
                                value={formData.plannedDueAt}
                                onChange={(e) => handleChange('plannedDueAt', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Footer actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            {mode === 'edit' ? 'Cập nhật' : 'Tạo công việc con'}
                        </button>
                    </div>
                </form>
            </DialogComponent>
        </>
    );
}
