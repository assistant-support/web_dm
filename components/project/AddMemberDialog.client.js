// components/project/AddMemberDialog.client.js
// Mục đích: Dialog thêm member vào project với user search

'use client';

import { useState } from 'react';
import DialogComponent from '@/components/ui/dialog';
import { Select } from '@/components/ui/input';
import UserSearchSelect from '@/components/ui/UserSearchSelect.client.js';
import { addMemberAction } from '@/data/project/actions/server.js';

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
    const [userId, setUserId] = useState('');
    const [role, setRole] = useState('member');
    const [isSubmitting, setIsSubmitting] = useState(false);
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

        setIsSubmitting(true);
        setError('');

        try {
            const result = await addMemberAction(projectId, {
                userId: userId.trim(),
                role,
            });

            if (!result.ok) {
                setError(result.message || 'Không thể thêm thành viên');
                return;
            }

            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Add member error:', err);
            setError(err.message || 'Có lỗi không mong muốn xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
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
                    disabled={isSubmitting}
                >
                    {ROLE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        disabled={isSubmitting}
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-[var(--brand-600)] rounded-md hover:bg-[var(--brand-700)] disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Đang thêm...' : 'Thêm thành viên'}
                    </button>
                </div>
            </form>
        </DialogComponent>
    );
}
