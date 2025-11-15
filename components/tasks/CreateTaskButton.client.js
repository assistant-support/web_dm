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
    currentUserId,
    canManage = false,
    canCreate = false
}) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsDialogOpen(true)}
                disabled={!canCreate}
                title={!canCreate ? 'Chỉ quản lý dự án mới được tạo công việc gốc' : 'Tạo công việc mới'}
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
                    users={users}
                    currentUserId={currentUserId}
                    canManage={canManage}
                    onSuccess={() => {
                        setIsDialogOpen(false);
                    }}
                />
            )}
        </>
    );
}
