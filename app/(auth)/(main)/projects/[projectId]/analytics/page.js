// app/(auth)/(main)/projects/[projectId]/analytics/page.js
import { notFound } from 'next/navigation';
import ProjectAnalytics from '@/components/project/ProjectAnalytics.client.js';
import { getProjectDetail } from '@/data/project/actions/list.js';

// Revalidate every 3 seconds for real-time updates
export const revalidate = 3;

export async function generateMetadata({ params }) {
    const { projectId } = await params;
    const result = await getProjectDetail(projectId);

    if (!result.ok) {
        return {
            title: 'Project Not Found',
        };
    }

    const project = result.data;
    return {
        title: `${project.name} - Analytics | Projects`,
        description: `View analytics and statistics for ${project.name}`,
    };
}

export default async function ProjectAnalyticsPage({ params }) {
    const { projectId } = await params;
    
    if (!projectId) return notFound();

    const result = await getProjectDetail(projectId);

    if (!result.ok) {
        return notFound();
    }

    const project = result.data;

    return (
        <div className="space-y-6">
            <ProjectAnalytics projectId={projectId} />
        </div>
    );
}
