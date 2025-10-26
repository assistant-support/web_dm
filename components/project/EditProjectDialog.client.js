// components/project/EditProjectDialog.client.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DialogComponent from '@/components/ui/dialog';
import { Input, Textarea, Select } from '@/components/ui/input';
import { update as updateProject } from '@/data/project/actions/server.js';
import { useAsyncNotifier } from '@/hooks/loading.hook';
import Button from '@/components/ui/button';

const PRIORITIES = [
    { value: '', label: 'Không ưu tiên' },
    { value: 'low', label: '🟢 Thấp' },
    { value: 'medium', label: '🟡 Trung bình' },
    { value: 'high', label: '🟠 Cao' },
    { value: 'urgent', label: '🔴 Khẩn cấp' },
];

/**
 * EditProjectDialog - Popup chỉnh sửa thông tin project
 * @param {Object} props
 * @param {Object} props.project - Project data
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onClose - Close dialog callback
 */
export default function EditProjectDialog({ project, open, onClose }) {
    const router = useRouter();
    const { run, Overlays } = useAsyncNotifier({
        defaultAutoCloseMsSuccess: 2000,
    });

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        priority: '',
        startDate: '',
        dueDate: '',
        tags: '',
    });

    const [errors, setErrors] = useState({});

    // Sync form data với project prop khi dialog mở
    useEffect(() => {
        if (open && project) {
            setFormData({
                name: project.name || '',
                code: project.code || '',
                description: project.description || '',
                priority: project.priority || '',
                startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
                dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : '',
                tags: project.tags ? project.tags.join(', ') : '',
            });
            setErrors({});
        }
    }, [open, project]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
        // Clear error khi user typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: null,
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.name || formData.name.trim().length < 2) {
            newErrors.name = 'Tên dự án phải có ít nhất 2 ký tự';
        }
        
        if (formData.name && formData.name.trim().length > 100) {
            newErrors.name = 'Tên dự án không được vượt quá 100 ký tự';
        }

        if (formData.description && formData.description.trim().length > 1000) {
            newErrors.description = 'Mô tả không được vượt quá 1000 ký tự';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        // Parse tags từ string thành array
        const tags = formData.tags
            ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
            : [];

        const payload = {
            name: formData.name.trim(),
            code: formData.code?.trim() || undefined,
            description: formData.description?.trim() || '',
            priority: formData.priority || undefined,
            startDate: formData.startDate || undefined,
            dueDate: formData.dueDate || undefined,
            tags: tags.length > 0 ? tags : undefined,
        };

        const result = await run(
            async () => await updateProject(project._id, payload),
            {
                loadingMessage: 'Đang cập nhật dự án...',
                successMessage: 'Cập nhật dự án thành công!',
                errorMessage: 'Không thể cập nhật dự án',
                notify: 'success',
            }
        );

        // Xử lý lỗi từ server
        if (!result.ok) {
            const newErrors = {};
            
            if (result.issues) {
                // Map server validation errors vào form fields
                Object.entries(result.issues).forEach(([field, message]) => {
                    newErrors[field] = message;
                });
            }
            
            setErrors(newErrors);
            return;
        }

        // Success - refresh và đóng dialog
        router.refresh();
        onClose();
    };

    return (
        <>
            <Overlays />
            <DialogComponent
                open={open}
                onOpenChange={(isOpen) => !isOpen && onClose()}
                title="Chỉnh sửa dự án"
                description="Cập nhật thông tin dự án"
                size="2xl"
            >
                <div className="space-y-5">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tên dự án <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="Nhập tên dự án"
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mã dự án
                            </label>
                            <Input
                                value={formData.code}
                                onChange={(e) => handleChange('code', e.target.value)}
                                placeholder="VD: PROJ-001"
                            />
                            {errors.code && (
                                <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Độ ưu tiên
                            </label>
                            <Select
                                value={formData.priority}
                                onChange={(e) => handleChange('priority', e.target.value)}
                            >
                                {PRIORITIES.map(priority => (
                                    <option key={priority.value} value={priority.value}>
                                        {priority.label}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mô tả
                            </label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                rows={4}
                                placeholder="Mô tả dự án..."
                            />
                            {errors.description && (
                                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                            )}
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ngày bắt đầu
                            </label>
                            <Input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => handleChange('startDate', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ngày hết hạn
                            </label>
                            <Input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => handleChange('dueDate', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Thẻ
                        </label>
                        <Input
                            value={formData.tags}
                            onChange={(e) => handleChange('tags', e.target.value)}
                            placeholder="Các thẻ cách nhau bằng dấu phẩy (VD: thiết kế, frontend, khẩn cấp)"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Phân cách nhiều thẻ bằng dấu phẩy
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2 border-t">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="secondary"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!formData.name?.trim()}
                        >
                            Cập nhật
                        </Button>
                    </div>
                </div>
            </DialogComponent>
        </>
    );
}
