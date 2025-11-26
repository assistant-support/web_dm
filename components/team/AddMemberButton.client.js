'use client';

// AddMemberButton Client Component
// Minimal client component chỉ xử lý add member button và dialog

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import AddMemberDialog from './AddMemberDialog.client.js';

/**
 * AddMemberButton - Minimal Client Component
 * Chỉ xử lý nút add và dialog state
 * 
 * @param {Object} props
 * @param {string} props.teamId - Team ID
 * @param {Array} props.existingMemberIds - Array of existing member IDs
 */
export default function AddMemberButton({ teamId, existingMemberIds, isActive = true }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => isActive && setIsDialogOpen(true)}
                disabled={!isActive}
                title={isActive ? 'Thêm thành viên' : 'Nhóm đã lưu trữ — không thể thêm thành viên'}
                className={
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all shadow-sm " +
                    (isActive
                        ? "bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed")
                }
            >
                <UserPlus className="h-4 w-4" />
                Thêm thành viên
            </button>

            <AddMemberDialog
                teamId={teamId}
                existingMemberIds={existingMemberIds}
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                isActive={isActive}
            />
        </>
    );
}
