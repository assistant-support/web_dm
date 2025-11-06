// components/team/TeamAnalytics.js
// Server Component - Clean & Efficient Dashboard

import { Users, Briefcase, Trophy, CheckCircle2, Clock, Target, TrendingUp, TrendingDown } from 'lucide-react';
import TeamAnalyticsCharts from './TeamAnalyticsCharts.client.js';

export default function TeamAnalytics({ analytics }) {
    if (!analytics) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Không có dữ liệu analytics</p>
            </div>
        );
    }

    const formatDuration = (seconds) => {
        if (!seconds) return '0h';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return hours > 0 ? `${hours}h` : `${minutes}m`;
    };

    // Prepare 4-month comparison data
    const now = new Date();
    const monthlyData = [];
    for (let i = -1; i < 3; i++) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const ym = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        const trendItem = analytics.trend?.find(t => t.ym === ym);
        const isCurrentMonth = i === 0;
        
        monthlyData.push({
            label: targetDate.toLocaleDateString('vi-VN', { month: 'short' }),
            ym,
            points: trendItem?.points || 0,
            tasks: trendItem?.tasks || 0,
            isCurrent: isCurrentMonth
        });
    }

    const avgPointsPerTask = analytics.allTime.tasks > 0 ? Math.round(analytics.allTime.points / analytics.allTime.tasks) : 0;
    const lastMonth = analytics.trend[analytics.trend.length - 2];
    const thisMonth = analytics.trend[analytics.trend.length - 1];
    const pointsChange = lastMonth && lastMonth.points > 0 ? ((thisMonth.points - lastMonth.points) / lastMonth.points * 100).toFixed(1) : 0;
    const isPositiveTrend = pointsChange >= 0;

    return (
        <div className="space-y-4">
            {/* Compact Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Members */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{analytics.activeMembersCount}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Thành viên</p>
                </div>

                {/* Projects */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded bg-purple-50 flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-4 h-4 text-purple-600" />
                        </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{analytics.activeProjects}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Dự án</p>
                </div>

                {/* Monthly Points */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded bg-yellow-50 flex items-center justify-center flex-shrink-0">
                            <Trophy className="w-4 h-4 text-yellow-600" />
                        </div>
                        {pointsChange !== 0 && (
                            <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${isPositiveTrend ? 'text-green-600' : 'text-red-600'}`}>
                                {isPositiveTrend ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {isPositiveTrend ? '+' : ''}{pointsChange}%
                            </span>
                        )}
                    </div>
                    <p className="text-lg font-bold text-gray-900">{analytics.currentMonth.points}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Điểm tháng</p>
                </div>

                {/* Tasks */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{analytics.currentMonth.tasks}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Tasks</p>
                </div>

                {/* Avg Points */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <Target className="w-4 h-4 text-indigo-600" />
                        </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{avgPointsPerTask}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Điểm TB</p>
                </div>

                {/* Duration */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 text-gray-600" />
                        </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{formatDuration(analytics.currentMonth.durationSec)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Thời gian</p>
                </div>
            </div>

            {/* Charts */}
            <TeamAnalyticsCharts monthlyData={monthlyData} />
        </div>
    );
}
