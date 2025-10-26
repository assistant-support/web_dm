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
import { useAsyncNotifier } from '@/hooks/loading.hook';
import Button from '@/components/ui/button';

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
    const { run, Overlays } = useAsyncNotifier();
    const [managedTeams, setManagedTeams] = useState([]);
    const [loadingTeams, setLoadingTeams] = useState(true);

    const form = useForm({
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

        const result = await run(
            async () => await createProject(projectData),
            {
                loadingMessage: 'Đang tạo dự án...',
                successMessage: 'Tạo dự án thành công',
                errorMessage: 'Tạo dự án thất bại',
                notify: 'success'
            }
        );

        if (result?.ok !== true) {
            if (result?.issues) {
                Object.entries(result.issues).forEach(([field, message]) => {
                    form.setError(field, { type: 'manual', message });
                });
            }
            return;
        }

        form.reset();
        onSuccess?.(result.data);
        onClose();
    };

    const handleClose = () => {
        if (!form.formState.isSubmitting) {
            form.reset();
            onClose();
        }
    };

    return (
        <>
            <Overlays />
            <DialogComponent 
                open={open} 
                onOpenChange={handleClose}
                title="Tạo dự án mới"
                description="Điền thông tin để tạo dự án mới"
                size="2xl"
            >
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    {/* Basic Information - 2 columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input
                                label="Tên dự án"
                                required
                                placeholder="Nhập tên dự án"
                                error={form.formState.errors.name?.message}
                                {...form.register('name')}
                            />
                        </div>

                        <Input
                            label="Mã dự án"
                            placeholder="VD: PROJ-001"
                            error={form.formState.errors.code?.message}
                            {...form.register('code')}
                        />

                        <Select
                            label="Nhóm làm việc"
                            disabled={loadingTeams}
                            error={form.formState.errors.team?.message}
                            {...form.register('team')}
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
                                error={form.formState.errors.description?.message}
                                {...form.register('description')}
                            />
                        </div>
                    </div>

                    {/* Schedule & Priority - 2 columns */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            type="date"
                            label="Ngày bắt đầu"
                            error={form.formState.errors.startDate?.message}
                            {...form.register('startDate')}
                        />

                        <Input
                            type="date"
                            label="Ngày kết thúc"
                            error={form.formState.errors.dueDate?.message}
                            {...form.register('dueDate')}
                        />

                        <Select
                            label="Độ ưu tiên"
                            error={form.formState.errors.priority?.message}
                            {...form.register('priority')}
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
                        error={form.formState.errors.tags?.message}
                        {...form.register('tags')}
                    />

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            onClick={handleClose}
                            variant="secondary"
                            disabled={form.formState.isSubmitting}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.formState.isSubmitting || !form.watch('name')?.trim()}
                        >
                            Tạo dự án
                        </Button>
                    </div>
                </form>
            </DialogComponent>
        </>
    );
}
