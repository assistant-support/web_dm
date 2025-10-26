// components/ui/user-display/index.js
// Mục đích: Component hiển thị thông tin user (tên, avatar) từ userId

'use client';

import { useState, useEffect } from 'react';
import Avatar from '@/components/ui/avatar';
import { driveImage } from '@/functions';
import { getUserDisplayInfo } from '@/lib/user-display'; 

/**
 * UserDisplay - Hiển thị user với avatar và tên
 * Tự động fetch thông tin user từ API dựa trên userId.
 * @param {Object} props
 * @param {string} props.userId - ID của user cần hiển thị
 * @param {boolean} [props.showAvatar=true] - Hiển thị avatar
 * @param {'xs'|'sm'|'md'|'lg'} [props.avatarSize] - Kích thước avatar (ghi đè size)
 * @param {'xs'|'sm'|'md'|'lg'} [props.size='sm'] - Kích thước tổng thể (cho cả avatar và text)
 * @param {boolean} [props.showJobTitle=false] - Hiển thị chức vụ (nếu có)
 * @param {boolean} [props.inline=false] - Hiển thị dạng inline-flex
 * @param {string} [props.className] - Custom CSS classes
 */

export default function UserDisplay({
    userId,
    showAvatar = true,
    avatarSize,
    size = 'sm',
    showJobTitle = false,
    inline = false,
    className = ''
}) {
    const [userInfo, setUserInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 1. Xử lý trường hợp không có userId
        if (!userId) {
            setUserInfo(null); // Đảm bảo userInfo rỗng
            setIsLoading(false); // Không cần tải gì
            return;
        }

        // 2. Reset state khi userId thay đổi để fetch lại
        setIsLoading(true);
        setUserInfo(null);

        // 3. Lấy thông tin user từ cached server action (thay vì fetch API)
        const fetchUserInfo = async () => {
            try {
                const data = await getUserDisplayInfo(userId);
                setUserInfo({
                    name: data.name || userId, // Fallback về userId nếu không có tên
                    jobTitle: data.jobTitle || '',
                    avatar: data.avatar || null,
                    color: data.color || null,
                });
            } catch (error) {
                console.error('Error fetching user info:', error);
                // Lỗi, hiển thị userId như tên
                setUserInfo({ name: userId, jobTitle: '', avatar: null, color: null });
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserInfo();
    }, [userId]); // Chỉ chạy lại khi userId thay đổi

    // Render khi không có userId
    if (!userId) {
        return (
            <span className={`text-gray-400 italic ${className}`}>
                Chưa gán
            </span>
        );
    }

    // ----- Các biến dùng chung -----
    const finalAvatarSize = avatarSize || size;
    const containerClass = inline ? 'inline-flex' : 'flex';

    // ----- Render Skeleton Loading -----
    // Hiển thị khung sườn với hiệu ứng pulse khi đang tải
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
                    {/* Khung sườn cho tên */}
                    <div className={`${skeletonTextHeightClass} ${skeletonTextWidthClass} bg-gray-300 rounded-lg`}></div>
                    
                    {/* Khung sườn cho chức vụ (nếu bật) */}
                    {showJobTitle && (
                        <div className="h-3 w-16 bg-gray-300 rounded-lg mt-1"></div>
                    )}
                </div>
            </div>
        );
    }

    // ----- Render Dữ Liệu Đã Tải Xong -----
    // Lúc này, isLoading=false và userInfo đã có dữ liệu (hoặc fallback)
    const displayName = userInfo?.name || userId; // Luôn có giá trị
    const jobTitle = userInfo?.jobTitle || '';
    const avatarUrl = userInfo?.avatar || null;

    // Ánh xạ kích thước tổng thể sang kích thước chữ
    const textSizeClass = {
        xs: 'text-xs',
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    }[size] || 'text-sm';

    return (
        <div className={`${containerClass} items-center gap-2 ${className}`}>
            {showAvatar && (
                <Avatar
                    userId={userId}
                    name={displayName}
                    src={driveImage(avatarUrl)} // Sử dụng hàm driveImage
                    size={finalAvatarSize}
                />
            )}
            <div className={inline ? '' : 'flex-1 min-w-0'}>
                {/* Tên user */}
                <span className={`${textSizeClass} font-medium text-gray-900`}>
                    {displayName}
                </span>

                {/* Chức vụ (nếu bật và có dữ liệu) */}
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
    return (
        <UserDisplay
            userId={userId}
            size="xs" // Mặc định size nhỏ cho badge
            inline={true} // Mặc định inline
            className={className}
        />
    );
}