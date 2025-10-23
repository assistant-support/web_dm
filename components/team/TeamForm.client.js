// components/team/TeamForm.client.js
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Form, { FormActions } from '@/components/ui/form/index.js';
// THAY ĐỔI: Hợp nhất các import vào file 'form-elements'
import { Input, Textarea } from '@/components/ui/input';
import { create, update } from '@/data/team/actions/server.js';
import { useAsyncNotifier } from '@/hooks/loading.hook';
import Button from '@/components/ui/button';

// Validation schema
const teamSchema = z.object({
    name: z.string()
        .min(1, 'Tên nhóm là bắt buộc')
        .max(100, 'Tên nhóm không được quá 100 ký tự')
        .trim(),
    description: z.string()
        .max(500, 'Mô tả không được quá 500 ký tự')
        .optional()
        .or(z.literal('')),
});

/**
 * TeamForm Component
 * @param {Object} props
 * @param {Object} props.initialData - Dữ liệu khởi tạo (cho edit mode)
 * @param {'create'|'edit'} props.mode - Chế độ form
 * @param {string} props.teamId - Team ID (cho edit mode)
 * @param {Function} props.onSuccess - Callback khi thành công
 */
export default function TeamForm({
    initialData,
    mode = 'create',
    teamId,
    onSuccess
}) {
    const { run, Overlays } = useAsyncNotifier();

    const form = useForm({
        resolver: zodResolver(teamSchema),
        defaultValues: initialData || {
            name: '',
            description: '',
        },
    });

    const onSubmit = async (data) => {
        const result = await run(
            async () => {
                if (mode === 'create') {
                    return await create(data);
                } else {
                    return await update(teamId, data);
                }
            },
            {
                loadingMessage: mode === 'create' ? 'Đang tạo nhóm...' : 'Đang cập nhật...',
                successMessage: mode === 'create' ? 'Tạo nhóm thành công!' : 'Cập nhật nhóm thành công!',
                errorMessage: mode === 'create' ? 'Không thể tạo nhóm' : 'Không thể cập nhật nhóm',
                notify: 'all',
                onSuccess: (result) => {
                    if (onSuccess) {
                        onSuccess(result.data);
                    }
                },
            }
        );

        // Reset form if create mode and success
        if (mode === 'create' && result.ok) {
            form.reset();
        }
    };

    return (
        <>
            <Overlays />
            <Form onSubmit={form.handleSubmit(onSubmit)}>
                <Input
                    label="Tên nhóm"
                    placeholder="Nhập tên nhóm..."
                    required
                    error={form.formState.errors.name?.message}
                    {...form.register('name')}
                />

                <Textarea
                    label="Mô tả"
                    placeholder="Mô tả về nhóm của bạn..."
                    rows={4}
                    error={form.formState.errors.description?.message}
                    {...form.register('description')}
                />

                <FormActions>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={form.formState.isSubmitting}
                    >
                        {mode === 'create' ? 'Tạo nhóm' : 'Cập nhật'}
                    </Button>
                </FormActions>
            </Form>
        </>
    );
}