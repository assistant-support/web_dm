// components/project/CreateProjectDialog.client.js
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import DialogComponent from '@/components/ui/dialog';
import { Input, Textarea, Select } from '@/components/ui/input';
import { listManagedTeams } from '@/data/team/actions/server.js';
import { create as createProject } from '@/data/project/actions/server.js';
import { useAsyncNotifier } from '@/hooks/loading.hook';
import Button from '@/components/ui/button';
import { PRIORITY } from '@/model/common/enums.js';
import { tPriority } from '@/lib/i18n';

// Helper to format Date object to 'YYYY-MM-DD' string
const formatDateForInput = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper function to remove Vietnamese diacritics
const removeDiacritics = (str) => {
    return str
        .normalize('NFD') // Decompose combined graphemes into base characters and diacritics
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics range
        .replace(/đ/g, 'd') // Handle specific letter 'đ'
        .replace(/Đ/g, 'D');
};


// --- Default values generation ---
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const defaultStartDate = formatDateForInput(today);
const defaultDueDate = formatDateForInput(tomorrow);
const defaultPriority = PRIORITY.MEDIUM;

// Schema validation using Zod
const projectSchema = z.object({
    name: z.string()
        .trim()
        .min(1, 'Tên dự án là bắt buộc'),
    code: z.string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9]*$/, { message: 'Mã chỉ chứa chữ cái không dấu và số' })
        .min(3, 'Mã dự án phải có ít nhất 3 ký tự')
        .max(10, 'Mã dự án không quá 10 ký tự')
        .optional()
        .or(z.literal('')), // Explicitly allow empty string
    description: z.string().optional(),
    team: z.string().optional(),
    priority: z.nativeEnum(PRIORITY).optional().nullable().default(null),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
    tags: z.string().optional(),
});


const PRIORITIES_OPTIONS = [
    { value: '', label: tPriority('') || 'Không ưu tiên' },
    ...Object.values(PRIORITY).map(value => ({
        value: value,
        label: tPriority(value)
    }))
];

// Function to generate project code from name (Updated)
const generateProjectCode = (name) => {
    if (!name || typeof name !== 'string') return '';
    const nameWithoutDiacritics = removeDiacritics(name);
    const words = nameWithoutDiacritics.trim().split(/\s+/);
    let code = words.map(word => word[0] || '').join('');
    code = code.substring(0, 5);
    if (code.length < 3 && words.length > 0) {
        const firstWord = words[0];
        if (firstWord.length > 1 && code.length < 5) code += firstWord[1];
        if (firstWord.length > 2 && code.length < 5) code += firstWord[2];
        code = code.substring(0, 5);
    }
    if (code.length < 3) {
        const combinedChars = nameWithoutDiacritics.replace(/\s+/g, '').substring(0, 5);
        code = combinedChars.substring(0, Math.max(3, combinedChars.length));
    }
    code = code.replace(/[^A-Z0-9]/gi, '');
    return code.toUpperCase();
};


export default function CreateProjectDialog({ open, onClose, onSuccess, defaultTeamId }) {
    const { run, Overlays, openNoti } = useAsyncNotifier();
    const [managedTeams, setManagedTeams] = useState([]);
    const [loadingTeams, setLoadingTeams] = useState(true);
    const [serverError, setServerError] = useState(null);

    const defaultValues = useMemo(() => ({
        name: '',
        code: '',
        description: '',
        team: defaultTeamId || '',
        priority: defaultPriority,
        startDate: defaultStartDate,
        dueDate: defaultDueDate,
        tags: '',
    }), [defaultTeamId]);

    const form = useForm({
        resolver: zodResolver(projectSchema),
        defaultValues: defaultValues,
        mode: 'onSubmit',
    });

    const watchedName = form.watch('name');

    useEffect(() => {
        const generatedCode = generateProjectCode(watchedName);
        if (generatedCode !== form.getValues('code') && !form.getFieldState('code').isDirty) {
            form.setValue('code', generatedCode, { shouldValidate: false, shouldDirty: false });
        }
    }, [watchedName, form]);

    useEffect(() => {
        if (open) {
            setLoadingTeams(true);
            setServerError(null);
            const loadTeams = async () => {
                try {
                    const result = await listManagedTeams();
                    if (result.ok) {
                        setManagedTeams(result.data || []);
                    } else {
                        console.error('Error loading teams:', result.message);
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
            form.reset({
                ...defaultValues,
                team: defaultTeamId || '',
            });
        }
    }, [open, defaultTeamId, form, defaultValues]);

    const onSubmit = async (data) => {
        setServerError(null);
        const tagsArray = data.tags
            ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
            : [];

        const finalCode = data.code?.trim().toUpperCase() || generateProjectCode(data.name) || undefined;

        const projectData = {
            name: data.name,
            code: finalCode,
            description: data.description?.trim() || undefined,
            priority: data.priority || undefined,
            startDate: data.startDate || undefined,
            dueDate: data.dueDate || undefined,
            tags: tagsArray.length > 0 ? tagsArray : undefined,
            team: (data.team && data.team !== 'independent') ? data.team : undefined,
        };

        const result = await run(
            async () => await createProject(projectData),
            {
                loadingMessage: 'Đang tạo dự án...',
                notify: 'none'
            }
        );

        if (result?.ok) {
            openNoti({ status: 'success', message: 'Tạo dự án thành công' });
            form.reset(defaultValues);
            onSuccess?.(result.data);
            onClose();
        } else {
            if (result?.issues) {
                result.issues.forEach(issue => {
                    const fieldName = Array.isArray(issue.path) ? issue.path.join('.') : (issue.path || 'root');
                    form.setError(fieldName, { type: 'server', message: issue.message });
                });
                setServerError("Vui lòng kiểm tra lại thông tin đã nhập.");
            } else {
                setServerError(result?.message || 'Tạo dự án thất bại. Vui lòng thử lại.');
            }
        }
    };

    const handleClose = useCallback(() => {
        if (!form.formState.isSubmitting) {
            form.reset(defaultValues);
            setServerError(null);
            onClose();
        }
    }, [form, defaultValues, onClose]);

    return (
        <>
            <Overlays />
            <DialogComponent
                open={open}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        handleClose();
                    }
                }}
                title="Tạo dự án mới"
                description="Điền thông tin để tạo dự án mới"
                size="2xl"
            >
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input
                                label="Tên dự án"
                                required
                                placeholder="Nhập tên dự án"
                                error={form.formState.errors.name?.message}
                                {...form.register('name')}
                                disabled={form.formState.isSubmitting}
                            />
                        </div>
                        <Input
                            label="Mã dự án"
                            placeholder="Tự động tạo (3-5 ký tự)"
                            error={form.formState.errors.code?.message}
                            {...form.register('code')}
                            disabled={form.formState.isSubmitting}
                            maxLength={5}
                        />
                        <Select
                            label="Nhóm làm việc"
                            disabled={loadingTeams || form.formState.isSubmitting}
                            error={form.formState.errors.team?.message}
                            {...form.register('team')}
                        >
                            <option value="">-- Dự án độc lập --</option>
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
                                rows={3}
                                error={form.formState.errors.description?.message}
                                {...form.register('description')}
                                disabled={form.formState.isSubmitting}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            type="date"
                            label="Ngày bắt đầu"
                            error={form.formState.errors.startDate?.message}
                            {...form.register('startDate')}
                            disabled={form.formState.isSubmitting}
                        />
                        <Input
                            type="date"
                            label="Ngày kết thúc"
                            error={form.formState.errors.dueDate?.message}
                            {...form.register('dueDate')}
                            disabled={form.formState.isSubmitting}
                        />
                        <Select
                            label="Độ ưu tiên"
                            error={form.formState.errors.priority?.message}
                            {...form.register('priority')}
                            disabled={form.formState.isSubmitting}
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
                        helperText="Nhập các tag cách nhau bởi dấu phẩy (,)"
                        error={form.formState.errors.tags?.message}
                        {...form.register('tags')}
                        disabled={form.formState.isSubmitting}
                    />

                    {serverError && (
                        <div className="rounded-md bg-red-50 p-3 mt-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-red-700">{serverError}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
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
                            isLoading={form.formState.isSubmitting}
                        >
                            Tạo dự án
                        </Button>
                    </div>
                </form>
            </DialogComponent>
        </>
    );
}