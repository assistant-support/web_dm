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
    canManage = false
}) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsDialogOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
                <Plus className="h-5 w-5" />
                Thêm công việc
            </button>

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
        </>
    );
}
