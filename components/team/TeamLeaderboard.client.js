// components/team/TeamLeaderboard.client.js
'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Clock, CheckCircle2, ChevronDown } from 'lucide-react';
import { team as teamLeaderboardAction } from '@/data/leaderboard/actions/server.js';
import UserDisplay from '@/components/ui/user-display';
import { useAsyncNotifier } from '@/hooks/loading.hook';

/**
 * TeamLeaderboard Component
 * Hiển thị bảng xếp hạng điểm của team theo tháng
 */
export default function TeamLeaderboard({ teamId, initialYm }) {
    const [ym, setYm] = useState(initialYm); // YYYY-MM
    const [limit, setLimit] = useState(20);
    const [leaderboard, setLeaderboard] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { run, Overlays } = useAsyncNotifier();

    useEffect(() => {
        loadLeaderboard();
    }, [teamId, ym, limit]);

    const loadLeaderboard = async () => {
        setIsLoading(true);
        try {
            const result = await teamLeaderboardAction({ 
                teamId, 
                ym, 
                limit: limit === 0 ? 999 : limit 
            });
            if (result.ok) {
                setLeaderboard(result.data);
            }
        } catch (error) {
            console.error('Load leaderboard error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Generate month options (current month and 11 months back)
    const monthOptions = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ymValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' });
        monthOptions.push({ value: ymValue, label });
    }

    const formatDuration = (seconds) => {
        if (!seconds) return '0h';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
        }
        return `${minutes}m`;
    };

    const getRankIcon = (rank) => {
        if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
        if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
        if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
        return null;
    };

    const getRankBgColor = (rank) => {
        if (rank === 1) return 'bg-yellow-50';
        if (rank === 2) return 'bg-gray-50';
        if (rank === 3) return 'bg-amber-50';
        return '';
    };

    return (
        <>
            <Overlays />
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                {/* Header với filters */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-[var(--brand-600)]" />
                                Bảng xếp hạng
                            </h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Điểm thành tích của các thành viên
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Month selector */}
                            <div className="relative">
                                <select
                                    value={ym}
                                    onChange={(e) => setYm(e.target.value)}
                                    className="appearance-none px-4 py-2 pr-10 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] transition-all cursor-pointer"
                                >
                                    {monthOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>

                            {/* Limit selector */}
                            <div className="relative">
                                <select
                                    value={limit}
                                    onChange={(e) => setLimit(Number(e.target.value))}
                                    className="appearance-none px-4 py-2 pr-10 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] transition-all cursor-pointer"
                                >
                                    <option value={10}>Top 10</option>
                                    <option value={20}>Top 20</option>
                                    <option value={50}>Top 50</option>
                                    <option value={0}>Tất cả</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Leaderboard table */}
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="px-6 py-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[var(--brand-600)]"></div>
                            <p className="text-sm text-gray-500 mt-3">Đang tải...</p>
                        </div>
                    ) : !leaderboard?.items?.length ? (
                        <div className="px-6 py-12 text-center text-gray-500">
                            <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>Chưa có dữ liệu xếp hạng cho tháng này</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Hạng
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Thành viên
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Điểm
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Tasks
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Thời gian
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {leaderboard.items.map((item) => (
                                    <tr
                                        key={item.userId}
                                        className={`hover:bg-gray-50 transition-colors ${getRankBgColor(item.rank)}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {getRankIcon(item.rank)}
                                                <span className={`text-sm font-semibold ${
                                                    item.rank <= 3 ? 'text-gray-900' : 'text-gray-600'
                                                }`}>
                                                    #{item.rank}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <UserDisplay
                                                userId={item.userId}
                                                showJobTitle={false}
                                                size="sm"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className="text-sm font-bold text-[var(--brand-700)]">
                                                    {item.points.toLocaleString()}
                                                </span>
                                                <span className="text-xs text-gray-500">pts</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                                <span className="text-sm text-gray-700">
                                                    {item.tasksCompleted}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Clock className="h-3.5 w-3.5 text-blue-600" />
                                                <span className="text-sm text-gray-700">
                                                    {formatDuration(item.durationSec)}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer summary */}
                {leaderboard?.items?.length > 0 && (
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                        Hiển thị {leaderboard.items.length} thành viên
                        {leaderboard.nextCursor && ' - Có thêm dữ liệu'}
                    </div>
                )}
            </div>
        </>
    );
}
