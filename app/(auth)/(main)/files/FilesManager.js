import Link from 'next/link';
import Image from 'next/image';
import { File, Users, FolderIcon } from 'lucide-react';
import FileStatsCard from './FileStatsCard.js';
import FileActions from './FileActions.client.js';
import FilePrefetcher from './FilePrefetcher.client.js';
import { getFileIconConfig } from './file-icon.config.js';
import FileFilters from './FileFilters.client.js';

const SCOPE_OPTIONS = [
    { value: 'all', label: 'Tất cả file' },
    { value: 'personal', label: 'File của tôi' },
];

const KIND_OPTIONS = [
    { value: '', label: 'Tất cả loại file' },
    { value: 'image', label: 'Hình ảnh' },
    { value: 'video', label: 'Video' },
    { value: 'doc', label: 'Tài liệu' },
    { value: 'other', label: 'Khác' },
];

const SORT_BY_OPTIONS = [
    { value: 'createdAt', label: 'Ngày tạo' },
    { value: 'name', label: 'Tên file' },
    { value: 'size', label: 'Kích thước' },
];

const SORT_ORDER_OPTIONS = [
    { value: 'desc', label: 'Giảm dần' },
    { value: 'asc', label: 'Tăng dần' },
];

const VIEW_MODES = {
    grid: 'grid',
    list: 'list',
};

function formatSize(bytes = 0) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, exponent);
    const rounded = value < 10 ? value.toFixed(1) : Math.round(value);
    return `${rounded} ${units[exponent]}`;
}

function formatRelativeDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
}

function buildQueryString(filters, overrides = {}) {
    const params = new URLSearchParams();
    const combined = { ...filters, ...overrides };
    Object.entries(combined).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        if (key === 'page' && Number(value) <= 1) return;
        params.set(key, String(value));
    });
    return params.toString();
}

function FileOwner({ label, user }) {
    if (!user) return null;
    return (
        <div className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{label}:</span> {user.name || user.userId}
        </div>
    );
}

export default async function FilesManager({ initialFiles, stats, currentUser, initialFilters, config = {} }) {
    const {
        scopeOptions: scopeOptionsOverride,
        kindOptions: kindOptionsOverride,
        sortByOptions: sortByOptionsOverride,
        sortOrderOptions: sortOrderOptionsOverride,
        filterDefaults = {},
        searchPlaceholder,
        filterBasePath,
    } = config || {};

    const scopeOptions = scopeOptionsOverride ?? SCOPE_OPTIONS;
    const kindOptions = kindOptionsOverride ?? KIND_OPTIONS;
    const sortByOptions = sortByOptionsOverride ?? SORT_BY_OPTIONS;
    const sortOrderOptions = sortOrderOptionsOverride ?? SORT_ORDER_OPTIONS;
    const basePath = filterBasePath || '/files';

    const defaultView = filterDefaults.view ?? VIEW_MODES.grid;
    const requestedView = initialFilters.view ?? defaultView;
    const viewMode = requestedView === VIEW_MODES.list ? VIEW_MODES.list : VIEW_MODES.grid;
    const resolvedScope = initialFilters.scope && initialFilters.scope !== ''
        ? initialFilters.scope
        : filterDefaults.scope ?? 'all';
    const filters = {
        scope: resolvedScope,
        kind: initialFilters.kind ?? filterDefaults.kind ?? '',
        sortBy: initialFilters.sortBy ?? filterDefaults.sortBy ?? 'createdAt',
        sortOrder: initialFilters.sortOrder ?? filterDefaults.sortOrder ?? 'desc',
        search: initialFilters.search ?? filterDefaults.search ?? '',
        projectId: initialFilters.projectId ?? filterDefaults.projectId ?? '',
        taskId: initialFilters.taskId ?? filterDefaults.taskId ?? '',
        page: initialFilters.page ?? filterDefaults.page ?? 1,
        view: viewMode,
    };

    const files = initialFiles.items || [];
    const pages = initialFiles.pages || 0;
    const currentPage = Number(initialFilters.page) || 1;
    const buildHref = (overrides) => {
        const query = buildQueryString(filters, overrides);
        return query ? `${basePath}?${query}` : basePath;
    };

    return (
        <div className="flex h-full flex-col bg-gray-50">
            <main className="flex-1 overflow-hidden">
                <div className="w-full space-y-6 px-6 py-6">
                    <section className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <FolderIcon className="h-10 w-10 rounded-md bg-blue-50 p-2 text-blue-600" />
                                    <div>
                                        <h1 className="text-2xl font-semibold text-gray-900">Quản lý File</h1>
                                        <p className="text-sm text-gray-500">Theo dõi file dự án, nhiệm vụ và thư mục cá nhân của bạn</p>
                                    </div>
                                </div>
                            </div>

                            <FileFilters
                                initialFilters={filters}
                                scopeOptions={scopeOptions}
                                kindOptions={kindOptions}
                                sortByOptions={sortByOptions}
                                sortOrderOptions={sortOrderOptions}
                                defaults={{ ...filterDefaults, view: defaultView }}
                                searchPlaceholder={searchPlaceholder || 'Tìm theo tên file...'}
                                basePath={basePath}
                            />
                        </div>
                    </section>

                    <section className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
                        <FileStatsCard stats={stats} />
                    </section>

                    <section className="rounded-md border border-gray-200 bg-white shadow-sm">
                        <div className="h-[90vh] overflow-auto p-6">
                            {files.length === 0 ? (
                                <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-gray-500">
                                    <File className="h-12 w-12 text-gray-300" />
                                    <p className="mt-3 text-lg font-medium">Không tìm thấy file phù hợp</p>
                                    <p className="text-sm">Thử thay đổi bộ lọc hoặc tìm kiếm khác</p>
                                </div>
                            ) : viewMode === VIEW_MODES.grid ? (
                                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                    {files.map((file, index) => (
                                        <article
                                            key={file.id}
                                            className="group flex h-full flex-col gap-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                                        >
                                            <FilePrefetcher file={file} priority={index < 6} />
                                            <div className="flex items-start gap-3">
                                                <FileThumbnail file={file} />
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="truncate text-sm font-semibold text-gray-900" title={file.name}>{file.name}</h3>
                                                    <p className="text-xs text-gray-500" title={file.mime}>{file.mime || 'Không xác định'}</p>
                                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                                        {file.project && (
                                                            <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-600">{file.project.name}</span>
                                                        )}
                                                        {file.task && (
                                                            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-emerald-600" title={file.task.title}>{file.task.title}</span>
                                                        )}
                                                        {file.team && (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-indigo-600">
                                                                <Users className="h-3 w-3" />
                                                                {file.team.name || 'Team'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                                                <span>{formatSize(file.size)}</span>
                                                <span>Cập nhật {formatRelativeDate(file.updatedAt)}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <FileOwner label="Người tải" user={file.uploadedBy} />
                                                {file.modifiedBy && <FileOwner label="Chỉnh sửa" user={file.modifiedBy} />}
                                            </div>
                                            <div className="mt-auto flex justify-end">
                                                <FileActions file={file} />
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-md border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                <th className="px-4 py-3">Tên file</th>
                                                <th className="px-4 py-3">Vị trí</th>
                                                <th className="px-4 py-3">Người tải</th>
                                                <th className="px-4 py-3">Kích thước</th>
                                                <th className="px-4 py-3">Cập nhật</th>
                                                <th className="px-4 py-3 text-right">Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {files.map((file, index) => (
                                                <tr key={file.id} className="hover:bg-gray-50">
                                                    <FilePrefetcher file={file} priority={index < 6} />
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <FileThumbnail file={file} size="sm" />
                                                            <div className="min-w-0">
                                                                <p className="truncate font-medium text-gray-900" title={file.name}>{file.name}</p>
                                                                <p className="text-xs text-gray-500" title={file.mime}>{file.mime || '—'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500">
                                                        {file.project && <div className="truncate" title={file.project.name}>{file.project.name}</div>}
                                                        {file.task && <div className="truncate" title={file.task.title}>{file.task.title}</div>}
                                                        {file.team && <div className="truncate" title={file.team.name}>{file.team.name}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500">
                                                        {file.uploadedBy ? file.uploadedBy.name || file.uploadedBy.userId : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500">{formatSize(file.size)}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-500">{formatRelativeDate(file.updatedAt)}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end">
                                                            <FileActions file={file} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>

                    {pages > 1 && (
                        <section className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                                <p>
                                    Trang {currentPage} / {pages} • Tổng {initialFiles.total} file
                                </p>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={buildHref({ page: Math.max(1, currentPage - 1) })}
                                        className={`rounded-md border px-3 py-1 transition ${
                                            currentPage === 1
                                                ? 'cursor-not-allowed border-gray-200 text-gray-300'
                                                : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        Trước
                                    </Link>
                                    <Link
                                        href={buildHref({ page: Math.min(pages, currentPage + 1) })}
                                        className={`rounded-md border px-3 py-1 transition ${
                                            currentPage === pages
                                                ? 'cursor-not-allowed border-gray-200 text-gray-300'
                                                : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        Sau
                                    </Link>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
}

function FileThumbnail({ file, size = 'md' }) {
    const { icon: Icon, badgeClass } = getFileIconConfig(file);
    const thumbnailUrl = file.access?.thumbnailUrl || null;
    const dimensionClass = size === 'sm' ? 'h-10 w-10' : 'h-12 w-12';
    const dimension = size === 'sm' ? 40 : 48;

    if (thumbnailUrl && file.kind === 'image') {
        return (
            <div className={`overflow-hidden rounded-md border border-gray-200 ${dimensionClass}`}>
                <Image
                    src={thumbnailUrl}
                    alt={file.name || 'File thumbnail'}
                    width={dimension}
                    height={dimension}
                    className="h-full w-full object-cover"
                    sizes={`${dimension}px`}
                    unoptimized
                    decoding="async"
                    loading="lazy"
                />
            </div>
        );
    }

    return (
        <div className={`flex ${dimensionClass} items-center justify-center rounded-md ${badgeClass}`}>
            <Icon className="h-5 w-5" />
        </div>
    );
}
