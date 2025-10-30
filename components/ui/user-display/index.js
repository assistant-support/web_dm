// components/ui/user-display/index.js
// Mục đích: Component hiển thị thông tin user (tên, avatar) từ userId
// Tối ưu: Ưu tiên nhận `userInfo` từ prop để tránh fetch.
// Giữ lại logic fetch (useEffect) làm dự phòng.

'use client';

import { useState, useEffect } from 'react';
import Avatar from '@/components/ui/avatar';
import { driveImage } from '@/functions';
import { getUserDisplayInfo } from '@/lib/user-display';

export default function UserDisplay({
    userId,
    userInfo: initialUserInfo, // Tối ưu: Nhận userInfo đã được fetch trước
    showAvatar = true,
    avatarSize,
    size = 'sm',
    showJobTitle = false,
    inline = false,
    className = '',
    fullcontent = null,
    isSelf = false,
}) {
    // Tối ưu: Nếu có `initialUserInfo`, dùng nó và bỏ qua state
    const [userInfo, setUserInfo] = useState(initialUserInfo || null);
    // Tối ưu: Chỉ loading khi *không* có `initialUserInfo` và *có* `userId`
    const [isLoading, setIsLoading] = useState(!initialUserInfo && !!userId);

    useEffect(() => {
        // Tối ưu: Nếu đã có `initialUserInfo` hoặc không có `userId`, không làm gì cả
        if (initialUserInfo || !userId) {
            // Nếu userId thay đổi và không có info, đảm bảo state là loading
            if (!initialUserInfo && userId) {
                setUserInfo(null);
                setIsLoading(true);
            } else if (!userId) {
                setUserInfo(null);
                setIsLoading(false);
                return;
            } else {
                // Cập nhật state nếu prop thay đổi (hiếm gặp)
                setUserInfo(initialUserInfo);
                setIsLoading(false);
                return;
            }
        }

        // Logic fetch dự phòng: Chỉ chạy khi KHÔNG có `initialUserInfo`
        const fetchUserInfo = async () => {
            try {
                const data = await getUserDisplayInfo(userId);
                setUserInfo({
                    name: data.name || userId,
                    jobTitle: data.jobTitle || '',
                    avatar: data.avatar || null,
                    color: data.color || null,
                });
            } catch (error) {
                console.error('Error fetching user info:', error);
                setUserInfo({ name: userId, jobTitle: '', avatar: null, color: null });
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserInfo();
    }, [userId, initialUserInfo]); // Phụ thuộc vào cả `userId` và `initialUserInfo`

    if (!userId) {
        return (
            <span className={`text-gray-400 italic ${className}`}>
                Chưa gán
            </span>
        );
    }

    const finalAvatarSize = avatarSize || size;
    const containerClass = inline ? 'inline-flex' : 'flex';

    if (isLoading) {
        const skeletonAvatarSizeClass = {
            xs: 'h-5 w-5',
            sm: 'h-6 w-6',
            md: 'h-8 w-8',
            lg: 'h-10 w-10',
        }[finalAvatarSize] || 'h-6 w-6';

        const skeletonTextHeightClass = {
            xs: 'h-3',
            sm: 'h-4',
            md: 'h-5',
            lg: 'h-6',
        }[size] || 'h-4';

        const skeletonTextWidthClass = {
            xs: 'w-16',
            sm: 'w-20',
            md: 'w-24',
            lg: 'w-28',
        }[size] || 'w-20';

        return (
            <div className={`${containerClass} items-center gap-2 ${className} animate-pulse`}>
                {showAvatar && (
                    <div className={`${skeletonAvatarSizeClass} rounded-full bg-gray-300`}></div>
                )}
                <div className={inline ? '' : 'flex-1 min-w-0'}>
                    <div className={`${skeletonTextHeightClass} ${skeletonTextWidthClass} bg-gray-300 rounded-lg`}></div>
                    {showJobTitle && (
                        <div className="h-3 w-16 bg-gray-300 rounded-lg mt-1"></div>
                    )}
                </div>
            </div>
        );
    }

    // Render khi đã có dữ liệu (hoặc fallback)
    const displayName = userInfo?.name || userId;
    const jobTitle = userInfo?.jobTitle || '';
    const avatarUrl = userInfo?.avatar || null;

    const textSizeClass = {
        xs: 'text-xs',
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    }[size] || 'text-sm';

    return (
        <div className={`${containerClass} items-center gap-4 ${className}`}>
            {showAvatar && (
                <Avatar
                    userId={userId}
                    name={displayName}
                    src={driveImage(avatarUrl)}
                    size={finalAvatarSize}
                />
            )}
            <div className={inline ? '' : 'flex-1 min-w-0 flex flex-col gap-2'}>
                <div className={`${textSizeClass} font-medium text-gray-900`}>
                    <span>    {displayName}</span>
                    {isSelf && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 ml-3">
                            Bạn
                        </span>
                    )}

                </div>
                {fullcontent}
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
 * UserName - Component con, chỉ hiển thị tên (không avatar)
 */
export function UserName({ userId, className = '' }) {
    // Tối ưu: Không thể truyền `userInfo` vào đây vì không có sẵn
    // Nó sẽ tự dùng logic fetch dự phòng (chấp nhận được)
    return (
        <UserDisplay
            userId={userId}
            showAvatar={false}
            className={className}
        />
    );
}

/**
 * UserBadge - Component con, hiển thị dạng "badge" (avatar nhỏ + tên)
 */
export function UserBadge({ userId, className = '' }) {
    // Tối ưu: Tương tự UserName, sẽ tự fetch
    return (
        <UserDisplay
            userId={userId}
            size="xs"
            inline={true}
            className={className}
        />
    );
}