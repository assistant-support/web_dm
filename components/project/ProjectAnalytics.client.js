'use client';

import { useState, useEffect } from 'react';
import { BarChart3, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getAnalytics } from '@/data/project/actions/analytics.js';
import { t } from '@/lib/i18n-vi';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function ProjectAnalytics({ projectId, initialAnalytics }) {
    const [analytics, setAnalytics] = useState(initialAnalytics);
    const [loading, setLoading] = useState(!initialAnalytics);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!initialAnalytics) {
            setLoading(true);
            getAnalytics(projectId)
                .then(result => {
                    if (result.ok) {
                        setAnalytics(result.data);
                    } else {
                        setError(result.message || t('error.loadFailed'));
                    }
                })
                .catch(err => setError(err.message || t('error.unexpected')))
                .finally(() => setLoading(false));
        } else {
            setAnalytics(initialAnalytics);
            setLoading(false);
        }
    }, [projectId, initialAnalytics]);

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                    <div className="h-48 bg-gray-200 rounded-lg"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg border border-red-200 p-6">
                <h3 className="text-lg font-semibold text-red-700 mb-2">{t('common.error')}</h3>
                <p className="text-sm text-red-600">{error}</p>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900">{t('project.analytics')}</h3>
                <p className="text-sm text-gray-500 mt-2">{t('common.noData')}</p>
            </div>
        );
    }

    const { tasks, trend, completionRate } = analytics;

    const maxValue = Math.max(
        ...trend.map(t => Math.max(t.created, t.completed)),
        1
    );

    const chartData = {
        labels: trend.map(item => `T${item.month}/${item.year}`),
        datasets: [
            {
                label: 'Tạo mới',
                data: trend.map(item => item.created),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
                borderRadius: 8,
            },
            {
                label: 'Hoàn thành',
                data: trend.map(item => item.completed),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 1,
                borderRadius: 8,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 15,
                    font: {
                        size: 13,
                        family: 'Inter, system-ui, sans-serif',
                        weight: '500'
                    },
                    color: '#374151'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                padding: 16,
                titleFont: {
                    size: 14,
                    weight: 'bold',
                    family: 'Inter, system-ui, sans-serif'
                },
                bodyFont: {
                    size: 13,
                    family: 'Inter, system-ui, sans-serif'
                },
                bodySpacing: 8,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                displayColors: true,
                boxPadding: 6,
                cornerRadius: 8,
                callbacks: {
                    title: function(context) {
                        return `📅 ${context[0].label}`;
                    },
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        const icon = label === 'Tạo mới' ? '📝' : '✅';
                        return `${icon} ${label}: ${value} công việc`;
                    },
                    afterBody: function(context) {
                        const created = context[0].chart.data.datasets[0].data[context[0].dataIndex];
                        const completed = context[0].chart.data.datasets[1].data[context[0].dataIndex];
                        const percentage = created > 0 ? Math.round((completed / created) * 100) : 0;
                        return `\n📊 Tỷ lệ: ${percentage}%`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        size: 12,
                        weight: '500'
                    },
                    color: '#4B5563',
                    padding: 8
                },
                border: {
                    display: false
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(229, 231, 235, 0.8)',
                    drawBorder: false
                },
                ticks: {
                    font: {
                        size: 12
                    },
                    color: '#6B7280',
                    stepSize: Math.ceil(maxValue / 5),
                    padding: 10,
                    callback: function(value) {
                        return value + ' CV';
                    }
                },
                border: {
                    display: false
                }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                    📈 Xu hướng hoàn thành công việc
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                    Theo dõi tiến độ tạo mới và hoàn thành công việc theo tháng
                </p>
            </div>
            {trend.length > 0 ? (
                <div className="p-6">
                    <div style={{ height: '350px' }}>
                        <Bar data={chartData} options={chartOptions} />
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">Đang làm</p>
                                <p className="text-lg font-semibold text-blue-600">{tasks.inProgressTasks}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">Quá hạn</p>
                                <p className="text-lg font-semibold text-red-600">{tasks.overdueTasks}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">Trung bình/tháng</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {trend.length > 0 ? Math.round(trend.reduce((sum, t) => sum + t.created, 0) / trend.length) : 0}
                                </p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">Hoàn thành/tháng</p>
                                <p className="text-lg font-semibold text-green-600">
                                    {trend.length > 0 ? Math.round(trend.reduce((sum, t) => sum + t.completed, 0) / trend.length) : 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-6">
                    <div className="text-center py-12 text-gray-500">
                        <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="font-medium">Chưa có dữ liệu thống kê</p>
                        <p className="text-sm mt-1">Dữ liệu sẽ hiển thị khi có công việc trong dự án</p>
                    </div>
                </div>
            )}
        </div>
    );
}