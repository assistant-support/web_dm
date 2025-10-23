// components/tasks/TaskToolbar.js
'use client';

import { List, LayoutGrid, Calendar, BarChart3 } from 'lucide-react';

/**
 * TaskToolbar - Toggle between List, Kanban, Calendar, and Gantt views
 */
export default function TaskToolbar({ view, onViewChange }) {
    const tabs = [
        { key: 'list', label: 'Danh sách', icon: List },
        { key: 'kanban', label: 'Kanban', icon: LayoutGrid },
        { key: 'calendar', label: 'Lịch', icon: Calendar },
        { key: 'gantt', label: 'Gantt', icon: BarChart3 },
    ];

    return (
        <div className="flex items-center justify-between">
            {/* View toggle */}
            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1 gap-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => onViewChange?.(tab.key)}
                            aria-label={`Chuyển sang ${tab.label}`}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer
                                ${view === tab.key
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }
                            `}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
