// components/project/MyProjectsList.client.js
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Folder, Users, Calendar } from 'lucide-react';
import { listMyProjects } from '@/data/project/actions/list.js';

export default function MyProjectsList({ initialProjects = [] }) {
    const [projects, setProjects] = useState(initialProjects);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [filter, setFilter] = useState('all'); // all, active, archived, team, independent

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setProjects(initialProjects);
            return;
        }

        setIsSearching(true);
        try {
            const result = await listMyProjects({ search: query });
            if (result.ok) {
                setProjects(result.data.projects);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Filter projects based on selected filter
    const filteredProjects = projects.filter(project => {
        if (filter === 'active') return project.isActive;
        if (filter === 'archived') return !project.isActive;
        if (filter === 'team') return project.team;
        if (filter === 'independent') return !project.team;
        return true;
    });

    const priorityColors = {
        low: 'bg-green-100 text-green-800',
        medium: 'bg-yellow-100 text-yellow-800',
        high: 'bg-orange-100 text-orange-800',
        urgent: 'bg-red-100 text-red-800',
    };

    return (
        <div className="space-y-4">
            {/* Search and Filter */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm dự án..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Filter */}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                filter === 'all'
                                    ? 'bg-[var(--brand-600)] text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Tất cả
                        </button>
                        <button
                            onClick={() => setFilter('active')}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                filter === 'active'
                                    ? 'bg-[var(--brand-600)] text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Hoạt động
                        </button>
                        <button
                            onClick={() => setFilter('team')}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                filter === 'team'
                                    ? 'bg-[var(--brand-600)] text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Với nhóm
                        </button>
                        <button
                            onClick={() => setFilter('independent')}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                filter === 'independent'
                                    ? 'bg-[var(--brand-600)] text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Độc lập
                        </button>
                    </div>
                </div>
            </div>

            {/* Projects Grid */}
            {isSearching ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">Đang tìm kiếm...</p>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <Folder className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Không có dự án</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {searchQuery ? 'Không tìm thấy dự án phù hợp' : 'Bắt đầu bằng cách tạo dự án mới'}
                    </p>
                    {!searchQuery && (
                        <div className="mt-6">
                            <Link
                                href="/projects/new"
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[var(--brand-600)] hover:bg-[var(--brand-700)]"
                            >
                                Tạo dự án mới
                            </Link>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map((project) => (
                        <Link
                            key={project._id}
                            href={`/projects/${project._id}`}
                            className="block bg-white rounded-lg border border-gray-200 hover:border-[var(--brand-600)] hover:shadow-md transition-all duration-200 overflow-hidden group"
                        >
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-[var(--brand-600)] transition-colors">
                                            {project.name}
                                        </h3>
                                        {project.code && (
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                {project.code}
                                            </p>
                                        )}
                                    </div>
                                    {!project.isActive && (
                                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                            Lưu trữ
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                {project.description && (
                                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                                        {project.description}
                                    </p>
                                )}

                                {/* Meta Info */}
                                <div className="space-y-2 text-sm">
                                    {/* Team */}
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Users className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">
                                            {project.team?.name || 'Dự án độc lập'}
                                        </span>
                                    </div>

                                    {/* Members Count */}
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Users className="h-4 w-4 flex-shrink-0" />
                                        <span>
                                            {project.members?.length || 0} thành viên
                                        </span>
                                    </div>

                                    {/* Dates */}
                                    {project.dueDate && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Calendar className="h-4 w-4 flex-shrink-0" />
                                            <span>
                                                Hết hạn: {new Date(project.dueDate).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Tags & Priority */}
                                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                                    {project.priority && (
                                        <span className={`px-2 py-1 text-xs font-medium rounded ${priorityColors[project.priority]}`}>
                                            {project.priority === 'low' && '🟢 Thấp'}
                                            {project.priority === 'medium' && '🟡 Trung bình'}
                                            {project.priority === 'high' && '🟠 Cao'}
                                            {project.priority === 'urgent' && '🔴 Khẩn cấp'}
                                        </span>
                                    )}
                                    {project.tags?.slice(0, 2).map((tag, index) => (
                                        <span
                                            key={index}
                                            className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                    {project.tags?.length > 2 && (
                                        <span className="text-xs text-gray-500">
                                            +{project.tags.length - 2}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
