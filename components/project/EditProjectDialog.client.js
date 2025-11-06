/**
 * @file components/project/EditProjectDialog.client.js
 * @description Client component form to edit a project using Server Actions.
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DialogComponent from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import FormActions from '@/components/ui/FormActions';
import { update as updateProject } from '@/data/project/actions/server';
import { useAsyncNotifier } from '@/hooks/loading.hook';

// Schema validation
const projectSchema = z.object({
    name: z.string().trim().min(1, 'Tên dự án là bắt buộc'),
    description: z.string().optional(),
});

export default function EditProjectDialog({ project, open, onClose, onSuccess }) {
    const router = useRouter();
    const { run, Overlays } = useAsyncNotifier({ enableNoti: false, enableLoading: true });

    const form = useForm({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            name: project?.name || '',
            description: project?.description || '',
        },
    });

    // Reset form when project or dialog state changes
    useEffect(() => {
        if (open && project) {
            form.reset({
                name: project.name || '',
                description: project.description || '',
            });
        }
    }, [open, project, form]);

    const onSubmit = async (data) => {
        await run(async () => {
            const result = await updateProject(project.id, data);
            
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

    if (!project) return null;

    return (
        <>
            <Overlays />
            <DialogComponent
                open={open}
                onOpenChange={onClose}
                title="Chỉnh sửa dự án"
                description="Cập nhật thông tin dự án"
                size="md"
            >
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="Tên dự án"
                        required
                        error={form.formState.errors.name?.message}
                        {...form.register('name')}
                    />

                    <Textarea
                        label="Mô tả"
                        rows={3}
                        error={form.formState.errors.description?.message}
                        {...form.register('description')}
                    />

                    {form.formState.errors.root && (
                        <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
                    )}

                    <FormActions
                        submitLabel="Lưu thay đổi"
                        cancelLabel="Hủy"
                        onCancel={onClose}
                        isSubmitting={form.formState.isSubmitting}
                    />
                </form>
            </DialogComponent>
        </>
    );
}
