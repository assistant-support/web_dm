// app/(auth)/(main)/projects/[projectId]/layout.js
import { notFound, redirect } from 'next/navigation';
import { getProjectDetail } from '@/data/project/actions/list.js'; // Vẫn dùng action này (vì nó đã gọi repo cache)
import { getCurrentUser } from '@/lib/request-user.js';
import ProjectTabs from '@/components/project/ProjectTabs.client.js';
import ProjectHeader from '@/components/project/ProjectHeader.client.js';
import { canManageProject } from '@/lib/permissions.js'; // Sử dụng helper permission

// Revalidate every 3 seconds for real-time updates
export const revalidate = 3;

export default async function ProjectDetailLayout({ children, params }) {
    const { projectId } = await params;
    const user = await getCurrentUser();

    if (!user) {
        redirect('/login'); // Giữ nguyên logic auth
    }

    const result = await getProjectDetail(projectId);

    if (!result.ok) {
        // Dùng mã lỗi chuẩn từ action
        if (result.code === 'NOT_FOUND') {
            notFound();
        }
        if (result.code === 'FORBIDDEN') {
            // Nếu không có quyền xem, trả về trang projects
            redirect('/projects');
        }
        // Lỗi khác
        throw redirect('/projects');
    }

    // Action trả về data đã serialize (nếu dùng asPlainProject)
    // Nếu getProjectDetail chưa serialize, cần JSON.parse(JSON.stringify(result.data))
    const project = result.data; // Giả sử action đã serialize

    // Sử dụng helper `canManageProject` (vì project đã lean)
    const userIsManager = canManageProject(project, user.externalUserId);

    return (
        <div className='w-full flex flex-col gap-3'> {/* Tăng gap */}
            <ProjectHeader project={project} canManage={userIsManager} />
            <ProjectTabs
                projectId={projectId}
                isOwnerOrManager={userIsManager}
            />
            {/* Bỏ overflow-scroll ở đây và để MyProjectsList tự xử lý scroll */}
            <div className="flex-1 min-h-0 overflow-hidden"> {/* Thêm min-h-0 để flex hoạt động đúng */}
                {children}
            </div>
        </div>
    );
}