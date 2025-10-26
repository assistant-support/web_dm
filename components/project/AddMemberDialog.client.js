// components/project/AddMemberDialog.client.js
// Mục đích: Dialog thêm member vào project với user search

'use client';

import { useState } from 'react';
import DialogComponent from '@/components/ui/dialog';
import { Select } from '@/components/ui/input';
import UserSearchSelect from '@/components/ui/UserSearchSelect.client.js';
import { addMemberAction } from '@/data/project/actions/server.js';
import { useAsyncNotifier } from '@/hooks/loading.hook';
import Button from '@/components/ui/button';

const ROLE_OPTIONS = [
    { value: 'owner', label: 'Owner' },
    { value: 'manager', label: 'Manager' },
    { value: 'member', label: 'Member' },
    { value: 'viewer', label: 'Viewer' },
];

/**
 * AddMemberDialog - Dialog thêm member vào project
 * @param {Object} props
 * @param {string} props.projectId - Project ID
 * @param {Array} props.existingMembers - Danh sách members hiện tại
 * @param {Function} props.onClose - Callback khi đóng dialog
 * @param {Function} props.onSuccess - Callback khi thêm thành công
 */
export default function AddMemberDialog({ projectId, existingMembers = [], onClose, onSuccess }) {
    const { run, Overlays } = useAsyncNotifier();
    const [userId, setUserId] = useState('');
    const [role, setRole] = useState('member');
    const [error, setError] = useState('');

    const existingUserIds = existingMembers.map(m => m.userId);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!userId.trim()) {
            setError('Vui lòng chọn người dùng');
            return;
        }

        // Check if already a member
        if (existingUserIds.includes(userId.trim())) {
            setError('Người dùng này đã là thành viên của dự án');
            return;
        }

        setError('');

        const result = await run(
            async () => await addMemberAction(projectId, {
                userId: userId.trim(),
                role,
            }),
            {
                loadingMessage: 'Đang thêm thành viên...',
                successMessage: 'Thêm thành viên thành công',
                errorMessage: 'Thêm thành viên thất bại',
                notify: 'all'
            }
        );

        if (result?.ok !== true) {
            setError(result?.message || 'Không thể thêm thành viên');
            return;
        }

        if (onSuccess) onSuccess();
    };

    return (
        <>
            <Overlays />
            <DialogComponent
                open={true}
                onOpenChange={(open) => !open && onClose()}
                title="Thêm thành viên dự án"
                description="Thêm người dùng vào dự án và gán vai trò"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-md bg-red-50 p-3">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Người dùng <span className="text-red-500">*</span>
                        </label>
                        <UserSearchSelect
                            value={userId}
                            onChange={setUserId}
                            placeholder="Tìm theo tên hoặc email..."
                            excludeUserIds={existingUserIds}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Chỉ có thể thêm người dùng đã đăng nhập vào hệ thống
                        </p>
                    </div>

                    <Select
                        label="Vai trò"
                        required
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    >
                        {ROLE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="secondary"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={!userId.trim()}
                        >
                            Thêm thành viên
                        </Button>
                    </div>
                </form>
            </DialogComponent>
        </>
    );
}
