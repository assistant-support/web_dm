// app/(auth)/(main)/teams/[teamId]/edit/page.client.js
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TeamForm from '@/components/team/TeamForm.client.js';

export default function TeamEditClient({ team }) {
    const router = useRouter();

    const handleSuccess = () => {
        router.push(`/teams/${team._id}`);
        router.refresh();
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Back button */}
            <Link
                href={`/teams/${team._id}`}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
            </Link>

            {/* Header */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa nhóm</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Cập nhật thông tin cho nhóm <span className="font-medium">{team.name}</span>
                </p>
            </div>

            {/* Form */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <TeamForm
                    mode="edit"
                    teamId={team._id}
                    initialData={{
                        name: team.name,
                        description: team.description || '',
                    }}
                    onSuccess={handleSuccess}
                />
            </div>
        </div>
    );
}
