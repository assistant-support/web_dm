// app/(auth)/(main)/settings/page.js
// Trang cài đặt cá nhân

import { getCurrentUser } from '@/lib/request-user';
import { redirect } from 'next/navigation';
import SettingsClient from '@/components/settings/SettingsClient.client';
import { getUserSettings } from '@/data/appUser/actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SettingsPage() {
    const user = await getCurrentUser();
    if (!user) redirect('/login');

    // Get user settings
    const result = await getUserSettings({ userId: user.externalUserId });
    const settings = result?.data || result || {
        notifications: {
            email: true,
            taskAssigned: true,
            taskCompleted: true,
            projectUpdates: true,
            mentions: true,
        },
        preferences: {},
        platforms: [],
        color: '',
        capacityHoursPerWeek: 40,
    };

    return (
        <div className="w-full h-full">
            <SettingsClient
                user={user}
                initialSettings={settings}
            />
        </div>
    );
}
