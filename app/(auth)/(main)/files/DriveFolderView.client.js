'use client';

import { useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FolderIcon, FolderOpen, ChevronRight, Home, File as FileIcon, ArrowRightLeft, Copy, Check } from 'lucide-react';
import FileActions from './FileActions.client.js';
import FilePrefetcher from './FilePrefetcher.client.js';
import { getFileIconConfig } from './file-icon.config.js';
import { formatSize, formatRelativeDate } from './file-format.js';
import MoveFileModal from './MoveFileModal.client.js';
import { getGoogleDriveFolderLink } from '@/lib/drive-utils.js';

const ROOT_NODE_ID = '__root__';
const UNASSIGNED_PROJECT_ID = '__unassigned__';

export default function DriveFolderView({ files = [] }) {
    const tree = useMemo(() => buildDriveTree(files), [files]);
    const [path, setPath] = useState([]);
    const [movingFile, setMovingFile] = useState(null);
    const [copiedFolderId, setCopiedFolderId] = useState(null);
    const router = useRouter();

    const currentNode = useMemo(() => resolveNode(tree, path), [tree, path]);
    const breadcrumbs = useMemo(() => buildBreadcrumbs(tree, path), [tree, path]);

    const folders = currentNode?.children ?? [];
    const currentFiles = currentNode?.files ?? [];

    const enterNode = useCallback((nodeId) => {
        setPath((prev) => [...prev, nodeId]);
    }, []);

    const goBack = useCallback(() => {
        setPath((prev) => (prev.length ? prev.slice(0, -1) : prev));
    }, []);

    const goToBreadcrumb = useCallback((index) => {
        if (index <= 0) {
            setPath([]);
            return;
        }
        setPath((prev) => prev.slice(0, index));
    }, []);

    const hasNothing = !folders.length && !currentFiles.length;

    const handleRequestMove = useCallback((file) => {
        if (!file) return;
        setMovingFile(file);
    }, []);

    const handleCloseModal = useCallback(() => {
        setMovingFile(null);
    }, []);

    const handleMoved = useCallback(() => {
        router.refresh();
        setMovingFile(null);
    }, [router]);

    const handleCopyFolderLink = useCallback(async (folderId) => {
        const link = getGoogleDriveFolderLink(folderId);
        if (!link) return;

        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(link);
                setCopiedFolderId(folderId);
                setTimeout(() => setCopiedFolderId(null), 2000);
            } else {
                window.prompt('Sao chép link thư mục:', link);
            }
        } catch (error) {
            console.error('Failed to copy folder link', error);
            window.prompt('Sao chép link thư mục:', link);
        }
    }, []);

    return (
        <>
        <div className="flex h-[90vh] flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.id} className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => goToBreadcrumb(index)}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition ${
                                    index === breadcrumbs.length - 1
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {index === 0 ? <Home className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                                <span className="max-w-[160px] truncate text-left" title={crumb.name || 'Chưa đặt tên'}>
                                    {crumb.name || 'Chưa đặt tên'}
                                </span>
                            </button>
                            {index < breadcrumbs.length - 1 && (
                                <ChevronRight className="h-4 w-4 text-gray-300" />
                            )}
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                    disabled={!path.length}
                >
                    ← Quay lại
                </button>
            </div>

            <div className="mt-4 flex-1 space-y-6 overflow-auto">
                {folders.length > 0 && (
                    <section>
                        <h2 className="mb-3 text-sm font-semibold text-gray-600">Thư mục ({folders.length})</h2>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {folders.map((folder) => (
                                <div key={folder.id} className="relative group">
                                    <button
                                        type="button"
                                        onClick={() => enterNode(folder.id)}
                                        className="w-full flex flex-col gap-4 rounded-md border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FolderIcon className="h-10 w-10 rounded-md bg-blue-50 p-2 text-blue-600 transition group-hover:bg-blue-100 group-hover:text-blue-700" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-gray-900" title={folder.name || 'Chưa đặt tên'}>
                                                    {folder.name || 'Chưa đặt tên'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {formatFolderMeta(folder)}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                    {folder.driveFolderId && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopyFolderLink(folder.driveFolderId);
                                            }}
                                            className="absolute top-2 right-2 p-2 rounded-full bg-white shadow-sm border border-gray-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            title="Sao chép link thư mục"
                                        >
                                            {copiedFolderId === folder.driveFolderId ? (
                                                <Check className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {currentFiles.length > 0 && (
                    <section className="rounded-md border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <th className="px-4 py-3">Tên file</th>
                                    <th className="px-4 py-3">Người tải</th>
                                    <th className="px-4 py-3">Kích thước</th>
                                    <th className="px-4 py-3">Cập nhật</th>
                                    <th className="px-4 py-3 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {currentFiles.map((file, index) => (
                                    <DriveFileRow
                                        key={file.id}
                                        file={file}
                                        priority={index < 6}
                                        onRequestMove={handleRequestMove}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                {hasNothing && (
                    <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-gray-500">
                        <FileIcon className="h-12 w-12 text-gray-300" />
                        <p className="mt-3 text-lg font-medium">Không có file hoặc thư mục</p>
                        <p className="text-sm">Thư mục này hiện chưa có nội dung</p>
                    </div>
                )}
            </div>
        </div>

        {movingFile ? (
            <MoveFileModal
                file={movingFile}
                projectId={movingFile.project?.id || null}
                currentTaskId={resolveCurrentTaskId(movingFile)}
                onClose={handleCloseModal}
                onMoved={handleMoved}
            />
        ) : null}
        </>
    );
}

function DriveFileRow({ file, priority, onRequestMove }) {
    const { icon: Icon, badgeClass } = getFileIconConfig(file);
    const thumbnailUrl = file.access?.thumbnailUrl || null;

    return (
        <tr className="hover:bg-gray-50">
            <FilePrefetcher file={file} priority={priority} />
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    {thumbnailUrl && file.kind === 'image' ? (
                        <div className="h-12 w-12 overflow-hidden rounded-md border border-gray-200">
                            <Image
                                src={thumbnailUrl}
                                alt={file.name || 'File thumbnail'}
                                width={48}
                                height={48}
                                className="h-full w-full object-cover"
                                sizes="48px"
                                unoptimized
                                decoding="async"
                                loading="lazy"
                            />
                        </div>
                    ) : (
                        <div className={`flex h-12 w-12 items-center justify-center rounded-md ${badgeClass}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900" title={file.name}>{file.name}</p>
                        {file.taskPath && file.taskPath.length > 1 && (
                            <p className="truncate text-xs text-gray-500" title={taskPathLabel(file.taskPath)}>
                                {taskPathLabel(file.taskPath)}
                            </p>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 text-xs text-gray-500">
                {file.uploadedBy ? file.uploadedBy.name || file.uploadedBy.userId : '—'}
            </td>
            <td className="px-4 py-3 text-xs text-gray-500">{formatSize(file.size)}</td>
            <td className="px-4 py-3 text-xs text-gray-500">{formatRelativeDate(file.updatedAt)}</td>
            <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                    {file.permissions?.canRename || file.permissions?.canDelete ? (
                        <button
                            type="button"
                            onClick={() => onRequestMove?.(file)}
                            className="rounded-md border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50"
                            title="Di chuyển"
                        >
                            <ArrowRightLeft className="h-4 w-4" />
                        </button>
                    ) : null}
                    <FileActions file={file} />
                </div>
            </td>
        </tr>
    );
}

function taskPathLabel(path) {
    return path.map((segment) => segment.title || segment.name || 'Không tên').join(' / ');
}

function resolveCurrentTaskId(file) {
    if (!file) return null;
    if (Array.isArray(file.taskPath) && file.taskPath.length) {
        const last = file.taskPath[file.taskPath.length - 1];
        return last?.id || null;
    }
    if (file.task?.id) return file.task.id;
    return null;
}

function formatFolderMeta(folder) {
    const childCount = folder.children?.length || 0;
    const files = folder.fileCount || 0;
    const parts = [];
    if (childCount) {
        parts.push(`${childCount} thư mục`);
    }
    parts.push(`${files} file`);
    return parts.join(' • ');
}

function buildDriveTree(files) {
    const root = createNode(ROOT_NODE_ID, 'Tất cả dự án', 'root');

    (Array.isArray(files) ? files : []).forEach((file) => {
        const projectId = file.project?.id || UNASSIGNED_PROJECT_ID;
        const projectName = file.project?.name || 'Chưa gán dự án';
        const projectType = file.project ? 'project' : 'uncategorized';
        const projectDriveFolderId = file.project?.driveFolderId || null;
        const projectNode = ensureChild(root, projectId, projectName, projectType, projectDriveFolderId);

        const taskSegments = normalizeTaskSegments(file);
        let targetNode = projectNode;
        if (taskSegments.length) {
            taskSegments.forEach((segment) => {
                const segmentId = segment.id || segment.title || segment.name || '';
                const segmentName = segment.title || segment.name || 'Chưa đặt tên';
                targetNode = ensureChild(targetNode, segmentId, segmentName, 'task', segment.driveFolderId);
            });
        }
        targetNode.files.push(file);
    });

    finalizeNode(root);
    return root;
}

function normalizeTaskSegments(file) {
    if (Array.isArray(file.taskPath) && file.taskPath.length) {
        return file.taskPath.map((segment) => ({
            id: segment.id || segment.taskId || segment,
            title: segment.title || segment.name || null,
            driveFolderId: segment.driveFolderId || null,
        }));
    }
    if (file.task && file.task.id) {
        return [{ 
            id: file.task.id, 
            title: file.task.title || null,
            driveFolderId: file.task.driveFolderId || null,
        }];
    }
    return [];
}

function createNode(id, name, type, driveFolderId = null) {
    return {
        id,
        name,
        type,
        driveFolderId,
        files: [],
        childrenMap: new Map(),
        children: [],
        fileCount: 0,
    };
}

function ensureChild(parent, id, name, type, driveFolderId = null) {
    const key = String(id || `${parent.id}-${type}-${name || 'node'}`);
    if (!parent.childrenMap.has(key)) {
        parent.childrenMap.set(
            key,
            createNode(key, name || 'Chưa đặt tên', type, driveFolderId),
        );
    }
    return parent.childrenMap.get(key);
}

function finalizeNode(node) {
    const children = Array.from(node.childrenMap.values());
    children.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    children.forEach((child) => finalizeNode(child));
    node.children = children;
    node.childLookup = new Map(children.map((child) => [child.id, child]));
    node.fileCount = (node.files?.length || 0) + children.reduce((acc, child) => acc + (child.fileCount || 0), 0);
    node.childrenMap = undefined;
}

function resolveNode(root, path) {
    if (!root) return null;
    let current = root;
    for (const id of path) {
        const next = current.childLookup?.get(id);
        if (!next) {
            return current;
        }
        current = next;
    }
    return current;
}

function buildBreadcrumbs(root, path) {
    const breadcrumbs = [{ id: root.id, name: root.name, type: root.type }];
    if (!path.length) {
        return breadcrumbs;
    }
    let current = root;
    path.forEach((id) => {
        const next = current.childLookup?.get(id);
        if (!next) {
            return;
        }
        breadcrumbs.push({ id: next.id, name: next.name, type: next.type });
        current = next;
    });
    return breadcrumbs;
}
