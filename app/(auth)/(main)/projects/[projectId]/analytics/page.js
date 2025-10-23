// app/(auth)/(main)/projects/[projectId]/analytics/page.js
import ProjectAnalytics from '@/components/project/ProjectAnalytics.client.js';
import MemberList from '@/components/project/MemberList.client.js';
import { getProjectDetail } from '@/data/project/actions/list.js';

export const dynamic = 'force-dynamic';

export default async function ProjectAnalyticsPage({ params }) {
    const { projectId } = await params;
    const result = await getProjectDetail(projectId);

    if (!result.ok) {
        return <div>Error loading analytics</div>;
    }

    const project = result.data;

    return (
        <div className="space-y-6">
            {/* Analytics Dashboard */}
            <ProjectAnalytics projectId={projectId} />

            {/* Member Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê thành viên</h3>
                <MemberList 
                    projectId={projectId}
                    members={project.members}
                    showStats={true}
                />
            </div>
        </div>
    );
}
