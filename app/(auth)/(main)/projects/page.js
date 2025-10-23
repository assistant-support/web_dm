// app/(auth)/(main)/projects/page.js
// Trang danh sách projects của user

import { listMyProjects } from '@/data/project/actions/list.js';
import ProjectsPageClient from '@/components/project/ProjectsPageClient.client.js';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
    const result = await listMyProjects();

    if (!result.ok) {
        return (
            <div className="space-y-6">
                <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                                Có lỗi xảy ra
                            </h3>
                            <div className="mt-2 text-sm text-red-700">
                                {result.message || 'Không thể tải danh sách dự án'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const { projects, count } = result.data;

    return <ProjectsPageClient initialProjects={projects} initialCount={count} />;
}
