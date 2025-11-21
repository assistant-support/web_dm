import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/request-user.js';
import { listAttachments, getAttachmentStats } from '@/data/attachment/actions/list.server';
import FilesManager from '@/app/(auth)/(main)/files/FilesManager.js';

export const dynamic = 'force-dynamic';

export default async function ProjectFilesPage({ params, searchParams }) {
    const { projectId } = await params;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        redirect('/login');
    }

    const query = await searchParams;

    const kind = query.kind || '';
    const search = query.search || '';
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const page = Number.parseInt(query.page, 10) || 1;
    const allowedViews = new Set(['grid', 'list', 'drive']);
    const view = allowedViews.has(query.view) ? query.view : 'grid';
    const limit = 50;

    const filesFallback = { items: [], total: 0, page: 1, pages: 1, limit };
    const statsFallback = { byKind: [], byProject: [], total: 0, recentUploads: 0 };

    const filesPromise = listAttachments({
        scope: 'project',
        projectId,
        kind,
        search,
        sortBy,
        sortOrder,
        page,
        limit,
    })
        .then((result) => (result.ok ? result.data : filesFallback))
        .catch(() => filesFallback);

    const statsPromise = getAttachmentStats({
        scope: 'project',
        projectId,
    })
        .then((result) => (result.ok ? result.data : statsFallback))
        .catch(() => statsFallback);

    return (
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="space-y-6">
                <FilesManager
                    initialFilesPromise={filesPromise}
                    statsPromise={statsPromise}
                    currentUser={currentUser}
                    initialFilters={{
                        scope: 'project',
                        projectId: '',
                        kind,
                        search,
                        sortBy,
                        sortOrder,
                        page,
                        view,
                    }}
                    config={{
                        scopeOptions: [
                            { value: 'project', label: 'File dự án' },
                        ],
                        filterDefaults: {
                            scope: 'project',
                            view: 'grid',
                            projectId: '',
                        },
                        searchPlaceholder: 'Tìm file trong dự án...',
                        filterBasePath: `/projects/${projectId}/files`,
                    }}
                />
            </div>
        </div>
    );
}
