// components/team/AddMemberDialog.client.js
// Mục đích: Dialog thêm member mới vào team với user search (Updated to match Project style)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, User, X, AlertCircle } from 'lucide-react';
import DialogComponent from '@/components/ui/dialog/index.js';
import { Select } from '@/components/ui/input';
import { addMemberAction } from '@/data/team/actions/server.js';
import { listForPicker } from '@/data/appUser/actions.js';
import { useAsyncNotifier } from '@/hooks/loading.hook';
import Image from 'next/image';

const addMemberSchema = z.object({
    userId: z.string().min(1, 'Vui lòng chọn người dùng'),
    role: z.enum(['manager', 'member'], { required_error: 'Role là bắt buộc' }),
});

export default function AddMemberDialog({ teamId, existingMemberIds = [], isOpen, onClose }) {
    const router = useRouter();
    const { run, Overlays, openNoti } = useAsyncNotifier();
    const [serverError, setServerError] = useState(null);
    
    // Data state
    const [fetchedUsers, setFetchedUsers] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const form = useForm({
        resolver: zodResolver(addMemberSchema),
        defaultValues: {
            userId: '',
            role: 'member',
        },
    });

    const selectedUserId = form.watch('userId');

    // Load users when dialog opens
    useEffect(() => {
        if (isOpen) {
            setLoadingData(true);
            const loadData = async () => {
                try {
                    const result = await listForPicker();
                    if (result.ok) {
                        setFetchedUsers(result.data.items || []);
                    }
                } catch (err) {
                    console.error('Error loading users:', err);
                } finally {
                    setLoadingData(false);
                }
            };
            loadData();
            
            // Reset form
            form.reset({
                userId: '',
                role: 'member',
            });
            setServerError(null);
            setSearchQuery('');
        }
    }, [isOpen, form]);

    // Filter users: Not in existingMemberIds and matches search
    const availableUsers = fetchedUsers.filter(u => !existingMemberIds.includes(u.value));
    const filteredUsers = availableUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const selectedUserObj = availableUsers.find(u => u.value === selectedUserId);

    const handleSelectUser = (userId) => {
        form.setValue('userId', userId, { shouldValidate: true });
        setIsDropdownOpen(false);
        setSearchQuery('');
    };

    const handleClearSelection = () => {
        form.setValue('userId', '', { shouldValidate: true });
    };

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
                    {/* User Selection */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                            Thành viên <span className="text-red-500">*</span>
                        </label>
                        
                        {!selectedUserId ? (
                            <div className="relative">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setIsDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        placeholder="Tìm theo tên hoặc email..."
                                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        disabled={loadingData}
                                    />
                                </div>

                                {isDropdownOpen && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-10" 
                                            onClick={() => setIsDropdownOpen(false)} 
                                        />
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
                                            {loadingData ? (
                                                <div className="p-4 text-center text-sm text-gray-500">
                                                    Đang tải danh sách...
                                                </div>
                                            ) : filteredUsers.length > 0 ? (
                                                <div className="py-1">
                                                    {filteredUsers.map((user) => (
                                                        <button
                                                            key={user.value}
                                                            type="button"
                                                            onClick={() => handleSelectUser(user.value)}
                                                            className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                                                        >
                                                            {user.image ? (
                                                                <Image
                                                                    src={user.image}
                                                                    alt={user.name}
                                                                    width={32}
                                                                    height={32}
                                                                    className="rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                                                    <User className="h-4 w-4 text-gray-500" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {user.name}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {user.email}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-4 text-center text-sm text-gray-500">
                                                    Không tìm thấy kết quả
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    {selectedUserObj?.image ? (
                                        <Image
                                            src={selectedUserObj.image}
                                            alt={selectedUserObj.name}
                                            width={32}
                                            height={32}
                                            className="rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                            <User className="h-4 w-4 text-blue-600" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {selectedUserObj?.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {selectedUserObj?.email}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClearSelection}
                                    className="p-1 hover:bg-blue-100 rounded-full text-blue-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        {form.formState.errors.userId && (
                            <p className="text-sm text-red-600 mt-1">
                                {form.formState.errors.userId.message}
                            </p>
                        )}
                    </div>

                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vai trò <span className="text-red-500">*</span>
                        </label>
                        <Select
                            {...form.register('role')}
                            className="w-full"
                        >
                            <option value="member">Thành viên</option>
                            <option value="manager">Quản lý</option>
                        </Select>
                        {form.formState.errors.role && (
                            <p className="text-sm text-red-600 mt-1">
                                {form.formState.errors.role.message}
                            </p>
                        )}
                    </div>

                    {serverError && (
                        <div className="rounded-md bg-red-50 p-3">
                            <div className="flex">
                                <AlertCircle className="h-5 w-5 text-red-400" />
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">
                                        Lỗi
                                    </h3>
                                    <div className="mt-2 text-sm text-red-700">
                                        {serverError}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </DialogComponent>
        </>
    );
}