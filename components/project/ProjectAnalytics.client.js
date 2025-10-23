// components/project/ProjectAnalytics.client.js
'use client';

import { useState, useEffect } from 'react';
import { BarChart3, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { getAnalytics } from '@/data/project/actions/analytics.js';

export default function ProjectAnalytics({ projectId }) {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, [projectId]);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const result = await getAnalytics(projectId);
            if (result.ok) {
                setAnalytics(result.data);
            }
        } catch (error) {
            console.error('Load analytics error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return null;
    }

    const { tasks, trend, completionRate } = analytics;

    // Stats cards config
    const statsCards = [
        {
            label: 'Tổng số task',
            value: tasks.totalTasks,
            icon: BarChart3,
            color: 'bg-blue-100 text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
        },
        {
            label: 'Hoàn thành',
            value: tasks.completedTasks,
            icon: CheckCircle,
            color: 'bg-green-100 text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
        },
        {
            label: 'Đang thực hiện',
            value: tasks.inProgressTasks,
            icon: Clock,
            color: 'bg-yellow-100 text-yellow-600',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
        },
        {
            label: 'Quá hạn',
            value: tasks.overdueTasks,
            icon: AlertCircle,
            color: 'bg-red-100 text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
        },
    ];

    // Calculate max value for chart scaling
    const maxValue = Math.max(
        ...trend.map(t => Math.max(t.created, t.completed)),
        1
    );

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Thống kê dự án</h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                        Tỷ lệ hoàn thành: {completionRate}%
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">
                        {completionRate}%
                    </span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={index}
                            className={`${stat.bgColor} border ${stat.borderColor} rounded-lg p-4`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600">{stat.label}</p>
                                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Trend Chart */}
            {trend.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-4">
                        Xu hướng 6 tháng gần đây
                    </h4>
                    <div className="space-y-2">
                        {trend.map((item, index) => {
                            const monthLabel = `Tháng ${item.month}/${item.year}`;
                            const createdWidth = (item.created / maxValue) * 100;
                            const completedWidth = (item.completed / maxValue) * 100;

                            return (
                                <div key={index} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600 font-medium">{monthLabel}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-blue-600">Tạo: {item.created}</span>
                                            <span className="text-green-600">Hoàn thành: {item.completed}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                                            <div
                                                className="bg-blue-500 h-full rounded-full transition-all duration-300"
                                                style={{ width: `${createdWidth}%` }}
                                            />
                                        </div>
                                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                                            <div
                                                className="bg-green-500 h-full rounded-full transition-all duration-300"
                                                style={{ width: `${completedWidth}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">Task được tạo</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">Task hoàn thành</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
