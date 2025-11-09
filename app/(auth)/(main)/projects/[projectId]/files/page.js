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
    const view = query.view === 'list' ? 'list' : 'grid';
    const limit = 50;

    const [filesResult, statsResult] = await Promise.all([
        listAttachments({
            scope: 'project',
            projectId,
            kind,
            search,
            sortBy,
            sortOrder,
            page,
            limit,
        }),
        getAttachmentStats({
            scope: 'project',
            projectId,
        }),
    ]);

    const files = filesResult.ok
        ? filesResult.data
        : { items: [], total: 0, page: 1, pages: 1, limit };
    const stats = statsResult.ok
        ? statsResult.data
        : { byKind: [], byProject: [], total: 0, recentUploads: 0 };

    return (
        <div className="h-full w-full overflow-hidden">
            <FilesManager
                initialFiles={files}
                stats={stats}
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
    );
}
