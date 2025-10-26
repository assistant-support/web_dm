// app/(auth)/(main)/teams/[teamId]/page.js
// Mục đích: Tab "Tổng quan" của team - hiển thị thống kê nhanh và quick links

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getByIdAction } from '@/data/team/actions/server.js';
import { Users, Folder, BarChart3, Clock } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function TeamOverviewPage({ params }) {

    const { teamId } = await params
    if (!teamId) return notFound();

    const result = await getByIdAction(teamId);
    if (!result.ok) return notFound();

    const team = JSON.parse(JSON.stringify(result.data));

    // Quick stats
    const memberCount = team.members?.length || 0;
    const managerCount = team.members?.filter(m => m.role === 'manager').length || 0;

    return (
        <div className="space-y-6 w-full flex flex-col">
            {/* Description */}
            {team.description && (
                <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Mô tả</h3>
                    <p className="text-sm text-gray-600">{team.description}</p>
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="bg-[var(--brand-50)] rounded-lg p-4 border border-[var(--brand-200)]">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--brand-100)] flex items-center justify-center">
                            <Users className="h-5 w-5 text-[var(--brand-600)]" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Thành viên</p>
                            <p className="text-2xl font-bold text-gray-900">{memberCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <BarChart3 className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Quản lý</p>
                            <p className="text-2xl font-bold text-gray-900">{managerCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <Folder className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Trạng thái</p>
                            <p className="text-sm font-semibold text-gray-900">
                                {team.isActive ? 'Đang hoạt động' : 'Đã lưu trữ'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Liên kết nhanh</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Link
                        href={`/teams/${team._id}/members`}
                        className="group flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[var(--brand-600)] hover:bg-[var(--brand-50)] transition-all duration-200"
                    >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--brand-100)] flex items-center justify-center group-hover:bg-[var(--brand-600)] transition-colors">
                            <Users className="h-5 w-5 text-[var(--brand-600)] group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[var(--brand-700)]">Thành viên</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Quản lý thành viên nhóm</p>
                        </div>
                    </Link>

                    <Link
                        href={`/teams/${team._id}/activity`}
                        className="group flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-600 hover:bg-purple-50 transition-all duration-200"
                    >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                            <Clock className="h-5 w-5 text-purple-600 group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-purple-700">Hoạt động</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Xem lịch sử hoạt động</p>
                        </div>
                    </Link>

                    <Link
                        href={`/teams/${team._id}/analytics`}
                        className="group flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-green-600 hover:bg-green-50 transition-all duration-200"
                    >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-600 transition-colors">
                            <BarChart3 className="h-5 w-5 text-green-600 group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-green-700">Phân tích</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Xem thống kê và bảng xếp hạng</p>
                        </div>
                    </Link>

                    <Link
                        href={`/teams/${team._id}/projects`}
                        className="group flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-all duration-200"
                    >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                            <Folder className="h-5 w-5 text-blue-600 group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">Dự án</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Xem dự án của nhóm</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Team Info */}
            <div className="border-t border-gray-200 pt-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                    <div>
                        <dt className="text-sm font-medium text-gray-500">Ngày tạo</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                            {new Date(team.createdAt).toLocaleDateString('vi-VN')}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-gray-500">Cập nhật lần cuối</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                            {new Date(team.updatedAt).toLocaleDateString('vi-VN')}
                        </dd>
                    </div>
                </dl>
            </div>
        </div>
    );
}
