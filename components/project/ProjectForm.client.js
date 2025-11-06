// components/project/ProjectForm.client.js
// Mục đích: Form tạo/sửa project với validation

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Input, Textarea, Select } from '@/components/ui/input';
import Form, { FormActions } from '@/components/ui/form';
import { create, update } from '@/data/project/actions/server.js';
import { useAsyncNotifier } from '@/hooks/loading.hook';
import Button from '@/components/ui/button';

const PRIORITIES = [
    { value: '', label: 'Không' },
    { value: 'low', label: 'Thấp' },
    { value: 'medium', label: 'Trung bình' },
    { value: 'high', label: 'Cao' },
    { value: 'urgent', label: 'Khẩn cấp' },
];

/**
 * ProjectForm - Form tạo/cập nhật project
 * @param {Object} props
 * @param {string} props.teamId - ID của team (required cho create)
 * @param {Object} props.project - Project object (optional, cho edit mode)
 * @param {Function} props.onSuccess - Callback khi thành công
 */
export default function ProjectForm({ teamId, project = null, onSuccess }) {
    const router = useRouter();
    const { run, Overlays } = useAsyncNotifier();

    const isEditMode = !!project;

    const form = useForm({
        defaultValues: {
            name: project?.name || '',
            description: project?.description || '',
            priority: project?.priority || '',
            startDate: project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
            dueDate: project?.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : '',
            tags: project?.tags ? project.tags.join(', ') : '',
        },
    });

    const onSubmit = async (data) => {
        // Parse tags từ string thành array
        const tags = data.tags
            ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
            : [];

        const payload = {
            name: data.name.trim(),
            description: data.description?.trim() || '',
            priority: data.priority || undefined,
            startDate: data.startDate || undefined,
            dueDate: data.dueDate || undefined,
            tags,
        };

        const result = await run(
            async () => {
                if (isEditMode) {
                    return await update(project._id, payload);
                } else {
                    return await create({
                        ...payload,
                        team: teamId,
                    });
                }
            },
            {
                loadingMessage: isEditMode ? 'Đang cập nhật dự án...' : 'Đang tạo dự án...',
                successMessage: isEditMode ? 'Cập nhật dự án thành công' : 'Tạo dự án thành công',
                errorMessage: isEditMode ? 'Cập nhật dự án thất bại' : 'Tạo dự án thất bại',
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

        if (onSuccess) {
            onSuccess(result.data);
        } else {
            router.push(`/projects/${result.data._id}`);
            router.refresh();
        }
    };

    return (
        <>
            <Overlays />
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tên Dự án <span className="text-red-500">*</span>
                    </label>
                    <Input 
                        {...form.register('name', { required: 'Tên dự án là bắt buộc' })}
                        placeholder="Nhập tên dự án" 
                    />
                    {form.formState.errors.name && (
                        <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mô tả
                    </label>
                    <Textarea 
                        {...form.register('description')}
                        rows={4} 
                        placeholder="Mô tả dự án..." 
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Độ ưu tiên
                    </label>
                    <Select 
                        {...form.register('priority')}
                        options={PRIORITIES} 
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ngày bắt đầu
                        </label>
                        <Input 
                            {...form.register('startDate')}
                            type="date" 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ngày hết hạn
                        </label>
                        <Input 
                            {...form.register('dueDate')}
                            type="date" 
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thẻ
                    </label>
                    <Input 
                        {...form.register('tags')}
                        placeholder="Các thẻ cách nhau bằng dấu phẩy (VD: thiết kế, frontend, khẩn cấp)" 
                    />
                    <p className="text-sm text-gray-500 mt-1">
                        Phân cách nhiều thẻ bằng dấu phẩy
                    </p>
                </div>

                <FormActions align="right">
                    <Button
                        type="button"
                        onClick={() => router.back()}
                        variant="secondary"
                        disabled={form.formState.isSubmitting}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        disabled={form.formState.isSubmitting || !form.watch('name')?.trim()}
                    >
                        {isEditMode ? 'Cập nhật Dự án' : 'Tạo Dự án'}
                    </Button>
                </FormActions>
            </form>
        </>
    );
}
