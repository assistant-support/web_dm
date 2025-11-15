import { notFound } from 'next/navigation';
import { getProjectDetail } from '@/data/project/actions/list.js';
import { getProjectAnalytics } from '@/data/project/processors/analytics.js';
import { getUsersDisplayInfo } from '@/lib/user-display';
import { listByProject } from '@/data/task/actions/server.js';
import { getCurrentUser } from '@/lib/request-user.js';
import { TASK_STATUS, PROJECT_ROLE } from '@/model/common/enums.js';
import { getCachedBatchMemberTaskStats } from '@/data/project/processors/member-task-stats.js';
import ProjectMetrics from '@/components/project/ProjectMetrics.server.js';
import MemberTaskProgress from '@/components/project/MemberTaskProgress.server.js';
import ProjectAnalytics from '@/components/project/ProjectAnalytics.client.js';
import PendingApprovalSection from '@/components/project/PendingApprovalSection.client.js';

export const revalidate = 300;

export default async function ProjectOverviewPage({ params }) {
    const { projectId } = await params;

    const [user, projectResult] = await Promise.all([
        getCurrentUser(),
        getProjectDetail(projectId)
    ]);

    if (!projectResult.ok) notFound();

    const project = projectResult.data;
    const memberIds = project.members?.map(m => m.userId) || [];

    const currentMember = project.members?.find(m => m.userId === user?.externalUserId);
    const isManager = [PROJECT_ROLE.OWNER, PROJECT_ROLE.MANAGER].includes(currentMember?.role);

    const [analyticsData, usersMapResult, allReviewTasksResult, memberTaskStats] = await Promise.all([
        getProjectAnalytics(projectId),
        getUsersDisplayInfo(memberIds),
        listByProject(projectId, {
            status: [TASK_STATUS.PENDING_APPROVAL, TASK_STATUS.COMPLETED_AWAIT_REVIEW],
            limit: 50,
            sortBy: 'updatedAt',
            sortOrder: 'desc',
        }),
        getCachedBatchMemberTaskStats(projectId, memberIds)
    ]);

    const analytics = analyticsData || {};
    const usersMap = new Map(usersMapResult || []);
    const allReviewTasks = allReviewTasksResult.ok ? allReviewTasksResult.data : [];
    const reviewTasks = allReviewTasks;
    const usersMapObj = Object.fromEntries(usersMap);

    return (
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="p-6 space-y-6">
                <ProjectMetrics
                taskStats={analytics.tasks}
                completionRate={analytics.completionRate}
            />
            <MemberTaskProgress
                members={project.members || []}
                usersMap={usersMapObj}
                memberTaskStats={memberTaskStats || {}}
            />
            <ProjectAnalytics
                projectId={projectId}
                initialAnalytics={analytics}
            />

                {isManager && (
                    <PendingApprovalSection
                        initialTasks={reviewTasks}
                        usersMap={usersMapObj}
                        projectId={projectId}
                    />
                )}
            </div>
        </div>
    );
}