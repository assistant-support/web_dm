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
        .refine((val) => val.trim().length >= 2, {
            message: 'Tên nhóm phải có ít nhất 2 ký tự',
        })
        .refine((val) => val.trim().length <= 100, {
            message: 'Tên nhóm không được quá 100 ký tự',
        }),
    description: z.string()
        .refine((val) => !val || val.length <= 500, {
            message: 'Mô tả không được quá 500 ký tự',
        })
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
 * @param {Function} props.onCancel - Callback khi hủy
 */
export default function TeamForm({
    initialData,
    mode = 'create',
    teamId,
    onSuccess,
    onCancel
}) {
    // Tắt notification overlay khi trong dialog, chỉ hiển thị loading
    const { run, Overlays } = useAsyncNotifier({
        enableNoti: false, // Tắt notification, chỉ dùng form errors
        enableLoading: true, // Giữ loading overlay
    });

    const form = useForm({
        resolver: zodResolver(teamSchema),
        mode: 'onSubmit', // Validate on submit
        reValidateMode: 'onChange', // Re-validate on change after first submit
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
                notify: 'none', // Không dùng notify, hiển thị errors trong form
            }
        );

        // Xử lý kết quả
        if (result?.ok !== true) {
            // Hiển thị validation errors trong form
            if (result?.issues && Array.isArray(result.issues)) {
                result.issues.forEach((issue) => {
                    const fieldName = issue.path || issue.field;
                    if (fieldName) {
                        form.setError(fieldName, {
                            type: 'server',
                            message: issue.message,
                        });
                    }
                });
            }
            
            // Hiển thị general error nếu không có specific field errors
            if (!result?.issues || result.issues.length === 0) {
                form.setError('root.serverError', {
                    type: 'server',
                    message: result?.message || 'Đã xảy ra lỗi, vui lòng thử lại',
                });
            }
            
            return; // Không đóng dialog
        }

        // Success case
        if (onSuccess) {
            onSuccess(result.data);
        }

        // Reset form if create mode and success
        if (mode === 'create') {
            form.reset();
        }
    };
    
    return (
        <>
            <Overlays />
            <Form onSubmit={form.handleSubmit(onSubmit)}>
                <Input
                    {...form.register('name')}
                    label="Tên nhóm"
                    placeholder="Nhập tên nhóm..."
                    required
                    error={form.formState.errors.name?.message}
                />

                <Textarea
                    {...form.register('description')}
                    label="Mô tả"
                    placeholder="Mô tả về nhóm của bạn..."
                    rows={4}
                    error={form.formState.errors.description?.message}
                />

                {/* Hiển thị lỗi tổng quát từ server */}
                {form.formState.errors.root?.serverError && (
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
                                    {form.formState.errors.root.serverError.message}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <FormActions>
                    {onCancel && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onCancel}
                        >
                            <p className='text-sm'>Hủy</p>
                        </Button>
                    )}
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={
                            form.formState.isSubmitting || 
                            !form.watch('name') || 
                            form.watch('name').trim().length < 2
                        }
                    >
                        <p className='text-sm'>{mode === 'create' ? 'Tạo nhóm' : 'Cập nhật'}</p>
                    </Button>
                </FormActions>
            </Form>
        </>
    );
}