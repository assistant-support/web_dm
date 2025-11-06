// components/team/EditTeamDialog.client.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X } from 'lucide-react';
import DialogComponent from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { update as updateTeam } from '@/data/team/actions/server.js';
import { useAsyncNotifier } from '@/hooks/loading.hook';

/**
 * EditTeamDialog - Popup chỉnh sửa thông tin team
 * @param {Object} props
 * @param {Object} props.team - Team data
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Toggle dialog callback (receives boolean)
 */
export default function EditTeamDialog({ team, open, onOpenChange }) {
    const router = useRouter();
    const { run, Overlays } = useAsyncNotifier({
        defaultAutoCloseMsSuccess: 2000,
    });

    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    const [errors, setErrors] = useState({});

    // Sync form data với team prop khi dialog mở
    useEffect(() => {
        if (open && team) {
            setFormData({
                name: team.name || '',
                description: team.description || '',
            });
            setErrors({});
        }
    }, [open, team]);

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
            newErrors.name = 'Tên team phải có ít nhất 2 ký tự';
        }
        
        if (formData.name && formData.name.trim().length > 100) {
            newErrors.name = 'Tên team không được vượt quá 100 ký tự';
        }

        if (formData.description && formData.description.trim().length > 500) {
            newErrors.description = 'Mô tả không được vượt quá 500 ký tự';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        const result = await run(
            async () => await updateTeam(team._id, {
                name: formData.name.trim(),
                description: formData.description?.trim() || '',
            }),
            {
                loadingMessage: 'Đang cập nhật team...',
                successMessage: 'Đã cập nhật team thành công!',
                errorMessage: 'Không thể cập nhật team',
                notify: 'success', // Chỉ notify khi thành công
            }
        );

        // Xử lý lỗi từ server
        if (!result.ok) {
            const newErrors = {};
            
            // Map server validation errors vào form fields
            if (result.issues && Array.isArray(result.issues)) {
                result.issues.forEach((issue) => {
                    const fieldName = issue.path || issue.field;
                    if (fieldName && (fieldName === 'name' || fieldName === 'description')) {
                        newErrors[fieldName] = issue.message;
                    }
                });
            }
            
            // Nếu không có field-specific errors, hiển thị general error
            if (Object.keys(newErrors).length === 0) {
                newErrors.general = result.message || 'Đã xảy ra lỗi, vui lòng thử lại';
            }
            
            setErrors(newErrors);
            return; // Không đóng popup
        }

        // Success case
        router.refresh();
        onOpenChange(false);
    };

    const handleClose = () => {
        setErrors({});
        onOpenChange(false);
    };

    return (
        <>
            <Overlays />
            <DialogComponent
                open={open}
                onOpenChange={(isOpen) => !isOpen && handleClose()}
                title="Chỉnh sửa team"
                description="Cập nhật thông tin team của bạn"
                size="md"
            >
                <div className="space-y-6">
                    {/* Team Name */}
                    <div>
                        <Input
                            label="Tên team"
                            placeholder="Nhập tên team..."
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            error={errors.name}
                            required
                            autoFocus
                        />
                        {!errors.name && (
                            <p className="mt-1 text-xs text-gray-500">
                                {formData.name.length}/100 ký tự
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <Textarea
                            label="Mô tả"
                            placeholder="Mô tả về team..."
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            error={errors.description}
                            rows={4}
                        />
                        {!errors.description && (
                            <p className="mt-1 text-xs text-gray-500">
                                {formData.description.length}/500 ký tự
                            </p>
                        )}
                    </div>

                    {/* Hiển thị lỗi tổng quát từ server */}
                    {errors.general && (
                        <div className="rounded-md bg-red-50 p-4 border border-red-200">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">
                                        Lỗi
                                    </h3>
                                    <div className="mt-1 text-sm text-red-700">
                                        {errors.general}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2"
                        >
                            <X className="h-4 w-4" />
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!formData.name.trim()}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--brand-600)] rounded-lg hover:bg-[var(--brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="h-4 w-4" />
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            </DialogComponent>
        </>
    );
}
