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
    const [reportResult, projectsResult] = await Promise.all([
        getUserReportData({ userId: user.externalUserId, ym: currentMonth }),
        listMyProjects({ limit: 100 })
    ]);

    if (!reportResult.ok) {
        console.error('Failed to load personal report:', reportResult.message);
    }
    if (!projectsResult.ok) {
        console.error('Failed to load project list for report:', projectsResult.message);
    }

    const initialReportData = reportResult.ok ? reportResult.data : null;
    const projects = projectsResult.ok ? projectsResult.data.projects : [];

    return (
        <div className="w-full h-full">
            <PersonalReportClient
                user={user}
                initialReportData={initialReportData}
                projects={projects}
                currentMonth={currentMonth}
            />
        </div>
    );
}
