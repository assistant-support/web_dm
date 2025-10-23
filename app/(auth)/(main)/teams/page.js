// app/(auth)/(main)/teams/page.js
// Mục đích: Trang danh sách teams với create dialog và view toggle

import { listMy } from '@/data/team/actions/server.js';
import { getCurrentUser } from '@/lib/request-user.js';
import TeamsPageClient from './page.client.js';

// Force dynamic rendering để luôn lấy data mới
export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
    const user = await getCurrentUser();
    const result = await listMy();
    console.log(result);
    
    // Handle error
    if (!result.ok) {
        return (
            <div className="space-y-6 w-full">
                <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                                Có lỗi xảy ra
                            </h3>
                            <div className="mt-2 text-sm text-red-700">
                                {result.message || 'Không thể tải danh sách teams'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const teams = result.data || [];

    return <TeamsPageClient initialTeams={teams} currentUserId={user?.externalUserId} />;
}
