// components/project/MemberRow.client.js
// Mục đích: Hiển thị và chỉnh sửa một member của project

'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/avatar';
import Badge from '@/components/ui/badge';
import Select from '@/components/ui/select';
import UserDisplay from '@/components/ui/user-display';
import { removeMemberAction, changeRole } from '@/data/project/actions/server.js';
import { X } from 'lucide-react';
import { useAsyncNotifier } from '@/hooks/loading.hook';

const ROLE_OPTIONS = [
    { value: 'owner', label: 'Chủ sở hữu' },
    { value: 'manager', label: 'Quản lý' },
    { value: 'member', label: 'Thành viên' },
    { value: 'viewer', label: 'Người xem' },
];

/**
 * MemberRow - Hiển thị một member với actions
 * @param {Object} props
 * @param {string} props.projectId - Project ID
 * @param {Object} props.member - Member object {userId, role, createdAt, updatedAt}
 * @param {boolean} props.canManage - Có quyền manage không
 * @param {Function} props.onRefresh - Callback để refresh
 */
export default function MemberRow({ projectId, member, canManage, onRefresh, isActive = true }) {
    const { run, Overlays } = useAsyncNotifier();
    const [error, setError] = useState('');

    const handleRoleChange = async (newRole) => {
        if (newRole === member.role) return;

        setError('');

        if (!isActive) return; // prevent action when project archived

        const result = await run(
            async () => await changeRole(projectId, {
                userId: member.userId,
                role: newRole,
            }),
            {
                loadingMessage: 'Đang thay đổi vai trò...',
                successMessage: 'Thay đổi vai trò thành công',
                errorMessage: 'Thay đổi vai trò thất bại',
                notify: 'all'
            }
        );

        if (result?.ok !== true) {
            setError(result?.message || 'Không thể thay đổi vai trò');
            return;
        }

        if (onRefresh) onRefresh();
    };

    const handleRemove = async () => {
        const userName = document.querySelector(`[data-user-id="${member.userId}"]`)?.textContent || member.userId;
        if (!confirm(`Xóa ${userName} khỏi dự án này?`)) {
            return;
        }
        if (!isActive) return; // prevent action when project archived

        setError('');

        const result = await run(
            async () => await removeMemberAction(projectId, {
                userId: member.userId,
            }),
            {
                loadingMessage: 'Đang xóa thành viên...',
                successMessage: 'Xóa thành viên thành công',
                errorMessage: 'Xóa thành viên thất bại',
                notify: 'all'
            }
        );

        if (result?.ok !== true) {
            setError(result?.message || 'Không thể xóa thành viên');
            return;
        }

        if (onRefresh) onRefresh();
    };

    return (
        <>
            <Overlays />
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <UserDisplay
                        userId={member.userId}
                        showJobTitle={false}
                        size="sm"
                    />
                    {error && (
                        <p className="text-xs text-red-600 ml-3">{error}</p>
                    )}
                </div>

                <div className="flex items-center gap-3 ml-4">
                    {canManage ? (
                        <Select
                            value={member.role}
                            onChange={(e) => handleRoleChange(e.target.value)}
                            options={ROLE_OPTIONS}
                            className="text-sm"
                        />
                    ) : (
                        <Badge variant="secondary">{member.role}</Badge>
                    )}

                    {canManage && (
                        <button
                            onClick={handleRemove}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Xóa thành viên"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
