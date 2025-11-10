// app/(auth)/(main)/projects/[projectId]/activity/page.js
import ProjectActivityLog from '@/components/project/ProjectActivityLog.client.js';

// Revalidate every 3 seconds for real-time updates
export const revalidate = 3;

export default async function ProjectActivityPage({ params }) {
    const { projectId } = await params;

    return (
        <div className="flex flex-col space-y-6 w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 py-4 border border-gray-200 rounded-md">
            <ProjectActivityLog projectId={projectId} />
        </div>
    );
}
