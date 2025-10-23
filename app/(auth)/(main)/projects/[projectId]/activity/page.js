// app/(auth)/(main)/projects/[projectId]/activity/page.js
import ProjectActivityLog from '@/components/project/ProjectActivityLog.client.js';

export const dynamic = 'force-dynamic';

export default async function ProjectActivityPage({ params }) {
    const { projectId } = await params;

    return (
        <div>
            <ProjectActivityLog projectId={projectId} />
        </div>
    );
}
