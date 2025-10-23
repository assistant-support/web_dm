// components/project/CreateProjectDialog.client.js
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DialogComponent from '@/components/ui/dialog';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { listManagedTeams } from '@/data/team/actions/server.js';
import { create as createProject } from '@/data/project/actions/server.js';

const projectSchema = z.object({
    name: z.string().min(1, 'Tên dự án là bắt buộc'),
    code: z.string().optional(),
    description: z.string().optional(),
    team: z.string().optional(),
    priority: z.enum(['', 'low', 'medium', 'high', 'urgent']).optional(),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
    tags: z.string().optional(),
});

const PRIORITIES = [
    { value: '', label: 'Không ưu tiên' },
    { value: 'low', label: '🟢 Thấp' },
    { value: 'medium', label: '🟡 Trung bình' },
    { value: 'high', label: '🟠 Cao' },
    { value: 'urgent', label: '🔴 Khẩn cấp' },
];

export default function CreateProjectDialog({ open, onClose, onSuccess, defaultTeamId }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);
    const [managedTeams, setManagedTeams] = useState([]);
    const [loadingTeams, setLoadingTeams] = useState(true);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            name: '',
            code: '',
            description: '',
            team: defaultTeamId || '',
            priority: '',
            startDate: '',
            dueDate: '',
            tags: '',
        },
    });

    // Load managed teams
    useEffect(() => {
        if (open) {
            const loadTeams = async () => {
                try {
                    const result = await listManagedTeams();
                    if (result.ok) {
                        setManagedTeams(result.data);
                    }
                } catch (error) {
                    console.error('Error loading teams:', error);
                } finally {
                    setLoadingTeams(false);
                }
            };
            loadTeams();
        }
    }, [open]);

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        setServerError(null);

        try {
            // Parse tags
            const tags = data.tags
                ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
                : [];

            // Prepare project data
            const projectData = {
                name: data.name.trim(),
                code: data.code?.trim() || '',
                description: data.description?.trim() || '',
                priority: data.priority || undefined,
                startDate: data.startDate || undefined,
                dueDate: data.dueDate || undefined,
                tags: tags.length > 0 ? tags : undefined,
            };

            // Add team if selected and not "independent"
            if (data.team && data.team !== 'independent') {
                projectData.team = data.team;
            }

            const result = await createProject(projectData);

            if (result.ok) {
                reset();
                onSuccess?.(result.data);
                onClose();
            } else {
                setServerError(result.message || 'Có lỗi xảy ra khi tạo dự án');
            }
        } catch (error) {
            console.error('Create project error:', error);
            setServerError('Có lỗi xảy ra khi tạo dự án');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            reset();
            setServerError(null);
            onClose();
        }
    };

    return (
        <DialogComponent 
            open={open} 
            onOpenChange={handleClose}
            title="Tạo dự án mới"
            description="Điền thông tin để tạo dự án mới"
            size="2xl"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Error Message */}
                {serverError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                        <p className="text-sm text-red-800">{serverError}</p>
                    </div>
                )}

                {/* Basic Information - 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            label="Tên dự án"
                            required
                            placeholder="Nhập tên dự án"
                            error={errors.name?.message}
                            {...register('name')}
                        />
                    </div>

                    <Input
                        label="Mã dự án"
                        placeholder="VD: PROJ-001"
                        error={errors.code?.message}
                        {...register('code')}
                    />

                    <Select
                        label="Nhóm làm việc"
                        disabled={loadingTeams}
                        error={errors.team?.message}
                        {...register('team')}
                    >
                        <option value="">Dự án độc lập</option>
                        {managedTeams.map(team => (
                            <option key={team._id} value={team._id}>
                                {team.name}
                            </option>
                        ))}
                    </Select>

                    <div className="md:col-span-2">
                        <Textarea
                            label="Mô tả"
                            placeholder="Mô tả chi tiết về dự án..."
                            error={errors.description?.message}
                            {...register('description')}
                        />
                    </div>
                </div>

                {/* Schedule & Priority - 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        type="date"
                        label="Ngày bắt đầu"
                        error={errors.startDate?.message}
                        {...register('startDate')}
                    />

                    <Input
                        type="date"
                        label="Ngày kết thúc"
                        error={errors.dueDate?.message}
                        {...register('dueDate')}
                    />

                    <Select
                        label="Độ ưu tiên"
                        error={errors.priority?.message}
                        {...register('priority')}
                    >
                        {PRIORITIES.map(priority => (
                            <option key={priority.value} value={priority.value}>
                                {priority.label}
                            </option>
                        ))}
                    </Select>
                </div>

                {/* Tags */}
                <Input
                    label="Tags"
                    placeholder="frontend, backend, mobile..."
                    helperText="Nhập các tag cách nhau bởi dấu phẩy"
                    error={errors.tags?.message}
                    {...register('tags')}
                />

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--brand-600)] rounded-lg hover:bg-[var(--brand-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Đang tạo...' : 'Tạo dự án'}
                    </button>
                </div>
            </form>
        </DialogComponent>
    );
}
