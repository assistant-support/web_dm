'use client';

// TeamHeaderActions Client Component
// Minimal client component chỉ xử lý edit button và dialog

import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import Button from '@/components/ui/button/index.js';
import EditTeamDialog from './EditTeamDialog.client.js';

/**
 * TeamHeaderActions - Minimal Client Component
 * Chỉ xử lý nút edit và dialog state
 * 
 * @param {Object} props
 * @param {Object} props.team - Team data for editing
 */
export default function TeamHeaderActions({ team }) {
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleOpenEdit = () => {
        if (!team?.isActive) return; // Prevent opening when archived
        setIsEditOpen(true);
    };

    return (
        <>
            <Button
                onClick={handleOpenEdit}
                variant="outline"
                size="sm"
                className="flex items-center gap-6"
                icon={Edit2}
                disabled={!team?.isActive}
                title={team?.isActive ? 'Chỉnh sửa' : 'Team đã lưu trữ — không thể chỉnh sửa'}
            >
                <span>Chỉnh sửa</span>
            </Button>

            <EditTeamDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                team={team}
            />
        </>
    );
}
