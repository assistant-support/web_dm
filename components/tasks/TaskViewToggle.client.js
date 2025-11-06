// components/tasks/TaskViewToggle.client.js
'use client';

import { useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';

/**
 * TaskViewToggle - Toggle giữa Kanban và List view
 * Chỉ handle toggle, render content được pass vào
 * @param {Object} props
 * @param {ReactNode} props.kanbanView - Kanban view component
 * @param {ReactNode} props.listView - List view component
 */
export default function TaskViewToggle({ kanbanView, listView }) {
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'

    return (
        <div className="space-y-4">
            {/* Toggle buttons */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Công việc</h2>
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('kanban')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'kanban'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Kanban
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'list'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <List className="h-4 w-4" />
                        Danh sách
                    </button>
                </div>
            </div>

            {/* View content */}
            <div style={{ display: viewMode === 'kanban' ? 'block' : 'none' }}>
                {kanbanView}
            </div>
            <div style={{ display: viewMode === 'list' ? 'block' : 'none' }}>
                {listView}
            </div>
        </div>
    );
}
