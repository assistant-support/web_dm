// components/ui/user-display/index.js
// Mục đích: Component hiển thị thông tin user (tên thay vì ID)

'use client';

import { useState, useEffect } from 'react';
import Avatar from '@/components/ui/avatar';

/**
 * UserDisplay - Hiển thị user với avatar và tên
 * @param {Object} props
 * @param {string} props.userId - External user ID
 * @param {boolean} props.showAvatar - Hiển thị avatar (default: true)
 * @param {'xs'|'sm'|'md'|'lg'} props.avatarSize - Kích thước avatar
 * @param {boolean} props.showJobTitle - Hiển thị job title (default: false)
 * @param {string} props.className - Custom classes
 */
export default function UserDisplay({ 
    userId, 
    showAvatar = true, 
    avatarSize = 'sm',
    showJobTitle = false,
    className = '' 
}) {
    const [displayName, setDisplayName] = useState(userId || 'Đang tải...');
    const [jobTitle, setJobTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setDisplayName('Chưa gán');
            setIsLoading(false);
            return;
        }

        // Fetch user info from API
        const fetchUserInfo = async () => {
            try {
                const response = await fetch(`/api/users/${userId}`);
                if (response.ok) {
                    const data = await response.json();
                    setDisplayName(data.name || userId);
                    setJobTitle(data.jobTitle || '');
                } else {
                    setDisplayName(userId);
                }
            } catch (error) {
                console.error('Error fetching user info:', error);
                setDisplayName(userId);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserInfo();
    }, [userId]);

    if (!userId) {
        return (
            <span className={`text-gray-400 italic ${className}`}>
                Chưa gán
            </span>
        );
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {showAvatar && (
                <Avatar 
                    userId={userId} 
                    name={displayName}
                    size={avatarSize} 
                />
            )}
            <div className="flex-1 min-w-0">
                <span className={`text-sm ${isLoading ? 'text-gray-400' : 'text-gray-900'}`}>
                    {displayName}
                </span>
                {showJobTitle && jobTitle && (
                    <span className="text-xs text-gray-500 ml-1">
                        ({jobTitle})
                    </span>
                )}
            </div>
        </div>
    );
}

/**
 * UserName - Chỉ hiển thị tên (không avatar)
 */
export function UserName({ userId, className = '' }) {
    return (
        <UserDisplay 
            userId={userId} 
            showAvatar={false} 
            className={className}
        />
    );
}

/**
 * UserBadge - Hiển thị compact với avatar nhỏ
 */
export function UserBadge({ userId, className = '' }) {
    return (
        <UserDisplay 
            userId={userId} 
            avatarSize="xs"
            className={`inline-flex ${className}`}
        />
    );
}
