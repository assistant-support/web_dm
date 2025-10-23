// components/team/TeamAnalytics.client.js
'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, Briefcase, Trophy, CheckCircle2, Clock, BarChart3 } from 'lucide-react';
import { getAnalytics } from '@/data/team/actions/analytics.js';

/**
 * TeamAnalytics Component
 * Hiển thị dashboard analytics tổng quan của team
 */
export default function TeamAnalytics({ teamId }) {
    const [analytics, setAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, [teamId]);

    const loadAnalytics = async () => {
        setIsLoading(true);
        try {
            const result = await getAnalytics({ teamId });
            if (result.ok) {
                setAnalytics(result.data);
            }
        } catch (error) {
            console.error('Load analytics error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0h';
        const hours = Math.floor(seconds / 3600);
        return `${hours}h`;
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
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

    const stats = [
        {
            label: 'Thành viên hoạt động',
            value: analytics.activeMembersCount,
            icon: Users,
            color: 'blue',
            bgColor: 'bg-blue-100',
            iconColor: 'text-blue-600'
        },
        {
            label: 'Tổng dự án',
            value: `${analytics.activeProjects}/${analytics.totalProjects}`,
            subLabel: 'Đang hoạt động',
            icon: Briefcase,
            color: 'purple',
            bgColor: 'bg-purple-100',
            iconColor: 'text-purple-600'
        },
        {
            label: 'Tổng điểm (Toàn thời gian)',
            value: analytics.allTime.points.toLocaleString(),
            subLabel: `${analytics.allTime.tasks} tasks`,
            icon: Trophy,
            color: 'yellow',
            bgColor: 'bg-yellow-100',
            iconColor: 'text-yellow-600'
        },
        {
            label: 'Tháng này',
            value: analytics.currentMonth.points.toLocaleString(),
            subLabel: `${analytics.currentMonth.tasks} tasks`,
            icon: CheckCircle2,
            color: 'green',
            bgColor: 'bg-green-100',
            iconColor: 'text-green-600'
        }
    ];

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[var(--brand-600)]" />
                    <h3 className="text-lg font-semibold text-gray-900">Tổng quan</h3>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                    Thống kê và hiệu suất của nhóm
                </p>
            </div>

            {/* Stats cards */}
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className="relative overflow-hidden rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-all"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 mb-2">
                                        {stat.label}
                                    </p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {stat.value}
                                    </p>
                                    {stat.subLabel && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {stat.subLabel}
                                        </p>
                                    )}
                                </div>
                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Trend chart (simple bars) */}
                <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-gray-900">Xu hướng 6 tháng gần đây</h4>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-[var(--brand-600)]"></div>
                                <span>Điểm</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-green-500"></div>
                                <span>Tasks</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-end justify-between gap-2 h-40">
                        {analytics.trend.map((item, index) => {
                            const maxPoints = Math.max(...analytics.trend.map(t => t.points), 1);
                            const maxTasks = Math.max(...analytics.trend.map(t => t.tasks), 1);
                            const pointsHeight = (item.points / maxPoints) * 100;
                            const tasksHeight = (item.tasks / maxTasks) * 100;
                            
                            return (
                                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="w-full flex items-end justify-center gap-1 h-32">
                                        <div
                                            className="flex-1 bg-[var(--brand-600)] rounded-t transition-all hover:opacity-80"
                                            style={{ height: `${pointsHeight}%` }}
                                            title={`${item.points} điểm`}
                                        ></div>
                                        <div
                                            className="flex-1 bg-green-500 rounded-t transition-all hover:opacity-80"
                                            style={{ height: `${tasksHeight}%` }}
                                            title={`${item.tasks} tasks`}
                                        ></div>
                                    </div>
                                    <div className="text-xs text-gray-600 font-medium">
                                        {item.month}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Additional info */}
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>Thời gian làm việc tháng này:</span>
                        <span className="font-medium text-gray-900">
                            {formatDuration(analytics.currentMonth.durationSec)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-green-700 font-medium">
                            Hoạt động
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
