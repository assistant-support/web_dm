// components/layout/header/SearchInput.client.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Briefcase, Folder, Users, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/debounce.hook';
import Link from 'next/link';

export default function SearchInput() {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState({
        projects: { items: [], hasMore: false },
        tasks: { items: [], hasMore: false },
        teams: { items: [], hasMore: false }
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const containerRef = useRef(null);
    const router = useRouter();

    const debouncedQuery = useDebounce(searchQuery, 300);

    useEffect(() => {
        const fetchResults = async () => {
            if (debouncedQuery.trim().length === 0) {
                setResults({
                    projects: { items: [], hasMore: false },
                    tasks: { items: [], hasMore: false },
                    teams: { items: [], hasMore: false }
                });
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch(`/api/search/preview?q=${encodeURIComponent(debouncedQuery)}`);
                if (response.ok) {
                    const data = await response.json();
                    setResults(data);
                    setShowResults(true);
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            setShowResults(false);
            const q = searchQuery.trim();
            setSearchQuery('');
            router.push(`/search?q=${encodeURIComponent(q)}`);
        }
    };

    const handleViewAll = (type) => {
        if (searchQuery.trim()) {
            setShowResults(false);
            const q = searchQuery.trim();
            setSearchQuery('');
            router.push(`/search/${type}?q=${encodeURIComponent(q)}`);
        }
    };

    const hasAnyResults = results.projects.items.length > 0 || 
                         results.tasks.items.length > 0 || 
                         results.teams.items.length > 0;

    return (
        <div ref={containerRef} className="relative w-full">
            <form onSubmit={handleSearch} className="w-full">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (e.target.value.trim().length > 0) setShowResults(true);
                        }}
                        onFocus={() => {
                            if (searchQuery.trim().length > 0) setShowResults(true);
                        }}
                        placeholder="Tìm kiếm dự án, nhiệm vụ, nhóm..."
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                    />
                    {isLoading ? (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                    ) : (
                        searchQuery && (
                            <button
                                type="button"
                                onClick={() => { setSearchQuery(''); setResults([]); setShowResults(false); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 hover:text-gray-700"
                                aria-label="Clear"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )
                    )}
                </div>
            </form>

            {/* Results Dropdown */}
            {showResults && (searchQuery.trim().length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[500px] overflow-y-auto z-50">
                    {hasAnyResults ? (
                        <div className="py-2">
                            {/* Projects Section */}
                            {results.projects.items.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                                        <Folder className="w-4 h-4 text-orange-500" />
                                        Dự án
                                    </div>
                                    {results.projects.items.map((project) => (
                                        <div
                                            key={`project-${project.id}`}
                                            onClick={() => {
                                                setShowResults(false);
                                                setSearchQuery('');
                                                router.push(`/projects/${project.id}`);
                                            }}
                                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center">
                                                <Folder className="w-4 h-4 text-orange-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-medium text-gray-900 truncate">
                                                    {project.name}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {results.projects.hasMore && (
                                        <div className="px-4 py-1">
                                            <button
                                                onClick={() => handleViewAll('projects')}
                                                className="text-xs text-blue-600 hover:underline w-full text-left"
                                            >
                                                Xem tất cả dự án →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tasks Section */}
                            {results.tasks.items.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-green-500" />
                                        Nhiệm vụ
                                    </div>
                                    {results.tasks.items.map((task) => (
                                        <div
                                            key={`task-${task.id}`}
                                            onClick={() => {
                                                setShowResults(false);
                                                setSearchQuery('');
                                                router.push(`/tasks/${task.id}`);
                                            }}
                                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
                                                <Briefcase className="w-4 h-4 text-green-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-medium text-gray-900 truncate">
                                                    {task.title}
                                                </div>
                                                {task.projectName && (
                                                    <div className="text-xs text-gray-500 truncate">
                                                        {task.projectName}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {results.tasks.hasMore && (
                                        <div className="px-4 py-1">
                                            <button
                                                onClick={() => handleViewAll('tasks')}
                                                className="text-xs text-blue-600 hover:underline w-full text-left"
                                            >
                                                Xem tất cả nhiệm vụ →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Teams Section */}
                            {results.teams.items.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-500" />
                                        Nhóm
                                    </div>
                                    {results.teams.items.map((team) => (
                                        <div
                                            key={`team-${team.id}`}
                                            onClick={() => {
                                                setShowResults(false);
                                                setSearchQuery('');
                                                router.push(`/teams/${team.id}`);
                                            }}
                                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                                                <Users className="w-4 h-4 text-blue-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-medium text-gray-900 truncate">
                                                    {team.name}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {results.teams.hasMore && (
                                        <div className="px-4 py-1">
                                            <button
                                                onClick={() => handleViewAll('teams')}
                                                className="text-xs text-blue-600 hover:underline w-full text-left"
                                            >
                                                Xem tất cả nhóm →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        !isLoading && (
                            <div className="p-4 text-center text-sm text-gray-500">
                                Không tìm thấy kết quả nào
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}