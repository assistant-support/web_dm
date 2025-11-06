import { BarChart3, CheckCircle, Clock, AlertCircle, Target, TrendingUp } from 'lucide-react';
import { vi } from '@/lib/i18n-vi';

export default function ProjectMetrics({ taskStats, completionRate }) {
    const stats = taskStats || {};

    const metricsCards = [
        {
            label: 'Tổng công việc',
            value: stats.totalTasks || 0,
            icon: BarChart3,
            gradient: 'from-blue-500 to-cyan-500',
            bgGradient: 'from-blue-50 to-cyan-50',
            iconBg: 'bg-blue-100',
            textColor: 'text-blue-700',
            description: 'Tất cả task trong dự án',
        },
        {
            label: 'Hoàn thành',
            value: stats.completedTasks || 0,
            icon: CheckCircle,
            gradient: 'from-green-500 to-emerald-500',
            bgGradient: 'from-green-50 to-emerald-50',
            iconBg: 'bg-green-100',
            textColor: 'text-green-700',
            description: 'Task đã hoàn thành',
        },
        {
            label: 'Đang thực hiện',
            value: stats.inProgressTasks || 0,
            icon: Clock,
            gradient: 'from-amber-500 to-orange-500',
            bgGradient: 'from-amber-50 to-orange-50',
            iconBg: 'bg-amber-100',
            textColor: 'text-amber-700',
            description: 'Task đang làm',
        },
        {
            label: 'Chờ làm',
            value: stats.pendingTasks || 0,
            icon: AlertCircle,
            gradient: 'from-gray-500 to-slate-500',
            bgGradient: 'from-gray-50 to-slate-50',
            iconBg: 'bg-gray-100',
            textColor: 'text-gray-700',
            description: 'Task chưa bắt đầu',
        },
        {
            label: 'Tỷ lệ hoàn thành',
            value: `${Math.round(completionRate || 0)}%`,
            icon: TrendingUp,
            gradient: 'from-purple-500 to-pink-500',
            bgGradient: 'from-purple-50 to-pink-50',
            iconBg: 'bg-purple-100',
            textColor: 'text-purple-700',
            description: 'Tiến độ tổng thể',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {metricsCards.map((metric, idx) => {
                const Icon = metric.icon;
                return (
                    <div
                        key={idx}
                        className={`relative overflow-hidden bg-white border border-gray-200 rounded-xl p-5`}
                    >
                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                        {metric.label}
                                    </p>
                                    <p className={`text-3xl font-bold ${metric.textColor}`}>
                                        {metric.value}
                                    </p>
                                </div>
                                <div className={`${metric.iconBg} p-3 rounded-xl`}>
                                    <Icon className={`h-6 w-6 ${metric.textColor}`} />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">
                                {metric.description}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
