// components/team/AddMemberDialog.client.js
// Mục đích: Dialog thêm member mới vào team với user search
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import DialogComponent from '@/components/ui/dialog/index.js';
import { Select } from '@/components/ui/input';
import UserSearchSelect from '@/components/ui/UserSearchSelect.client.js';
import { addMemberAction } from '@/data/team/actions/server.js';
import { useAsyncNotifier } from '@/hooks/loading.hook';

const addMemberSchema = z.object({
    userId: z.string().min(1, 'Vui lòng chọn người dùng'),
    role: z.enum(['manager', 'member'], { required_error: 'Role là bắt buộc' }),
});

export default function AddMemberDialog({ teamId, existingMemberIds = [], isOpen, onClose }) {
    const router = useRouter();
    const { run, Overlays, openNoti } = useAsyncNotifier();
    const [serverError, setServerError] = useState(null);

    const form = useForm({
        resolver: zodResolver(addMemberSchema),
        defaultValues: {
            userId: '',
            role: 'member',
        },
    });

    const onSubmit = async (data) => {
        setServerError(null);
        const result = await run(
            async () => await addMemberAction(teamId, data),
            {
                loadingMessage: 'Đang thêm thành viên...',
                notify: 'none', 
            }
        );

        if (result?.ok) {
            openNoti({
                status: 'success',
                message: 'Đã thêm thành viên thành công!',
            });
            form.reset();
            router.refresh();
            onClose();
        } else {
            setServerError(result.message || 'Đã có lỗi xảy ra.');
        }
    };

    const handleClose = () => {
        if (!form.formState.isSubmitting) {
            form.reset();
            setServerError(null); 
            onClose();
        }
    };

    return (
        <>
            <Overlays />
            <DialogComponent
                open={isOpen}
                onOpenChange={(open) => !open && handleClose()}
                title="Thêm thành viên"
                description="Chỉ có thể thêm người dùng đã đăng nhập vào hệ thống ít nhất 1 lần"
                size="sm"
                footer={
                    <>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={form.formState.isSubmitting}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2 disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            onClick={form.handleSubmit(onSubmit)}
                            disabled={form.formState.isSubmitting || !form.watch('userId')}
                            className="rounded-md bg-[var(--brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2 disabled:opacity-50"
                        >
                            Thêm
                        </button>
                    </>
                }
            >
                <form className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Người dùng <span className="text-red-500">*</span>
                        </label>
                        <Controller
                            name="userId"
                            control={form.control}
                            render={({ field }) => (
                                <UserSearchSelect
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Tìm theo tên hoặc email..."
                                    excludeUserIds={existingMemberIds}
                                />
                            )}
                        />
                        {form.formState.errors.userId && (
                            <p className="mt-1 text-sm text-red-600">
                                {form.formState.errors.userId.message}
                            </p>
                        )}
                    </div>

                    <Select
                        label="Vai trò"
                        required
                        error={form.formState.errors.role?.message}
                        disabled={form.formState.isSubmitting}
                        {...form.register('role')}
                    >
                        <option value="member">Thành viên - Thành viên thông thường</option>
                        <option value="manager">Quản lý - Có thể quản lý team</option>
                    </Select>
                    {serverError && (
                        <div className="rounded-md bg-red-50 p-3">
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
                </form>
            </DialogComponent>
        </>
    );
}