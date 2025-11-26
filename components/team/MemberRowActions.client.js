'use client';

// MemberRowActions Client Component
// Minimal client component chỉ xử lý dropdown actions

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Trash2, UserCog } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ConfirmDialog } from '@/components/ui/dialog/index.js';
import { removeMemberAction, changeRole } from '@/data/team/actions/server.js';
import { useAsyncNotifier } from '@/hooks/loading.hook';

/**
 * MemberRowActions - Minimal Client Component
 * Chỉ xử lý dropdown menu và actions
 * 
 * @param {Object} props
 * @param {Object} props.member - Member data
 * @param {string} props.teamId - Team ID
 */
export default function MemberRowActions({ member, teamId, isActive = true }) {
    const router = useRouter();
    const { run, Overlays } = useAsyncNotifier();
    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
    const [isChangeRoleDialogOpen, setIsChangeRoleDialogOpen] = useState(false);

    const handleRemove = async () => {
        const result = await run(
            async () => await removeMemberAction(teamId, { userId: member.userId }),
            {
                loadingMessage: 'Đang xóa thành viên...',
                successMessage: 'Đã xóa thành viên thành công!',
                errorMessage: 'Không thể xóa thành viên',
                notify: 'all',
            }
        );

        if (result?.ok) {
            setIsRemoveDialogOpen(false);
            router.refresh();
        }
    };

    const handleChangeRole = async (newRole) => {
        const roleName = newRole === 'manager' ? 'Quản lý' : 'Thành viên';

        const result = await run(
            async () => await changeRole(teamId, { userId: member.userId, role: newRole }),
            {
                loadingMessage: `Đang thay đổi vai trò thành ${roleName}...`,
                successMessage: `Đã thay đổi vai trò thành ${roleName} thành công!`,
                errorMessage: 'Không thể thay đổi vai trò',
                notify: 'all',
            }
        );

        if (result?.ok) {
            setIsChangeRoleDialogOpen(false);
            router.refresh();
        }
    };

    const newRole = member.role === 'manager' ? 'member' : 'manager';
    const newRoleName = newRole === 'manager' ? 'Quản lý' : 'Thành viên';

    return (
        <>
            <Overlays />
            
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        className={`inline-flex items-center justify-center rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2 ${isActive ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-500' : 'text-gray-300 bg-gray-50 cursor-not-allowed'}`}
                        aria-label="Member actions"
                        disabled={!isActive}
                        title={isActive ? 'Thao tác thành viên' : 'Team đã lưu trữ — thao tác bị vô hiệu'}
                    >
                        <MoreVertical className="h-5 w-5" />
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        className="min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                        sideOffset={5}
                        align="end"
                    >
                        <DropdownMenu.Item
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer outline-none"
                            onSelect={() => { if (!isActive) return; setIsChangeRoleDialogOpen(true); }}
                        >
                            <UserCog className="h-4 w-4" />
                            Đổi thành {newRoleName}
                        </DropdownMenu.Item>

                        <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

                        <DropdownMenu.Item
                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                            onSelect={() => { if (!isActive) return; setIsRemoveDialogOpen(true); }}
                        >
                            <Trash2 className="h-4 w-4" />
                            Xóa khỏi team
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Remove Confirmation Dialog */}
            <ConfirmDialog
                open={isRemoveDialogOpen}
                onOpenChange={setIsRemoveDialogOpen}
                title="Xóa thành viên"
                description="Bạn có chắc chắn muốn xóa thành viên này khỏi team? Họ sẽ mất quyền truy cập vào tất cả dự án của team."
                confirmText="Xóa"
                cancelText="Hủy"
                onConfirm={handleRemove}
                variant="danger"
            />

            {/* Change Role Confirmation Dialog */}
            <ConfirmDialog
                open={isChangeRoleDialogOpen}
                onOpenChange={setIsChangeRoleDialogOpen}
                title="Thay đổi vai trò"
                description={`Bạn có chắc chắn muốn đổi vai trò của thành viên này thành ${newRoleName}?`}
                confirmText="Thay đổi"
                cancelText="Hủy"
                onConfirm={() => handleChangeRole(newRole)}
                variant="primary"
            />
        </>
    );
}
