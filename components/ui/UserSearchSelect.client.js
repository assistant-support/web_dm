// components/ui/UserSearchSelect.client.js
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { listForPicker } from '@/data/appUser/actions.js';
import { Search, User, X } from 'lucide-react';

/**
 * UserSearchSelect - Component chọn người dùng với search
 * Props:
 * - value: externalUserId hiện tại
 * - onChange: (externalUserId) => void
 * - placeholder: string
 * - includeUserIds: array of externalUserId to include (FILTER BY THIS)
 * - excludeUserIds: array of externalUserId to exclude
 * - disabled: boolean
 * - className: string
 */
export default function UserSearchSelect({
    value,
    onChange,
    placeholder = 'Tìm kiếm người dùng...',
    includeUserIds = [], // NEW: Only show these users
    excludeUserIds = [],
    disabled = false,
    className = '',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Load users when dropdown opens or search changes
    useEffect(() => {
        if (!isOpen) return;

        const loadUsers = async () => {
            setLoading(true);
            try {
                const result = await listForPicker({ 
                    q: searchQuery, 
                    limit: 100 
                });
                
                if (result.ok) {
                    let filtered = result.data.items;
                    
                    // If includeUserIds provided, only show those users
                    if (includeUserIds && includeUserIds.length > 0) {
                        filtered = filtered.filter(u => includeUserIds.includes(u.value));
                    }
                    
                    // Then exclude specific users
                    if (excludeUserIds && excludeUserIds.length > 0) {
                        filtered = filtered.filter(u => !excludeUserIds.includes(u.value));
                    }
                    
                    setUsers(filtered);
                }
            } catch (error) {
                console.error('Error loading users:', error);
                setUsers([]);
            } finally {
                setLoading(false);
            }
        };

        // Debounce search
        const debounce = setTimeout(loadUsers, 300);
        return () => clearTimeout(debounce);
    }, [excludeUserIds, includeUserIds, isOpen, searchQuery]);

    // Load selected user info ONCE when value changes
    useEffect(() => {
        if (!value) {
            setSelectedUser(null);
            return;
        }

        // Skip if already loaded
        if (selectedUser && selectedUser.value === value) {
            return;
        }

        const loadSelectedUser = async () => {
            try {
                const result = await listForPicker({ 
                    q: value, 
                    limit: 1 
                });
                
                if (result.ok && result.data.items.length > 0) {
                    const user = result.data.items.find(u => u.value === value);
                    if (user) {
                        setSelectedUser(user);
                    }
                }
            } catch (error) {
                console.error('Error loading selected user:', error);
            }
        };

        loadSelectedUser();
    }, [selectedUser, value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleSelect = (user) => {
        onChange(user.value);
        setSelectedUser(user);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleClear = () => {
        onChange('');
        setSelectedUser(null);
        setSearchQuery('');
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Input Area */}
            <div
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg border
                    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-text'}
                    ${isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300'}
                `}
                onClick={() => {
                    if (disabled) return;
                    setIsOpen(true);
                    if (inputRef.current) inputRef.current.focus();
                }}
            >
                {/* Selected User Display */}
                {selectedUser && !isOpen ? (
                    <>
                        <div className="flex items-center gap-2 flex-1">
                            <AvatarThumbnail
                                src={selectedUser.avatar}
                                alt={selectedUser.name}
                                size="sm"
                                className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                                fallback={(
                                    <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                        <User className="h-3 w-3 text-gray-500" />
                                    </div>
                                )}
                            />
                            <span className="text-sm text-gray-900 truncate">
                                {selectedUser.name}
                            </span>
                        </div>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClear();
                                }}
                                className="ml-auto p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-400" />
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => !disabled && setIsOpen(true)}
                            placeholder={placeholder}
                            disabled={disabled}
                            className="flex-1 outline-none text-sm bg-transparent disabled:cursor-not-allowed"
                        />
                        {selectedUser && !disabled && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClear();
                                }}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-400" />
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-2 w-full max-h-64 overflow-auto bg-white rounded-lg border border-gray-200 shadow-lg">
                    {loading ? (
                        <div className="p-3 text-center text-sm text-gray-500">
                            Đang tải...
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-3 text-center text-sm text-gray-500">
                            {searchQuery ? 'Không tìm thấy người dùng' : 'Nhập để tìm kiếm'}
                        </div>
                    ) : (
                        <ul className="py-1">
                            {users.map((user) => (
                                <li key={user.value}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(user)}
                                        className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                                    >
                                        {/* Avatar */}
                                        <AvatarThumbnail
                                            src={user.avatar}
                                            alt={user.name}
                                            size="md"
                                            className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                                            fallback={(
                                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                                    <User className="h-4 w-4 text-gray-500" />
                                                </div>
                                            )}
                                        />

                                        {/* User Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">
                                                {user.name}
                                            </div>
                                            {user.email && (
                                                <div className="text-xs text-gray-500 truncate">
                                                    {user.email}
                                                </div>
                                            )}
                                            {user.jobTitle && (
                                                <div className="text-xs text-gray-400 truncate">
                                                    {user.jobTitle}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

function AvatarThumbnail({ src, alt, size, className = '', fallback = null }) {
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        setLoadError(false);
    }, [src]);

    if (!src || loadError) {
        return fallback;
    }

    const dimensions = size === 'sm' ? 24 : 32;

    return (
        <Image
            src={src}
            alt={alt}
            width={dimensions}
            height={dimensions}
            className={className}
            sizes={`${dimensions}px`}
            onError={() => setLoadError(true)}
        />
    );
}
