'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DialogComponent from '@/components/ui/dialog';
import { Input, Textarea, Select } from '@/components/ui/input';
import FormActions from '@/components/ui/FormActions';
import { PRIORITY } from '@/model/common/enums.js';
import { tPriority } from '@/lib/i18n';
import { create as createProject } from '@/data/project/actions/server';
import { listManagedTeams } from '@/data/team/actions/server';
import { useAsyncNotifier } from '@/hooks/loading.hook';

// Helper to format Date object to 'YYYY-MM-DD' string
const formatDateForInput = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to get today's date in 'YYYY-MM-DD' format
const getTodayString = () => {
    return formatDateForInput(new Date());
};

// Schema validation
const projectSchema = z.object({
    name: z.string().trim().min(1, 'Tên dự án là bắt buộc'),
    description: z.string().optional(),
    team: z.string().optional(),
    priority: z.string().optional(),
    startDate: z.string().optional().refine((val) => {
        if (!val) return true; // Optional field
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(val);
        selectedDate.setHours(0, 0, 0, 0);
        return selectedDate >= today;
    }, {
        message: 'Ngày bắt đầu không được là thời điểm quá khứ'
    }),
    dueDate: z.string().optional().refine((val) => {
        if (!val) return true; // Optional field
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(val);
        selectedDate.setHours(0, 0, 0, 0);
        return selectedDate >= today;
    }, {
        message: 'Ngày kết thúc không được là thời điểm quá khứ'
    }),
    tags: z.string().optional(),
}).refine((data) => {
    // Validate dueDate >= startDate if both are provided
    if (data.startDate && data.dueDate) {
        const start = new Date(data.startDate);
        const due = new Date(data.dueDate);
        start.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        return due >= start;
    }
    return true;
}, {
    message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
    path: ['dueDate']
});

const PRIORITIES_OPTIONS = [
    { value: '', label: 'Không ưu tiên' },
    ...Object.values(PRIORITY).map(value => ({
        value: value,
        label: tPriority(value)
    }))
];

export default function CreateProjectDialog({ open, onClose, onSuccess, defaultTeamId }) {
    const router = useRouter();
    const [managedTeams, setManagedTeams] = useState([]);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const { run, Overlays } = useAsyncNotifier({ enableNoti: false, enableLoading: true });
    const { startDate: defaultStartDate, dueDate: defaultDueDate } = buildDefaultDateInputs();

    const form = useForm({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            name: '',
            description: '',
            team: defaultTeamId || '',
            priority: PRIORITY.MEDIUM,
            startDate: defaultStartDate,
            dueDate: defaultDueDate,
            tags: '',
        },
    });

    // Load managed teams when dialog opens
    useEffect(() => {
        if (open) {
            setLoadingTeams(true);
            const loadTeams = async () => {
                try {
                    const result = await listManagedTeams();
                    if (result.ok) {
                        setManagedTeams(result.data || []);
                    } else {
                        setManagedTeams([]);
                    }
                } catch (error) {
                    console.error('Error loading teams:', error);
                    setManagedTeams([]);
                } finally {
                    setLoadingTeams(false);
                }
            };
            loadTeams();
            
            // Reset form
            const { startDate, dueDate } = buildDefaultDateInputs();
            form.reset({
                name: '',
                description: '',
                team: defaultTeamId || '',
                priority: PRIORITY.MEDIUM,
                startDate,
                dueDate,
                tags: '',
            });
        }
    }, [defaultTeamId, form, open]);

    // Watch selected team to detect archived team selection
    const selectedTeamId = form.watch && form.watch('team');
    const selectedTeam = managedTeams.find(t => String(t.id) === String(selectedTeamId));
    const selectedTeamIsArchived = selectedTeam ? (selectedTeam.isActive === false) : false;

    const onSubmit = async (data) => {
        // Prevent creating under archived team (UI-only guard)
        if (data.team && selectedTeamIsArchived) {
            form.setError('team', { type: 'manual', message: 'Nhóm được chọn đã được lưu trữ — không thể tạo dự án dưới nhóm này' });
            return;
        }

        await run(async () => {
            // Transform data: remove empty strings, parse tags
            const tags = data.tags
                ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
                : [];

            const payload = {
                name: data.name.trim(),
                description: data.description?.trim() || undefined,
                team: data.team || undefined,
                priority: data.priority || undefined,
                startDate: data.startDate || undefined,
                dueDate: data.dueDate || undefined,
                tags: tags.length > 0 ? tags : undefined,
            };

            const result = await createProject(payload);
            
            if (!result.ok) {
                // Set form errors
                if (result.errors) {
                    Object.entries(result.errors).forEach(([field, message]) => {
                        form.setError(field, { type: 'server', message });
                    });
                } else {
                    form.setError('root', { 
                        type: 'server', 
                        message: result.message || 'Có lỗi xảy ra' 
                    });
                }
                return;
            }

            // Success
            if (onSuccess) onSuccess(result.data);
            if (onClose) onClose();
            router.refresh();
        }, 'none');
    };

    return (
        <>
            <Overlays />
            <DialogComponent
                open={open}
                onOpenChange={onClose}
                title="Tạo dự án mới nha"
                description="Tạo một dự án để quản lý công việc"
                size="lg"
            >
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="Tên dự án"
                        required
                        error={form.formState.errors.name?.message}
                        {...form.register('name')}
                    />

                    <Select
                        label="Nhóm làm việc"
                        helperText="Chọn nhóm hoặc để trống nếu dự án độc lập"
                        error={form.formState.errors.team?.message}
                        {...form.register('team')}
                        disabled={loadingTeams}
                    >
                        <option value="">-- Dự án độc lập --</option>
                        {managedTeams.map(team => (
                            <option key={team.id} value={team.id} disabled={team.isActive === false}>
                                {team.name}{team.isActive === false ? ' (Đã lưu trữ)' : ''}
                            </option>
                        ))}
                    </Select>

                    <Textarea
                        label="Mô tả"
                        rows={3}
                        error={form.formState.errors.description?.message}
                        {...form.register('description')}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="Ngày bắt đầu"
                            type="date"
                            min={getTodayString()}
                            error={form.formState.errors.startDate?.message}
                            {...form.register('startDate')}
                        />

                        <Input
                            label="Ngày kết thúc"
                            type="date"
                            min={getTodayString()}
                            error={form.formState.errors.dueDate?.message}
                            {...form.register('dueDate')}
                        />

                        <Select
                            label="Độ ưu tiên"
                            error={form.formState.errors.priority?.message}
                            {...form.register('priority')}
                        >
                            {PRIORITIES_OPTIONS.map(priority => (
                                <option key={priority.value} value={priority.value}>
                                    {priority.label}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <Input
                        label="Tags"
                        placeholder="frontend, backend, mobile..."
                        helperText="Phân cách bằng dấu phẩy"
                        error={form.formState.errors.tags?.message}
                        {...form.register('tags')}
                    />

                    {form.formState.errors.root && (
                        <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
                    )}

                    {selectedTeamIsArchived && (
                        <p className="text-sm text-yellow-800">Nhóm được chọn đã bị lưu trữ — vui lòng chọn nhóm khác hoặc tạo dự án độc lập.</p>
                    )}

                    {selectedTeamIsArchived ? (
                        <div className="flex items-center justify-end gap-3 pt-4">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
                            <button type="button" disabled className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed" title="Nhóm đã lưu trữ — không thể tạo dự án dưới nhóm này">Tạo dự án</button>
                        </div>
                    ) : (
                        <FormActions
                            submitLabel="Tạo dự án"
                            cancelLabel="Hủy"
                            onCancel={onClose}
                            isSubmitting={form.formState.isSubmitting}
                        />
                    )}
                </form>
            </DialogComponent>
        </>
    );
}

function buildDefaultDateInputs() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return {
        startDate: formatDateForInput(today),
        dueDate: formatDateForInput(tomorrow),
    };
}
