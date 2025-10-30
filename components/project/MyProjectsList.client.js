// components/project/MyProjectsList.client.js
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Folder, Users, Calendar, AlertTriangle, CheckCircle, Tag, Clock } from 'lucide-react';
import { useDebounce } from '@/hooks/debounce.hook';
import { t } from '@/lib/i18n-vi';
import { PRIORITY } from '@/model/common/enums.js'; // Import enum PRIORITY

// Helper to format date
const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
        return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return null;
    }
};

// Dynamically create priorityMap using PRIORITY enum and t function
const priorityMap = {
    [PRIORITY.LOW]: { label: t('taskPriority.low'), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    [PRIORITY.MEDIUM]: { label: t('taskPriority.medium'), icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
    [PRIORITY.HIGH]: { label: t('taskPriority.high'), icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100' },
    [PRIORITY.URGENT]: { label: t('taskPriority.urgent'), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
};


export default function MyProjectsList({ initialProjects = [] }) {
    const router = useRouter();
    const [projects, setProjects] = useState(initialProjects);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('active');
    const debouncedSearch = useDebounce(searchQuery, 300);

    useEffect(() => {
        setProjects(initialProjects);
    }, [initialProjects]);

    const filteredProjects = useMemo(() => {
        return projects.filter(project => {
            let statusMatch = true;
            if (filter === 'active') statusMatch = project.isActive;
            else if (filter === 'archived') statusMatch = !project.isActive;

            let typeMatch = true;
            if (filter === 'team') typeMatch = !!project.team;
            else if (filter === 'independent') typeMatch = !project.team;

            let searchMatch = true;
            if (debouncedSearch) {
                const lowerSearch = debouncedSearch.toLowerCase();
                searchMatch = project.name.toLowerCase().includes(lowerSearch) ||
                    (project.code && project.code.toLowerCase().includes(lowerSearch)) ||
                    (project.description && project.description.toLowerCase().includes(lowerSearch)) ||
                    (project.team?.name && project.team.name.toLowerCase().includes(lowerSearch)) ||
                    (project.tags && project.tags.some(tag => tag.toLowerCase().includes(lowerSearch)));
            }

            return statusMatch && typeMatch && searchMatch;
        }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }, [projects, filter, debouncedSearch]);

    const FilterButton = ({ value, labelKey }) => (
        <button
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${filter === value
                ? 'bg-[var(--brand-600)] text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
        >
            {t(labelKey)}
        </button>
    );

    return (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
            {/* Search and Filter Bar */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder={t('actions.search') + '...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--brand-500)] focus:border-[var(--brand-500)]"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                        <FilterButton value="active" labelKey="project.active" />
                        <FilterButton value="all" labelKey="common.all" />
                        <FilterButton value="team" labelKey="team.teams" />
                        <FilterButton value="independent" labelKey="project.independent" />
                        <FilterButton value="archived" labelKey="project.archived" />
                    </div>
                </div>
            </div>

            {/* Projects Grid / Empty State */}
            <div className='flex-1 overflow-y-auto pb-4 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'>
                {filteredProjects.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300 mt-4">
                        <Folder className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">{t('project.noData')}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchQuery || filter !== 'active' ? t('project.emptyStateFiltered') : t('project.emptyState')}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProjects.map((project) => {
                            // Use the dynamically generated priorityMap
                            const priorityInfo = project.priority ? priorityMap[project.priority] : null;
                            const formattedDueDate = formatDate(project.dueDate);
                            const formattedStartDate = formatDate(project.startDate);
                            const teamName = project.team?.name;

                            return (
                                <Link
                                    key={project._id}
                                    href={`/projects/${project._id}`}
                                    onMouseEnter={() => router.prefetch(`/projects/${project._id}`)}
                                    className="block bg-white rounded-lg border border-gray-200 hover:border-[var(--brand-500)] hover:shadow-lg transition-all duration-200 overflow-hidden p-4 space-y-3 relative group"
                                >
                                    {!project.isActive && (
                                        <span className="absolute top-3 right-3 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-md">
                                            {t('project.archived')}
                                        </span>
                                    )}

                                    <div className="flex items-center justify-between gap-2 pr-12">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-gray-800 truncate group-hover:text-[var(--brand-700)] transition-colors">
                                                {project.name}
                                            </h3>
                                            {project.code && (
                                                <p className="text-sm text-gray-500 mt-0.5 font-mono">
                                                    {project.code}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {project.description && (
                                        <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                                            {project.description}
                                        </p>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-3 pt-3 border-t border-gray-100">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Users className="h-4 w-4 flex-shrink-0 text-purple-600" />
                                            <span className="truncate">
                                                {teamName ? `${t('team.teamName')}: ${teamName}` : t('project.memberCount', { count: project.members?.length || 0 })}
                                            </span>
                                        </div>

                                        {formattedStartDate && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Clock className="h-4 w-4 flex-shrink-0 text-blue-600" />
                                                <span>
                                                    {t('common.startDate')}: <span className="font-medium text-gray-700">{formattedStartDate}</span>
                                                </span>
                                            </div>
                                        )}

                                        {formattedDueDate && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Calendar className="h-4 w-4 flex-shrink-0 text-red-600" />
                                                <span>
                                                    {t('common.dueDate')}: <span className="font-medium text-gray-700">{formattedDueDate}</span>
                                                </span>
                                            </div>
                                        )}

                                        {priorityInfo && (
                                            <div className="flex items-center gap-2">
                                                <priorityInfo.icon className={`h-4 w-4 flex-shrink-0 ${priorityInfo.color}`} />
                                                <span className={`${priorityInfo.color} font-medium`}>
                                                    {t('common.priority')}: {priorityInfo.label}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {project.tags && project.tags.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 pt-3 mt-3 border-t border-gray-100">
                                            {project.tags.slice(0, 3).map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full flex items-center gap-1"
                                                >
                                                    <Tag className="h-3 w-3 text-gray-400" /> {tag}
                                                </span>
                                            ))}
                                            {project.tags.length > 3 && (
                                                <span className="text-xs text-gray-500">
                                                    +{project.tags.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}