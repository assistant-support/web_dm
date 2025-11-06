// components/project/analytics/ProjectProgressVisuals.client.js
'use client';

import { PieChart, BarChart3 } from 'lucide-react';
import { t } from '@/lib/i18n-vi';
// Bạn cần import thư viện biểu đồ của mình, ví dụ:
// import { ResponsiveContainer, Pie, Cell, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function ProjectProgressVisuals({ taskStats, monthlyTrend }) {
    const stats = taskStats || {};
    const trend = monthlyTrend || [];

    // Chuẩn bị data cho Donut Chart
    const donutData = [
        { name: t('taskStatus.waiting_confirm'), value: stats.todoTasks || 0, color: '#9CA3AF' }, // Xám
        { name: t('taskStatus.in_progress'), value: stats.inProgressTasks || 0, color: '#3B82F6' }, // Xanh
        { name: t('taskStatus.completed_await_review'), value: stats.completedAwaitReviewTasks || 0, color: '#F97316' }, // Cam
        { name: t('taskStatus.completed'), value: stats.completedTasks || 0, color: '#22C55E' }, // Xanh lá
    ].filter(item => item.value > 0); // Chỉ hiển thị các phần có giá trị

    // Chuẩn bị data cho Bar Chart
    const trendData = trend.map(item => ({
        name: `${item.month}/${item.year}`,
        [t('task.created')]: item.created,
        [t('task.completed')]: item.completed,
    }));

    const hasTrendData = trend.length > 0;
    const hasDonutData = donutData.length > 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut Chart */}
            <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('task.statusDistribution')}</h3> {/* Key: "Phân bổ trạng thái" */}
                {hasDonutData ? (
                    <div className="h-64 w-full flex items-center justify-center text-gray-400">
                        {/* --- THAY THẾ BẰNG BIỂU ĐỒ DONUT CỦA BẠN --- */}
                        <PieChart className="h-16 w-16 opacity-50" />
                        <p className="ml-4">Placeholder: Donut Chart</p>
                        {/* <ResponsiveContainer width="100%" height={250}>
							<Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
								{donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
							</Pie>
							<Tooltip />
						</ResponsiveContainer> */}
                        {/* --- KẾT THÚC THAY THẾ --- */}
                    </div>
                ) : (
                    <div className="h-64 w-full flex items-center justify-center text-gray-400">
                        {t('common.noData')}
                    </div>
                )}
            </div>

            {/* Bar Chart (Velocity) */}
            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('project.velocityTrend')}</h3> {/* Key: "Xu hướng tiến độ" */}
                {hasTrendData ? (
                    <div className="h-64 w-full flex items-center justify-center text-gray-400">
                        {/* --- THAY THẾ BẰNG BIỂU ĐỒ CỘT CỦA BẠN --- */}
                        <BarChart3 className="h-16 w-16 opacity-50" />
                        <p className="ml-4">Placeholder: Bar Chart (Created vs Completed)</p>
                        {/* <ResponsiveContainer width="100%" height={250}>
							<BarChart data={trendData}>
								<XAxis dataKey="name" />
								<YAxis />
								<Tooltip />
								<Legend />
								<Bar dataKey={t('task.created')} fill="#3B82F6" />
								<Bar dataKey={t('task.completed')} fill="#22C55E" />
							</BarChart>
						</ResponsiveContainer> */}
                        {/* --- KẾT THÚC THAY THẾ --- */}
                    </div>
                ) : (
                    <div className="h-64 w-full flex items-center justify-center text-gray-400">
                        {t('common.noData')}
                    </div>
                )}
            </div>
        </div>
    );
}