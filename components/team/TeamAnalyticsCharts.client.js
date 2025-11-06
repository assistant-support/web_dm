'use client';

import { BarChart3 } from 'lucide-react';

export default function TeamAnalyticsCharts({ monthlyData }) {
    const maxPoints = Math.max(...monthlyData.map(d => d.points), 1);
    const maxTasks = Math.max(...monthlyData.map(d => d.tasks), 1);

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <BarChart3 className="w-4 h-4 text-[var(--brand-600)]" />
                <h3 className="text-sm font-semibold text-gray-900">So sánh 4 tháng</h3>
            </div>
            
            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Points */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-[var(--brand-600)]"></div>
                        <p className="text-xs font-semibold text-gray-700">Điểm số</p>
                    </div>
                    <div className="space-y-2.5">
                        {monthlyData.map((item, index) => {
                            const widthPercent = (item.points / maxPoints) * 100;
                            return (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-gray-600">{item.label}</span>
                                        <span className={`text-xs font-semibold ${item.isCurrent ? 'text-[var(--brand-600)]' : 'text-gray-700'}`}>
                                            {item.points}
                                        </span>
                                    </div>
                                    <div className="h-6 bg-gray-100 rounded overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-300 ${
                                                item.isCurrent 
                                                    ? 'bg-[var(--brand-600)]' 
                                                    : 'bg-gray-300'
                                            }`}
                                            style={{ width: `${Math.max(widthPercent, 2)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Tasks */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-green-600"></div>
                        <p className="text-xs font-semibold text-gray-700">Nhiệm vụ</p>
                    </div>
                    <div className="space-y-2.5">
                        {monthlyData.map((item, index) => {
                            const widthPercent = (item.tasks / maxTasks) * 100;
                            return (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-gray-600">{item.label}</span>
                                        <span className={`text-xs font-semibold ${item.isCurrent ? 'text-green-600' : 'text-gray-700'}`}>
                                            {item.tasks}
                                        </span>
                                    </div>
                                    <div className="h-6 bg-gray-100 rounded overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-300 ${
                                                item.isCurrent 
                                                    ? 'bg-green-600' 
                                                    : 'bg-gray-300'
                                            }`}
                                            style={{ width: `${Math.max(widthPercent, 2)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
