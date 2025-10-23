// components/tasks/GanttView.client.js
// Gantt chart view cho tasks

'use client';

import { useMemo } from 'react';
import { format, startOfDay, differenceInDays, addDays, isToday, isWeekend } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar, Clock, BarChart3 } from 'lucide-react';

/**
 * GanttView - Beautiful Gantt chart visualization
 */
export default function GanttView({ tasks }) {
    // Filter tasks with dates
    const tasksWithDates = useMemo(() => {
        return tasks.filter(t => t.plannedStartAt && t.plannedDueAt);
    }, [tasks]);

    // Calculate date range
    const dateRange = useMemo(() => {
        if (tasksWithDates.length === 0) {
            const today = startOfDay(new Date());
            return {
                start: today,
                end: addDays(today, 30),
                days: 30,
            };
        }

        const dates = tasksWithDates.flatMap(t => [
            startOfDay(new Date(t.plannedStartAt)),
            startOfDay(new Date(t.plannedDueAt)),
        ]);

        const start = new Date(Math.min(...dates));
        const end = new Date(Math.max(...dates));
        const days = differenceInDays(end, start) + 1;

        // Add padding
        const paddedStart = addDays(start, -2);
        const paddedEnd = addDays(end, 2);
        const paddedDays = differenceInDays(paddedEnd, paddedStart) + 1;

        return { start: paddedStart, end: paddedEnd, days: paddedDays };
    }, [tasksWithDates]);

    // Generate timeline days
    const timelineDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < dateRange.days; i++) {
            days.push(addDays(dateRange.start, i));
        }
        return days;
    }, [dateRange]);

    // Calculate bar position and width for each task
    const taskBars = useMemo(() => {
        return tasksWithDates.map(task => {
            const start = startOfDay(new Date(task.plannedStartAt));
            const end = startOfDay(new Date(task.plannedDueAt));
            
            const startOffset = differenceInDays(start, dateRange.start);
            const duration = differenceInDays(end, start) + 1;
            
            return {
                task,
                startOffset,
                duration,
            };
        });
    }, [tasksWithDates, dateRange]);

    if (tasksWithDates.length === 0) {
        return (
            <div className="text-center py-12 sm:py-16">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-100 mb-4">
                    <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                    Chưa có dữ liệu Gantt
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                    Các nhiệm vụ cần có ngày bắt đầu và kết thúc để hiển thị trên biểu đồ Gantt
                </p>
            </div>
        );
    }

    const dayWidth = 50; // pixels per day

    // Get priority styling
    const getPriorityStyle = (priority) => {
        switch (priority) {
            case 'urgent':
                return {
                    bg: 'bg-gradient-to-r from-red-500 to-red-600',
                    shadow: 'shadow-red-200',
                    hover: 'hover:shadow-lg hover:shadow-red-300'
                };
            case 'high':
                return {
                    bg: 'bg-gradient-to-r from-orange-500 to-orange-600',
                    shadow: 'shadow-orange-200',
                    hover: 'hover:shadow-lg hover:shadow-orange-300'
                };
            case 'normal':
                return {
                    bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
                    shadow: 'shadow-blue-200',
                    hover: 'hover:shadow-lg hover:shadow-blue-300'
                };
            case 'low':
                return {
                    bg: 'bg-gradient-to-r from-gray-400 to-gray-500',
                    shadow: 'shadow-gray-200',
                    hover: 'hover:shadow-lg hover:shadow-gray-300'
                };
            default:
                return {
                    bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
                    shadow: 'shadow-blue-200',
                    hover: 'hover:shadow-lg hover:shadow-blue-300'
                };
        }
    };

    return (
        <div className="w-full space-y-4 overflow-x-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Biểu đồ Gantt</h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                            {tasksWithDates.length} nhiệm vụ từ{' '}
                            {format(dateRange.start, 'dd/MM/yyyy', { locale: vi })} đến{' '}
                            {format(dateRange.end, 'dd/MM/yyyy', { locale: vi })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-white rounded-lg p-3 sm:p-4 border border-gray-100 shadow-sm">
                <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700">
                    <Calendar className="w-4 h-4" />
                    Độ ưu tiên:
                </span>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-r from-red-500 to-red-600 shadow-sm"></div>
                    <span className="text-sm text-gray-600">Khẩn cấp</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-r from-orange-500 to-orange-600 shadow-sm"></div>
                    <span className="text-sm text-gray-600">Cao</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm"></div>
                    <span className="text-sm text-gray-600">Bình thường</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-r from-gray-400 to-gray-500 shadow-sm"></div>
                    <span className="text-sm text-gray-600">Thấp</span>
                </div>
            </div>

            {/* Gantt Chart */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="inline-block min-w-full" style={{ minWidth: `${320 + timelineDays.length * dayWidth}px` }}>
                        {/* Timeline Header */}
                        <div className="flex border-b-2 border-gray-200 sticky top-0 bg-gradient-to-b from-gray-50 to-white z-10 shadow-sm">
                            <div className="w-60 sm:w-80 flex-shrink-0 p-3 sm:p-4 font-semibold text-xs sm:text-sm text-gray-700 border-r border-gray-200">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    Nhiệm vụ
                                </div>
                            </div>
                            <div className="flex">
                                {timelineDays.map((day, idx) => {
                                    const isCurrentDay = isToday(day);
                                    const isWeekendDay = isWeekend(day);
                                    
                                    return (
                                        <div
                                            key={idx}
                                            className={`border-r border-gray-100 text-center transition-colors ${
                                                isCurrentDay 
                                                    ? 'bg-blue-100 border-blue-200' 
                                                    : isWeekendDay 
                                                    ? 'bg-blue-50/50' 
                                                    : 'bg-white'
                                            }`}
                                            style={{ width: `${dayWidth}px` }}
                                        >
                                            <div className={`text-xs font-semibold p-2 ${
                                                isCurrentDay ? 'text-blue-700' : 'text-gray-700'
                                            }`}>
                                                {format(day, 'dd', { locale: vi })}
                                            </div>
                                            <div className={`text-xs pb-2 ${
                                                isCurrentDay ? 'text-blue-600 font-medium' : 'text-gray-500'
                                            }`}>
                                                {format(day, 'EEE', { locale: vi })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Task Rows */}
                        <div>
                            {taskBars.map(({ task, startOffset, duration }, idx) => {
                                const priorityStyle = getPriorityStyle(task.priority);
                                const statusOpacity = task.status === 'completed' ? 'opacity-60' : 'opacity-100';

                                return (
                                    <div
                                        key={task._id}
                                        className="flex border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                                    >
                                        {/* Task Name */}
                                        <div className="w-80 flex-shrink-0 p-4 border-r border-gray-100">
                                            <a
                                                href={`/tasks/${task._id}`}
                                                className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2 mb-1"
                                            >
                                                {task.title}
                                            </a>
                                            {task.projectName && (
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                                    {task.projectName}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                <span>{format(new Date(task.plannedStartAt), 'dd/MM', { locale: vi })}</span>
                                                <span>→</span>
                                                <span>{format(new Date(task.plannedDueAt), 'dd/MM', { locale: vi })}</span>
                                            </div>
                                        </div>

                                        {/* Gantt Bar */}
                                        <div className="flex-1 relative py-4">
                                            <div
                                                className={`absolute top-4 h-10 rounded-lg ${priorityStyle.bg} ${statusOpacity} ${priorityStyle.hover} shadow-md ${priorityStyle.shadow} flex items-center px-3 transition-all duration-200 cursor-pointer group`}
                                                style={{
                                                    left: `${startOffset * dayWidth}px`,
                                                    width: `${Math.max(duration * dayWidth - 4, 40)}px`,
                                                }}
                                                title={`${task.title} (${duration} ngày)`}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="text-xs text-white font-semibold truncate flex-1">
                                                        {duration} ngày
                                                    </span>
                                                    {task.status === 'completed' && (
                                                        <span className="text-xs text-white/90 ml-2">✓</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
