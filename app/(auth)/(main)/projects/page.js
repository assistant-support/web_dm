// app/(auth)/(main)/projects/page.js
import { listMyProjects } from '@/data/project/actions/list.js';
import { listManagedTeams } from '@/data/team/actions/server.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { isTeamManager } from '@/lib/permissions.js';
import ProjectsPageClient from '@/components/project/ProjectsPageClient.client.js';

// Revalidate every 3 seconds for real-time updates
export const revalidate = 3;

export default async function ProjectsPage() {
    // Fetch projects và user info song song
    const [result, user] = await Promise.all([
        listMyProjects(),
        getCurrentUser()
    ]);

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

    // Kiểm tra quyền tạo project: User phải là manager của ít nhất 1 team
    let canCreateProject = false;
    if (user) {
        const teamsResult = await listManagedTeams();
        if (teamsResult.ok && teamsResult.data) {
            // Nếu có team mà user là manager, cho phép tạo project
            canCreateProject = teamsResult.data.some(team => 
                isTeamManager(team, user.externalUserId)
            );
        }
    }

    return (
        <ProjectsPageClient 
            initialProjects={projects} 
            canCreateProject={canCreateProject}
        />
    );
}