// app/(auth)/(main)/reports/page.js
// Trang báo cáo cá nhân - Dashboard analytics

import { getCurrentUser } from '@/lib/request-user';
import { redirect } from 'next/navigation';
import PersonalReportClient from '@/components/reports/PersonalReportClient.client';
import { getUserReportData } from '@/data/report/actions/server';
import { listMyProjects } from '@/data/project/actions/list';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReportsPage() {
    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const currentMonth = format(new Date(), 'yyyy-MM');
    
    // Fetch report data
    const [reportData, projectsData] = await Promise.all([
        getUserReportData({ userId: user.externalUserId, ym: currentMonth }),
        listMyProjects({ limit: 100 })
    ]);

    return (
        <div className="w-full h-full">
            <PersonalReportClient
                user={user}
                initialReportData={reportData}
                projects={projectsData?.projects || []}
                currentMonth={currentMonth}
            />
        </div>
    );
}
