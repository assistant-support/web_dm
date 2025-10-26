// components/reports/PersonalReportClient.client.js
// Client component cho trang báo cáo cá nhân

'use client';

import { useState, useMemo } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    TrendingUp,
    CheckCircle2,
    Clock,
    Award,
    Users,
    FolderKanban,
    ChevronLeft,
    ChevronRight,
    Target,
    Activity,
    BarChart3,
    Calendar,
    Trophy
} from 'lucide-react';
import { userMonthly } from '@/data/report/actions/server';
import ActivityItem from '@/components/ui/activity-item';

/**
 * PersonalReportClient - Dashboard báo cáo cá nhân
 */
export default function PersonalReportClient({ 
    user, 
    initialReportData, 
    projects,
    currentMonth 
}) {
    const [reportData, setReportData] = useState(initialReportData);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // overview, tasks, projects, activity

    // Load data for selected month
    const loadMonthData = async (ym) => {
        setLoading(true);
        try {
            const result = await userMonthly({ ym, userId: user.externalUserId });
            if (result?.data) {
                setReportData(prev => ({
                    ...prev,
                    monthly: result.data
                }));
            }
        } catch (error) {
            console.error('Error loading month data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePreviousMonth = () => {
        const newMonth = format(subMonths(new Date(selectedMonth + '-01'), 1), 'yyyy-MM');
        setSelectedMonth(newMonth);
        loadMonthData(newMonth);
    };

    const handleNextMonth = () => {
        const newMonth = format(addMonths(new Date(selectedMonth + '-01'), 1), 'yyyy-MM');
        setSelectedMonth(newMonth);
        loadMonthData(newMonth);
    };

    // Format duration to hours:minutes
    const formatDuration = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    // Get project names map
    const projectsMap = useMemo(() => {
        const map = {};
        projects.forEach(p => {
            map[p._id] = p.name;
        });
        return map;
    }, [projects]);

    const monthly = reportData?.monthly || {};
    const allTime = reportData?.allTime || {};
    const teams = reportData?.teams || [];
    const activities = reportData?.recentActivities || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 w-full">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                                Báo cáo cá nhân
                            </h1>
                            <p className="text-sm sm:text-base text-purple-100">
                                Thống kê hoạt động và hiệu suất làm việc
                            </p>
                        </div>
                        <div className="p-3 sm:p-4 bg-white/10 rounded-lg sm:rounded-xl backdrop-blur-sm">
                            <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-300" />
                        </div>
                    </div>

                    {/* Month Selector */}
                    <div className="mt-4 sm:mt-6 flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                        <button
                            onClick={handlePreviousMonth}
                            disabled={loading}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            <span className="text-lg sm:text-xl font-semibold text-white">
                            Tháng {format(new Date(selectedMonth + '-01'), 'MM/yyyy')}
                        </span>
                    </div>
                    <button
                        onClick={handleNextMonth}
                        disabled={loading}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Points */}
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-4 sm:p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <Award className="w-6 h-6 sm:w-8 sm:h-8" />
                        <div className="text-2xl sm:text-3xl font-bold">
                            {monthly.totals?.points || 0}
                        </div>
                    </div>
                    <h3 className="text-yellow-100 font-medium text-sm sm:text-base">Điểm tháng này</h3>
                    <p className="text-xs sm:text-sm text-yellow-50 mt-1">
                        Tổng điểm đạt được
                    </p>
                </div>

                {/* Tasks Completed */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-4 sm:p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8" />
                        <div className="text-2xl sm:text-3xl font-bold">
                            {monthly.totals?.tasksCompleted || 0}
                        </div>
                    </div>
                    <h3 className="text-green-100 font-medium text-sm sm:text-base">Công việc hoàn thành</h3>
                    <p className="text-xs sm:text-sm text-green-50 mt-1">
                        Tháng {format(new Date(selectedMonth + '-01'), 'MM')}
                    </p>
                </div>

                {/* Time Tracked */}
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 sm:p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
                        <div className="text-2xl sm:text-3xl font-bold">
                            {Math.floor((monthly.totals?.durationSec || 0) / 3600)}h
                        </div>
                    </div>
                    <h3 className="text-blue-100 font-medium text-sm sm:text-base">Thời gian làm việc</h3>
                    <p className="text-xs sm:text-sm text-blue-50 mt-1">
                        {formatDuration(monthly.totals?.durationSec || 0)}
                    </p>
                </div>

                {/* Completion Rate */}
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 sm:p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <Target className="w-8 h-8" />
                        <div className="text-3xl font-bold">
                            {allTime.completionRate || 0}%
                        </div>
                    </div>
                    <h3 className="text-purple-100 font-medium">Tỷ lệ hoàn thành</h3>
                    <p className="text-sm text-purple-50 mt-1">
                        {allTime.completedTasks || 0}/{allTime.assignedTasks || 0} nhiệm vụ
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="border-b border-gray-200">
                    <div className="flex gap-2 p-2">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                                activeTab === 'overview'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            Tổng quan
                        </button>
                        <button
                            onClick={() => setActiveTab('tasks')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                                activeTab === 'tasks'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Công việc
                        </button>
                        <button
                            onClick={() => setActiveTab('projects')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                                activeTab === 'projects'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <FolderKanban className="w-4 h-4" />
                            Dự án
                        </button>
                        <button
                            onClick={() => setActiveTab('activity')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                                activeTab === 'activity'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Activity className="w-4 h-4" />
                            Hoạt động
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* All-time Stats */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Thống kê toàn bộ
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-600 mb-1">Tổng công việc</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {allTime.totalTasks || 0}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-600 mb-1">Đã hoàn thành</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {allTime.completedTasks || 0}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-600 mb-1">Số nhóm tham gia</p>
                                        <p className="text-2xl font-bold text-purple-600">
                                            {allTime.teamsCount || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Daily Chart */}
                            {monthly.daily && monthly.daily.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Biểu đồ theo ngày
                                    </h3>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="space-y-2">
                                            {monthly.daily.map((day, idx) => (
                                                <div key={idx} className="flex items-center gap-4">
                                                    <span className="text-sm text-gray-600 w-24">
                                                        {format(new Date(day.date), 'dd/MM', { locale: vi })}
                                                    </span>
                                                    <div className="flex-1 bg-white rounded-lg p-2 flex items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <Award className="w-4 h-4 text-yellow-500" />
                                                            <span className="text-sm font-medium">{day.points}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                            <span className="text-sm">{day.tasksCompleted}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-blue-500" />
                                                            <span className="text-sm">
                                                                {Math.floor(day.durationSec / 3600)}h
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tasks Tab */}
                    {activeTab === 'tasks' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Thống kê công việc tháng {format(new Date(selectedMonth + '-01'), 'MM/yyyy')}
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <span className="text-gray-700">Tổng công việc hoàn thành</span>
                                    <span className="text-2xl font-bold text-green-600">
                                        {monthly.totals?.tasksCompleted || 0}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <span className="text-gray-700">Tổng điểm đạt được</span>
                                    <span className="text-2xl font-bold text-yellow-600">
                                        {monthly.totals?.points || 0}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <span className="text-gray-700">Tổng thời gian làm việc</span>
                                    <span className="text-2xl font-bold text-blue-600">
                                        {formatDuration(monthly.totals?.durationSec || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Projects Tab */}
                    {activeTab === 'projects' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Thống kê theo dự án
                            </h3>
                            {monthly.byProject && monthly.byProject.length > 0 ? (
                                <div className="space-y-3">
                                    {monthly.byProject.map((proj, idx) => (
                                        <div 
                                            key={idx}
                                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-semibold text-gray-900">
                                                    {projectsMap[proj.projectId] || 'Dự án không xác định'}
                                                </h4>
                                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                                    {proj.points} điểm
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-600">Công việc</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {proj.tasksCompleted}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Thời gian</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {Math.floor(proj.durationSec / 3600)}h
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Trung bình</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {proj.tasksCompleted > 0 
                                                            ? Math.round(proj.points / proj.tasksCompleted) 
                                                            : 0} đ/cv
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">
                                    Chưa có dữ liệu dự án trong tháng này
                                </p>
                            )}
                        </div>
                    )}

                    {/* Activity Tab */}
                    {activeTab === 'activity' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Hoạt động gần đây
                            </h3>
                            {activities.length > 0 ? (
                                <div className="space-y-3">
                                    {activities.map((activity) => (
                                        <ActivityItem
                                            key={activity._id}
                                            activity={activity}
                                            showPayload={false}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">
                                    Chưa có hoạt động nào
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Teams Section */}
            {teams.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-gray-700" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Các nhóm tham gia ({teams.length})
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {teams.map((team) => (
                            <div
                                key={team._id}
                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <h4 className="font-semibold text-gray-900 mb-1">
                                    {team.name}
                                </h4>
                                {team.description && (
                                    <p className="text-sm text-gray-600 mb-2">
                                        {team.description}
                                    </p>
                                )}
                                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                    team.memberRole === 'owner'
                                        ? 'bg-purple-100 text-purple-800'
                                        : team.memberRole === 'manager'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {team.memberRole === 'owner' ? 'Chủ sở hữu' : 
                                     team.memberRole === 'manager' ? 'Quản lý' : 'Thành viên'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}
