// components/layout/header/SearchInput.client.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Briefcase, Folder, Users, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/debounce.hook';
import { searchGlobal } from '@/actions/search.actions';
import Link from 'next/link';

export default function SearchInput() {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const containerRef = useRef(null);
    const router = useRouter();

    const debouncedQuery = useDebounce(searchQuery, 300);

    useEffect(() => {
        const fetchResults = async () => {
            if (debouncedQuery.trim().length === 0) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const data = await searchGlobal(debouncedQuery);
                setResults(data);
                setShowResults(true);
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

    const getIcon = (type) => {
        switch (type) {
            case 'team': return <Users className="w-4 h-4 text-blue-500" />;
            case 'project': return <Folder className="w-4 h-4 text-orange-500" />;
            case 'task': return <Briefcase className="w-4 h-4 text-green-500" />;
            default: return <Search className="w-4 h-4 text-gray-500" />;
        }
    };

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
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[420px] overflow-y-auto z-50">
                    {results.length > 0 ? (
                        <div className="py-1">
                            {results.map((result) => (
                                <div
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => {
                                        setShowResults(false);
                                        setSearchQuery('');
                                        router.push(result.url);
                                    }}
                                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                                        {getIcon(result.type)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium text-gray-900 truncate">
                                            {result.title}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                            {result.subtitle}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-400">{result.type}</div>
                                </div>
                            ))}

                            <div className="border-t border-gray-100 mt-2 pt-2 px-4 pb-1">
                                <button 
                                    onClick={handleSearch}
                                    className="text-xs text-blue-600 hover:underline w-full text-center"
                                >
                                    Xem tất cả kết quả cho &quot;{searchQuery}&quot;
                                </button>
                            </div>
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