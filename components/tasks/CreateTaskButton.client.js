'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import CreateTaskDialog from './CreateTaskDialog.client';

/**
 * CreateTaskButton - Nút tạo task với dialog
 * Đơn giản hóa, chỉ xử lý mở/đóng dialog
 */
export default function CreateTaskButton({
    projectId,
    users = [],
    projectMembers = [],
    // New prop: detailed list of users (team + project) prepared by the page
    allUsersWithDetails = [],
    currentUserId,
    canManage = false,
    canCreate = false,
    isActive = true,
}) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => isActive && canCreate && setIsDialogOpen(true)}
                disabled={!canCreate || !isActive}
                title={!isActive ? 'Dự án đã lưu trữ — không thể tạo nhiệm vụ' : (!canCreate ? 'Chỉ quản lý dự án mới được tạo công việc gốc' : 'Tạo công việc mới')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                    canCreate
                        ? 'bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)] cursor-pointer'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                }`}
            >
                <Plus className="h-5 w-5" />
                Thêm công việc
            </button>

            {canCreate && (
                <CreateTaskDialog
                    open={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    projectId={projectId}
                    projectMembers={projectMembers}
                    allUsersWithDetails={allUsersWithDetails}
                    // Prefer a full list of users with details if provided by the page
                    users={
                        // If parent passed a combined `allUsersWithDetails` array, use it;
                        // otherwise fall back to the older `users` shape.
                        // We accept either shape (array of {id,name,..} or {value,label,...}).
                        Array.isArray(allUsersWithDetails) && allUsersWithDetails.length > 0
                            ? allUsersWithDetails.map(u => ({ value: u.id || u.value, label: u.label || u.name, name: u.name }))
                            : users
                    }
                    currentUserId={currentUserId}
                    canManage={canManage}
                    onSuccess={() => {
                        setIsDialogOpen(false);
                    }}
                    isActive={isActive}
                />
            )}
        </>
    );
}
