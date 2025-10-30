// components/team/MemberRow.client.js
// Mục đích: Hiển thị 1 member với các actions và stats

'use client';

import { useState } from 'react';
import { MoreVertical, Trash2, UserCog, Briefcase, Calendar, Trophy, CheckCircle2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import UserDisplay, { UserName } from '@/components/ui/user-display';
import Badge from '@/components/ui/badge/index.js';
import { ConfirmDialog } from '@/components/ui/dialog/index.js';
import { removeMemberAction, changeRole } from '@/data/team/actions/server.js';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAsyncNotifier } from '@/hooks/loading.hook';

export default function MemberRow({
    member,
    teamId,
    isManager,
    currentUserId,
    userInfo, // Tối ưu: Nhận userInfo
    stats,
    isLoadingStats
}) {
    const router = useRouter();
    const { run, Overlays } = useAsyncNotifier();
    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
    const [isChangeRoleDialogOpen, setIsChangeRoleDialogOpen] = useState(false);

    const isSelf = String(member.userId) === String(currentUserId);
    const canManage = isManager && !isSelf;

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

    return (
        <>
            <Overlays />
            <div className="py-4 px-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Tối ưu: Truyền userInfo vào UserDisplay */}
                        <UserDisplay
                            userId={member.userId}
                            userInfo={userInfo} // <--- ĐÂY
                            showJobTitle={true}
                            size="lg"
                            isSelf={isSelf}
                            fullcontent={!isLoadingStats && stats && (
                                <div className="flex items-center gap-6 text-sm text-gray-600">
                                    <div className="flex items-center gap-1.5" title="Số dự án tham gia">
                                        <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                                        <span>{stats.projectsCount} dự án</span>
                                    </div>
                                    <div className="flex items-center gap-1.5" title="Số tasks đã hoàn thành">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                        <span>{stats.tasksCompleted} tasks</span>
                                    </div>
                                    <div className="flex items-center gap-1.5" title="Điểm tháng này">
                                        <Trophy className="h-3.5 w-3.5 text-yellow-600" />
                                        <span className="font-medium">{stats.currentMonthPoints} pts</span>
                                    </div>
                                    {stats.joinedAt && (
                                        <div className="flex items-center gap-1.5 text-gray-500" title="Ngày tham gia">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>{format(new Date(stats.joinedAt), 'dd/MM/yyyy')}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        />
                     

                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge
                            variant="role"
                            role={member.role}
                            className={member.role === 'manager'
                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }
                        >
                            {member.role === 'manager' ? 'Quản lý' : 'Thành viên'}
                        </Badge>

                        {canManage && (
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                    <button
                                        className="rounded-lg p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] transition-colors"
                                        aria-label="Hành động thành viên"
                                    >
                                        <MoreVertical className="h-4 w-4 text-gray-500" />
                                    </button>
                                </DropdownMenu.Trigger>

                                <DropdownMenu.Portal>
                                    <DropdownMenu.Content
                                        className="min-w-[200px] rounded-lg bg-white p-1.5 shadow-lg ring-1 ring-gray-200 z-50"
                                        sideOffset={5}
                                        align="end"
                                    >
                                        <DropdownMenu.Item
                                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 outline-none cursor-pointer transition-colors"
                                            onSelect={() => setIsChangeRoleDialogOpen(true)}
                                        >
                                            <UserCog className="h-4 w-4 text-gray-500" />
                                            <span>Đổi vai trò</span>
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />
                                        <DropdownMenu.Item
                                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-red-700 hover:bg-red-50 focus:bg-red-50 outline-none cursor-pointer transition-colors"
                                            onSelect={() => setIsRemoveDialogOpen(true)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                            <span>Xóa thành viên</span>
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                        )}
                    </div>
                </div>


                {isLoadingStats && (
                    <div className="mt-3 ml-12 flex items-center gap-2 text-sm text-gray-400">
                        <div className="animate-pulse flex gap-4">
                            <div className="h-3 w-16 bg-gray-200 rounded"></div>
                            <div className="h-3 w-16 bg-gray-200 rounded"></div>
                            <div className="h-3 w-16 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={isRemoveDialogOpen}
                onOpenChange={setIsRemoveDialogOpen}
                title="Xóa thành viên"
                description={
                    <>
                        Bạn có chắc muốn xóa{' '}
                        <UserName userId={member.userId} className="font-medium" />{' '}
                        khỏi nhóm?
                    </>
                }
                onConfirm={handleRemove}
                confirmText="Xóa"
                variant="danger"
            />

            {/* ... Dialog đổi vai trò (giữ nguyên như cũ) ... */}
            {isChangeRoleDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Đổi vai trò</h3>
                            <p className="text-sm text-gray-500 mt-1">Chọn vai trò mới cho thành viên</p>
                        </div>

                        <div className="p-6">
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleChangeRole('manager')}
                                    disabled={member.role === 'manager'}
                                    className="w-full text-left px-4 py-3.5 rounded-lg border border-gray-200 hover:border-[var(--brand-600)] hover:bg-[var(--brand-50)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                                            <UserCog className="h-5 w-5 text-purple-600 group-hover:text-white transition-colors" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900">Quản lý</div>
                                            <div className="text-sm text-gray-500">Có thể quản lý nhóm và thành viên</div>
                                        </div>
                                        {member.role === 'manager' && (
                                            <div className="w-5 h-5 rounded-full bg-[var(--brand-600)] flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleChangeRole('member')}
                                    disabled={member.role === 'member'}
                                    className="w-full text-left px-4 py-3.5 rounded-lg border border-gray-200 hover:border-[var(--brand-600)] hover:bg-[var(--brand-50)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-600 transition-colors">
                                            <UserCog className="h-5 w-5 text-gray-600 group-hover:text-white transition-colors" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900">Thành viên</div>
                                            <div className="text-sm text-gray-500">Thành viên thông thường</div>
                                        </div>
                                        {member.role === 'member' && (
                                            <div className="w-5 h-5 rounded-full bg-[var(--brand-600)] flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end gap-3">
                            <button
                                onClick={() => setIsChangeRoleDialogOpen(false)}
                                className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-white transition-colors"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}