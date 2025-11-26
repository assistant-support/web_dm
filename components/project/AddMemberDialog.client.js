/**
 * @file components/project/AddMemberDialog.client.js
 * @description A client component dialog with a form to invite new members using a Server Action.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, AlertTriangle, Search, X, User } from 'lucide-react';
import DialogComponent from '@/components/ui/dialog';
import { Select, Checkbox, Input } from '@/components/ui/input';
import FormActions from '@/components/ui/FormActions';
import { PROJECT_ROLE } from '@/model/common/enums';
import { addMemberAction } from '@/data/project/actions/server';
import { getByIdAction } from '@/data/team/actions/server';
import { listForPicker } from '@/data/appUser/actions';
import { useAsyncNotifier } from '@/hooks/loading.hook';
import Image from 'next/image';

// Schema validation
const memberSchema = z.object({
    userId: z.string().min(1, 'Vui lòng chọn thành viên'),
    role: z.string().min(1, 'Role là bắt buộc'),
    confirmOutsider: z.boolean().optional(),
});

/**
 * AddMemberButton - Wrapper với state để mở dialog
 */
export function AddMemberButton({ projectId, teamId, currentMembers = [], isActive = true }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => isActive && setIsOpen(true)}
                disabled={!isActive}
                className={
                    `inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ` +
                    (isActive
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'text-gray-400 bg-gray-100 cursor-not-allowed')
                }
                title={isActive ? 'Thêm thành viên' : 'Dự án đã lưu trữ — không thể thêm thành viên'}
            >
                <UserPlus className="h-4 w-4" />
                Thêm thành viên
            </button>

            <AddMemberDialog
                projectId={projectId}
                teamId={teamId}
                currentMembers={currentMembers}
                open={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
}

export function AddMemberDialog({ projectId, teamId, currentMembers = [], open, onClose, onSuccess }) {
    const router = useRouter();
    const { run, Overlays } = useAsyncNotifier({ enableNoti: false, enableLoading: true });
    
    // Raw data from server
    const [fetchedUsers, setFetchedUsers] = useState([]);
    const [fetchedTeam, setFetchedTeam] = useState(null);
    
    const [loading, setLoading] = useState(false);
    const [showOutsiders, setShowOutsiders] = useState(false);

    const form = useForm({
        resolver: zodResolver(memberSchema),
        defaultValues: {
            userId: '',
            role: PROJECT_ROLE.MEMBER,
            confirmOutsider: false,
        },
    });

    // Derived state
    const currentMemberIds = currentMembers.map(m => m.userId);
    
    // Filter users who are not already members
    const allAvailableUsers = fetchedUsers.filter(u => !currentMemberIds.includes(u.value));
    
    // Filter users who are in the team
    const teamMemberIds = fetchedTeam?.members?.map(m => m.userId) || [];
    const teamMembers = allAvailableUsers.filter(u => teamMemberIds.includes(u.value));

    const selectedUserId = form.watch('userId');
    const confirmOutsider = form.watch('confirmOutsider');

    // Check if selected user is outside team
    const isOutsider = selectedUserId && teamId && teamMembers.length > 0 && 
        !teamMembers.find(u => u.value === selectedUserId);

    // Load users when dialog opens - Only fetch once per open
    useEffect(() => {
        if (open) {
            setLoading(true);
            setShowOutsiders(false);
            
            const loadData = async () => {
                try {
                    const [teamResult, usersResult] = await Promise.all([
                        teamId ? getByIdAction(teamId) : Promise.resolve(null),
                        listForPicker()
                    ]);

                    if (usersResult?.ok) {
                        setFetchedUsers(usersResult.data.items || []);
                    }

                    if (teamResult?.ok) {
                        setFetchedTeam(teamResult.data);
                    }
                } catch (err) {
                    console.error('Error loading users:', err);
                } finally {
                    setLoading(false);
                }
            };

            loadData();
            
            form.reset({
                userId: '',
                role: PROJECT_ROLE.MEMBER,
                confirmOutsider: false,
            });
        }
    }, [open, teamId, form]); // Removed currentMembers to prevent re-fetching

    const onSubmit = async (data) => {
        // Validate outsider confirmation
        if (isOutsider && !confirmOutsider) {
            form.setError('confirmOutsider', {
                type: 'manual',
                message: 'Bạn phải xác nhận để thêm người ngoài team'
            });
            return;
        }

        await run(async () => {
            const result = await addMemberAction(projectId, data);
            
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

    const hasTeam = !!(teamId && fetchedTeam);
    const displayUsers = showOutsiders ? allAvailableUsers : (hasTeam ? teamMembers : allAvailableUsers);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Filter displayUsers based on search query
    const filteredUsers = displayUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Get selected user object
    const selectedUserObj = displayUsers.find(u => u.value === selectedUserId);

    // Handle user selection
    const handleSelectUser = (userId) => {
        form.setValue('userId', userId, { shouldValidate: true });
        setIsDropdownOpen(false);
        setSearchQuery('');
    };

    // Clear selection
    const handleClearSelection = () => {
        form.setValue('userId', '', { shouldValidate: true });
        form.setValue('confirmOutsider', false);
    };

    return (
        <>
            <Overlays />
            <DialogComponent
                open={open}
                onOpenChange={onClose}
                title="Thêm thành viên"
                description={hasTeam 
                    ? "Chọn thành viên từ team hoặc thêm người ngoài team" 
                    : "Chọn thành viên để thêm vào dự án"
                }
                size="md"
            >
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {loading ? (
                        <p className="text-sm text-gray-500">Đang tải danh sách thành viên...</p>
                    ) : displayUsers.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            {hasTeam && !showOutsiders 
                                ? "Tất cả thành viên team đã có trong dự án." 
                                : "Không còn người dùng nào để thêm."
                            }
                        </p>
                    ) : (
                        <>
                            {/* Toggle for showing outsiders */}
                            {hasTeam && (
                                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <Checkbox
                                        checked={showOutsiders}
                                        onChange={(e) => {
                                            setShowOutsiders(e.target.checked);
                                            if (!e.target.checked) {
                                                form.setValue('userId', '');
                                                form.setValue('confirmOutsider', false);
                                            }
                                        }}
                                    />
                                    <label className="text-sm text-blue-900">
                                        Hiển thị người ngoài team (không được thống kê trong nhóm)
                                    </label>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Thành viên</label>
                                
                                {selectedUserObj ? (
                                    <div className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                                        <div className="flex items-center gap-2">
                                            {selectedUserObj.image ? (
                                                <Image 
                                                    src={selectedUserObj.image} 
                                                    alt={selectedUserObj.name} 
                                                    width={24} 
                                                    height={24} 
                                                    className="rounded-full"
                                                />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <User size={14} className="text-gray-500" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium">{selectedUserObj.name}</p>
                                                <p className="text-xs text-gray-500">{selectedUserObj.email}</p>
                                            </div>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={handleClearSelection}
                                            className="p-1 hover:bg-gray-200 rounded-full text-gray-500"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Input
                                            placeholder="Tìm kiếm theo tên hoặc email..."
                                            leftIcon={<Search size={16} />}
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setIsDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsDropdownOpen(true)}
                                        />
                                        
                                        {isDropdownOpen && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                                {filteredUsers.length > 0 ? (
                                                    filteredUsers.map(user => (
                                                        <div
                                                            key={user.value}
                                                            className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
                                                            onClick={() => handleSelectUser(user.value)}
                                                        >
                                                            {user.image ? (
                                                                <Image 
                                                                    src={user.image} 
                                                                    alt={user.name} 
                                                                    width={24} 
                                                                    height={24} 
                                                                    className="rounded-full"
                                                                />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                                                    <User size={14} className="text-gray-500" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-sm font-medium">{user.name}</p>
                                                                <p className="text-xs text-gray-500">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-3 text-center text-sm text-gray-500">
                                                        Không tìm thấy kết quả
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {form.formState.errors.userId && (
                                    <p className="text-sm text-red-600">{form.formState.errors.userId.message}</p>
                                )}
                            </div>

                            {/* Warning for outsiders */}
                            {isOutsider && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex gap-2">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div className="space-y-2 flex-1">
                                            <p className="text-sm font-medium text-amber-900">
                                                Cảnh báo: Người này không thuộc team
                                            </p>
                                            <p className="text-sm text-amber-700">
                                                Người này sẽ không được tính trong thống kê team và không xuất hiện khi tạo task từ trang team.
                                            </p>
                                            <div className="flex items-start gap-2 mt-2">
                                                <Checkbox
                                                    {...form.register('confirmOutsider')}
                                                />
                                                <label className="text-sm text-amber-900">
                                                    Tôi hiểu và vẫn muốn thêm người này vào dự án
                                                </label>
                                            </div>
                                            {form.formState.errors.confirmOutsider && (
                                                <p className="text-sm text-red-600">
                                                    {form.formState.errors.confirmOutsider.message}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Select
                                label="Vai trò"
                                error={form.formState.errors.role?.message}
                                {...form.register('role')}
                            >
                                <option value={PROJECT_ROLE.VIEWER}>Viewer - Chỉ xem</option>
                                <option value={PROJECT_ROLE.MEMBER}>Member - Thành viên</option>
                                <option value={PROJECT_ROLE.MANAGER}>Manager - Quản lý</option>
                                <option value={PROJECT_ROLE.OWNER}>Owner - Chủ sở hữu</option>
                            </Select>
                        </>
                    )}

                    {form.formState.errors.root && (
                        <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
                    )}

                    <FormActions
                        submitLabel="Thêm thành viên"
                        cancelLabel="Hủy"
                        onCancel={onClose}
                        isSubmitting={form.formState.isSubmitting}
                        disabled={loading || displayUsers.length === 0}
                    />
                </form>
            </DialogComponent>
        </>
    );
}
