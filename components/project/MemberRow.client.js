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
export default function MemberRow({ projectId, member, canManage, onRefresh }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');

    const handleRoleChange = async (newRole) => {
        if (newRole === member.role) return;

        setIsUpdating(true);
        setError('');

        try {
            const result = await changeRole(projectId, {
                userId: member.userId,
                role: newRole,
            });

            if (!result.ok) {
                setError(result.message || 'Không thể thay đổi vai trò');
                return;
            }

            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Role change error:', err);
            setError(err.message || 'Có lỗi không mong muốn xảy ra');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRemove = async () => {
        const userName = document.querySelector(`[data-user-id="${member.userId}"]`)?.textContent || member.userId;
        if (!confirm(`Xóa ${userName} khỏi dự án này?`)) {
            return;
        }

        setIsUpdating(true);
        setError('');

        try {
            const result = await removeMemberAction(projectId, {
                userId: member.userId,
            });

            if (!result.ok) {
                setError(result.message || 'Không thể xóa thành viên');
                return;
            }

            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Remove member error:', err);
            setError(err.message || 'Có lỗi không mong muốn xảy ra');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
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
                        disabled={isUpdating}
                        className="text-sm"
                    />
                ) : (
                    <Badge variant="secondary">{member.role}</Badge>
                )}

                {canManage && (
                    <button
                        onClick={handleRemove}
                        disabled={isUpdating}
                        className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                        title="Xóa thành viên"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
