'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Loader2, X, FolderTree, Check } from 'lucide-react';
import { moveFileAction } from '@/app/actions/move-file.js';
import { getFolderTreeAction } from '@/app/actions/get-folder-tree.js';

const PROJECT_ROOT_KEY = '__PROJECT_ROOT__';

export default function MoveFileModal({
    file,
    projectId,
    currentTaskId = null,
    onClose,
    onMoved,
}) {
    const [isLoading, setIsLoading] = useState(true);
    const [treeData, setTreeData] = useState([]);
    const [projectMeta, setProjectMeta] = useState({ id: null, name: 'Thư mục dự án' });
    const [loadError, setLoadError] = useState(null);
    const [selectedNode, setSelectedNode] = useState(currentTaskId ?? PROJECT_ROOT_KEY);
    const [submitError, setSubmitError] = useState(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setSelectedNode(currentTaskId ?? PROJECT_ROOT_KEY);
    }, [currentTaskId, projectId, file?.id]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!projectId) {
                setTreeData([]);
                setIsLoading(false);
                setProjectMeta({ id: null, name: 'Thư mục dự án' });
                return;
            }
            setIsLoading(true);
            setLoadError(null);
            try {
                const response = await getFolderTreeAction(projectId);
                const tasks = response?.project?.tasks ?? [];
                const projectName = response?.project?.name || 'Thư mục dự án';
                if (!cancelled) {
                    setTreeData(tasks);
                    setProjectMeta({
                        id: response?.project?.id || null,
                        name: projectName,
                    });
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('[MoveFileModal] load tree failed', error);
                    setLoadError('Không thể tải danh sách thư mục.');
                    setTreeData([]);
                    setProjectMeta({ id: null, name: 'Thư mục dự án' });
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [projectId]);

    const isDirty = useMemo(() => {
        const currentKey = currentTaskId ?? PROJECT_ROOT_KEY;
        return selectedNode !== currentKey;
    }, [currentTaskId, selectedNode]);

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!file?.id) {
            return;
        }
        if (!projectId) {
            setSubmitError('Thiếu projectId đích.');
            return;
        }
        if (!isDirty || isPending) {
            return;
        }
        const destinationTaskId = selectedNode === PROJECT_ROOT_KEY ? null : selectedNode;
        startTransition(async () => {
            setSubmitError(null);
            try {
                await moveFileAction({
                    attachmentId: String(file.id),
                    projectId: String(projectId),
                    taskId: destinationTaskId ? String(destinationTaskId) : null,
                });
                if (typeof onMoved === 'function') {
                    onMoved({ taskId: destinationTaskId });
                }
                if (typeof onClose === 'function') {
                    onClose();
                }
            } catch (error) {
                console.error('[MoveFileModal] move failed', error);
                setSubmitError(error?.message || 'Không thể di chuyển file.');
            }
        });
    };

    const renderTree = (nodes = [], depth = 0) => {
        return (
            <ul className="space-y-1">
                {nodes.map((node) => {
                    const key = node.id ?? '';
                    const children = Array.isArray(node.children) ? node.children : [];
                    const isActive = selectedNode === key;
                    return (
                        <li key={key}>
                            <button
                                type="button"
                                onClick={() => setSelectedNode(key)}
                                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                                    isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                                style={{ paddingLeft: `${12 + depth * 16}px` }}
                            >
                                <span className="flex items-center gap-2">
                                    <FolderTree className="h-4 w-4" />
                                    <span className="truncate" title={node.title || node.name || 'Không tên'}>
                                        {node.title || node.name || 'Không tên'}
                                    </span>
                                </span>
                                {isActive && <Check className="h-4 w-4" />}
                            </button>
                            {children.length > 0 && (
                                <div className="ml-4 border-l border-gray-200 pl-2">
                                    {renderTree(children, depth + 1)}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
                <header className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Di chuyển file</h2>
                        <p className="text-sm text-gray-500">
                            Chọn thư mục đích để di chuyển <span className="font-medium text-gray-700">{file?.name}</span>.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-2 text-gray-500 transition hover:bg-gray-100"
                        title="Đóng"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-4">
                    <section className="flex flex-col gap-2">
                        <h3 className="text-sm font-medium text-gray-700">Thư mục đích</h3>
                        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                            <button
                                type="button"
                                onClick={() => setSelectedNode(PROJECT_ROOT_KEY)}
                                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                                    selectedNode === PROJECT_ROOT_KEY
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <FolderTree className="h-4 w-4" />
                                    <span className="truncate" title={projectMeta.name}>{projectMeta.name}</span>
                                </span>
                                {selectedNode === PROJECT_ROOT_KEY && <Check className="h-4 w-4" />}
                            </button>

                            <div className="mt-2 max-h-72 overflow-y-auto">
                                {isLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Đang tải danh sách thư mục...</span>
                                    </div>
                                ) : loadError ? (
                                    <p className="text-sm text-red-600">{loadError}</p>
                                ) : treeData.length === 0 ? (
                                    <p className="text-sm text-gray-500">Chưa có task hay thư mục con.</p>
                                ) : (
                                    renderTree(treeData)
                                )}
                            </div>
                        </div>
                    </section>

                    {submitError && <p className="text-sm text-red-600">{submitError}</p>}

                    <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={!isDirty || isPending}
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            <span>Di chuyển</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

