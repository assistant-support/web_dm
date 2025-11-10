'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, LayoutGrid, List, Search, XCircle, FolderTree } from 'lucide-react';

const BASE_DEFAULT_FILTERS = Object.freeze({
    search: '',
    scope: 'all',
    kind: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    view: 'grid',
    projectId: '',
    taskId: '',
});

function normalizeFilters(initial = {}, defaults = BASE_DEFAULT_FILTERS) {
    const normalized = { ...defaults };
    Object.keys(defaults).forEach((key) => {
        const value = initial[key];
        if (value === undefined || value === null) {
            return;
        }
        const stringValue = typeof value === 'string' ? value : String(value);
        normalized[key] = stringValue;
    });
    return normalized;
}

function countActiveFilters(filters, defaults = BASE_DEFAULT_FILTERS) {
    const trackedKeys = ['search', 'scope', 'kind', 'projectId', 'taskId'];
    let count = trackedKeys.reduce((acc, key) => {
        const current = filters[key] ?? '';
        const defaultValue = defaults[key] ?? '';
        if (!current) return acc;
        if (current === defaultValue) return acc;
        return acc + 1;
    }, 0);

    const sortChanged =
        filters.sortBy !== defaults.sortBy || filters.sortOrder !== defaults.sortOrder;
    if (sortChanged) count += 1;

    return count;
}

export default function FileFilters({
    initialFilters,
    scopeOptions = [],
    kindOptions = [],
    sortByOptions = [],
    sortOrderOptions = [],
    defaults = {},
    searchPlaceholder = 'Tìm theo tên file...',
    basePath = '/files',
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mergedDefaults = useMemo(
        () => ({ ...BASE_DEFAULT_FILTERS, ...defaults }),
        [defaults],
    );
    const normalized = useMemo(
        () => normalizeFilters(initialFilters, mergedDefaults),
        [initialFilters, mergedDefaults],
    );
    const [searchTerm, setSearchTerm] = useState(normalized.search || '');
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const hasScopeFilter = scopeOptions && scopeOptions.length > 1;

    useEffect(() => {
        setSearchTerm(normalized.search || '');
    }, [normalized.search]);

    const activeFilterCount = useMemo(
        () => countActiveFilters(normalized, mergedDefaults),
        [normalized, mergedDefaults],
    );

    const runUpdate = (params) => {
        const query = params.toString();
        const target = query ? `${basePath}?${query}` : basePath;
        startTransition(() => {
            router.replace(target, { scroll: false });
            router.refresh();
        });
    };

    const updateParams = (updates, { preservePage = false } = {}) => {
        const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
        Object.entries(updates).forEach(([key, rawValue]) => {
            if (!(key in mergedDefaults)) {
                if (rawValue === undefined || rawValue === null || rawValue === '') {
                    params.delete(key);
                } else {
                    params.set(key, String(rawValue));
                }
                return;
            }

            const defaultValue = mergedDefaults[key];
            const value = typeof rawValue === 'string' ? rawValue : rawValue === undefined || rawValue === null ? '' : String(rawValue);
            if (!value || value === defaultValue) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });

        if (!preservePage) {
            params.delete('page');
        }

        runUpdate(params);
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        updateParams({ search: searchTerm.trim() });
    };

    const handleViewChange = (mode) => {
        if (mode === normalized.view) return;
        updateParams({ view: mode }, { preservePage: true });
    };

    const handleSelectChange = (key) => (event) => {
        updateParams({ [key]: event.target.value });
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
        Object.keys(mergedDefaults).forEach((key) => params.delete(key));
        if (normalized.view && normalized.view !== mergedDefaults.view) {
            params.set('view', normalized.view);
        }
        params.delete('page');
        runUpdate(params);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <form onSubmit={handleSearchSubmit} className="flex flex-1 min-w-[240px] items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                    updateParams({ search: '' });
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-600"
                                aria-label="Xóa tìm kiếm"
                                disabled={isPending}
                            >
                                <XCircle className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        disabled={isPending}
                    >
                        Tìm
                    </button>
                </form>

                <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => handleViewChange('grid')}
                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                                normalized.view === 'grid'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                            disabled={isPending}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            <span className="hidden sm:inline">Lưới</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleViewChange('list')}
                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                                normalized.view === 'list'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                            disabled={isPending}
                        >
                            <List className="h-4 w-4" />
                            <span className="hidden sm:inline">Danh sách</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleViewChange('drive')}
                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                                normalized.view === 'drive'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                            disabled={isPending}
                        >
                            <FolderTree className="h-4 w-4" />
                            <span className="hidden sm:inline">Thư mục</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsFiltersOpen((prev) => !prev)}
                        className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
                            isFiltersOpen || activeFilterCount > 0
                                ? 'border-blue-500 bg-blue-50 text-blue-600'
                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                        disabled={isPending}
                    >
                        <Filter className="h-4 w-4" />
                        Bộ lọc
                        {activeFilterCount > 0 && (
                            <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {activeFilterCount > 0 && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="text-sm font-medium text-red-600 hover:text-red-700"
                            disabled={isPending}
                        >
                            Xóa lọc
                        </button>
                    )}
                </div>
            </div>

            {isFiltersOpen && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {hasScopeFilter && (
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="file-scope" className="text-xs font-medium text-gray-500">Phạm vi</label>
                            <select
                                id="file-scope"
                                value={normalized.scope}
                                onChange={handleSelectChange('scope')}
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                disabled={isPending}
                            >
                                {scopeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="file-kind" className="text-xs font-medium text-gray-500">Loại file</label>
                        <select
                            id="file-kind"
                            value={normalized.kind}
                            onChange={handleSelectChange('kind')}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={isPending}
                        >
                            {kindOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="file-sortBy" className="text-xs font-medium text-gray-500">Sắp xếp</label>
                        <select
                            id="file-sortBy"
                            value={normalized.sortBy}
                            onChange={handleSelectChange('sortBy')}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={isPending}
                        >
                            {sortByOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="file-sortOrder" className="text-xs font-medium text-gray-500">Thứ tự</label>
                        <select
                            id="file-sortOrder"
                            value={normalized.sortOrder}
                            onChange={handleSelectChange('sortOrder')}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={isPending}
                        >
                            {sortOrderOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
