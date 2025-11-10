// app/(auth)/(main)/files/page.js
// Trang quản lý file tập trung

import { getCurrentUser } from '@/lib/request-user.js';
import { listAttachments, getAttachmentStats } from '@/data/attachment/actions/list.server';
import FilesManager from './FilesManager.js';

export const metadata = {
    title: 'Quản lý File - Drive',
    description: 'Quản lý tất cả file đính kèm trong dự án và công việc',
};

export const revalidate = 30;

export default async function FilesPage({ searchParams }) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-red-600">Vui lòng đăng nhập</p>
            </div>
        );
    }

    const params = await searchParams;

    const scope = params.scope || 'all';
    const projectId = params.projectId || null;
    const taskId = params.taskId || null;
    const kind = params.kind || null;
    const search = params.search || '';
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';
    const page = parseInt(params.page, 10) || 1;
    const view = params.view || 'grid';
    const limit = 50;

    const filesFallback = { items: [], total: 0, page: 1, pages: 1, limit };
    const statsFallback = { byKind: [], byProject: [], total: 0, recentUploads: 0 };

    const filesPromise = listAttachments({
        scope,
        projectId,
        taskId,
        kind,
        search,
        sortBy,
        sortOrder,
        page,
        limit,
    })
        .then((result) => (result.ok ? result.data : filesFallback))
        .catch(() => filesFallback);

    const statsPromise = getAttachmentStats()
        .then((result) => (result.ok ? result.data : statsFallback))
        .catch(() => statsFallback);

    return (
        <div className="h-full w-full overflow-hidden">
            <FilesManager
                initialFilesPromise={filesPromise}
                statsPromise={statsPromise}
                currentUser={currentUser}
                initialFilters={{
                    scope,
                    projectId,
                    taskId,
                    kind,
                    search,
                    sortBy,
                    sortOrder,
                    page,
                    view,
                }}
            />
        </div>
    );
}
