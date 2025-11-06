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
export default function AddMemberButton({ teamId, existingMemberIds }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsDialogOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-600)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2 transition-all shadow-sm"
            >
                <UserPlus className="h-4 w-4" />
                Thêm thành viên
            </button>

            <AddMemberDialog
                teamId={teamId}
                existingMemberIds={existingMemberIds}
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
            />
        </>
    );
}
