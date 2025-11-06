// app/(auth)/(main)/projects/[projectId]/activity/page.js
import ProjectActivityLog from '@/components/project/ProjectActivityLog.client.js';

// Revalidate every 3 seconds for real-time updates
export const revalidate = 3;

export default async function ProjectActivityPage({ params }) {
    const { projectId } = await params;

    return (
        <div>
            <ProjectActivityLog projectId={projectId} />
        </div>
    );
}
