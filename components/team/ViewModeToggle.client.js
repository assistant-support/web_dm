// components/team/ViewModeToggle.client.js
// Client Component - Toggle view mode với URL params

'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { LayoutGrid, List } from 'lucide-react';

/**
 * ViewModeToggle Client Component
 * Toggle giữa card và list view, sync với URL params
 */
export default function ViewModeToggle() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    // Lấy view mode từ URL, default = 'card'
    const viewMode = searchParams.get('view') || 'card';

    const setViewMode = (mode) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', mode);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1 ">
            <button
                onClick={() => setViewMode('card')}
                className={`rounded px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    viewMode === 'card'
                        ? 'bg-[var(--brand-600)] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                aria-label="Xem dạng thẻ"
                title="Xem dạng thẻ"
            >
                <LayoutGrid className="h-4 w-4" />
            </button>
            <button
                onClick={() => setViewMode('list')}
                className={`rounded px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    viewMode === 'list'
                        ? 'bg-[var(--brand-600)] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                aria-label="Xem dạng danh sách"
                title="Xem dạng danh sách"
            >
                <List className="h-4 w-4" />
            </button>
        </div>
    );
}
