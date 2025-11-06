// components/project/analytics/ProjectVitals.client.js
'use client';

import { FolderClock, Eye, Hourglass, CalendarClock } from 'lucide-react';
import { differenceInDays, formatDistanceToNowStrict } from 'date-fns';
import { vi } from 'date-fns/locale';
import { t } from '@/lib/i18n-vi';

// Helper tính toán thời gian còn lại
const getTimeRemaining = (dueDate) => {
    if (!dueDate) return { text: t('task.noDueDate'), color: 'text-gray-500' };

    const now = new Date();
    const due = new Date(dueDate);
    const daysDiff = differenceInDays(due, now);

    if (daysDiff < 0) {
        return { text: `${Math.abs(daysDiff)} ngày quá hạn`, color: 'text-red-600 font-bold' };
    }
    if (daysDiff === 0) {
        return { text: 'Hết hạn hôm nay', color: 'text-orange-600 font-semibold' };
    }
    if (daysDiff === 1) {
        return { text: 'Hết hạn ngày mai', color: 'text-yellow-600' };
    }
    // Sử dụng formatDistanceToNowStrict cho khoảng thời gian chính xác hơn
    return {
        text: `Còn ${formatDistanceToNowStrict(due, now, { locale: vi, addSuffix: false, unit: 'day' })}`,
        color: 'text-green-600'
    };
};

export default function ProjectVitals({ project, taskStats }) {
    const stats = taskStats || {};
    const timeRemaining = getTimeRemaining(project.dueDate);

    const kpis = [
        {
            label: t('task.overdue'), // "Quá hạn"
            value: stats.overdueTasks || 0,
            icon: FolderClock,
            color: 'text-red-600',
            bg: 'bg-red-50',
        },
        {
            label: t('taskStatus.completed_await_review'), // "Chờ Review"
            value: stats.completedAwaitReviewTasks || 0, // Giả sử processor trả về key này
            icon: Eye,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
        },
        {
            label: t('taskStatus.in_progress'), // "Đang thực hiện"
            value: stats.inProgressTasks || 0,
            icon: Hourglass,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            label: t('common.timeRemaining'), // "Thời gian còn lại"
            value: timeRemaining.text,
            icon: CalendarClock,
            color: timeRemaining.color,
            valueColor: timeRemaining.color, // Class màu riêng cho giá trị
            bg: 'bg-gray-50',
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                    <div
                        key={kpi.label}
                        className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex items-center gap-4`}
                    >
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">{kpi.label}</p>
                            <p className={`text-2xl font-bold ${kpi.valueColor || 'text-gray-900'}`}>
                                {kpi.value}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}