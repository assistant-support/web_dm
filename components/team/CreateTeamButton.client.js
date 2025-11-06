// components/team/CreateTeamButton.client.js
// Client Component - Button mở dialog tạo team

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DialogComponent from '@/components/ui/dialog';
import TeamForm from './TeamForm.client';

/**
 * CreateTeamButton Client Component
 * Button để mở dialog tạo team mới
 */
export default function CreateTeamButton() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    
    const handleSuccess = () => {
        setIsOpen(false);
        router.refresh(); // Refresh server component data
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-600)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2 transition-all duration-200"
            >
                <Plus className="h-4 w-4" />
                Tạo nhóm mới
            </button>

            <DialogComponent
                open={isOpen}
                onOpenChange={setIsOpen}
                title="Tạo nhóm làm việc mới"
                description="Tạo một nhóm để cộng tác với đồng nghiệp"
                size="md"
            >
                <TeamForm
                    mode="create"
                    onSuccess={handleSuccess}
                    onCancel={() => setIsOpen(false)}
                />
            </DialogComponent>
        </>
    );
}
