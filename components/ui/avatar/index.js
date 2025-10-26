// components/ui/avatar/index.js
// Mục đích: Avatar component hiển thị ảnh đại diện hoặc initials

'use client';

import clsx from 'clsx';

/**
 * Lấy initials từ tên (2 chữ cái đầu)
 */
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Tạo màu background từ userId (hash đơn giản)
 */
function getColorFromId(userId) {
    if (!userId) return 'bg-gray-400';
    
    const colors = [
        'bg-red-500',
        'bg-orange-500',
        'bg-amber-500',
        'bg-yellow-500',
        'bg-lime-500',
        'bg-green-500',
        'bg-emerald-500',
        'bg-teal-500',
        'bg-cyan-500',
        'bg-sky-500',
        'bg-blue-500',
        'bg-indigo-500',
        'bg-violet-500',
        'bg-purple-500',
        'bg-fuchsia-500',
        'bg-pink-500',
        'bg-rose-500',
    ];
    
    // Simple hash: sum of char codes
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

/**
 * Avatar Component
 * @param {Object} props
 * @param {string} props.userId - User ID để tạo màu
 * @param {string} props.name - Tên để hiển thị initials
 * @param {string} props.src - URL ảnh (optional, chưa implement)
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} props.size - Kích thước avatar
 * @param {string} props.className - Custom classes
 */
export default function Avatar({ 
    userId, 
    name = '', 
    src, 
    size = 'md', 
    className 
}) {
    const sizeClasses = {
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-sm',
        md: 'h-10 w-10 text-base',
        lg: 'h-12 w-12 text-lg',
        xl: 'h-16 w-16 text-xl',
    };

    const initials = getInitials(name);
    const bgColor = getColorFromId(userId);

    // If has avatar URL, show image
    if (src) {
        return (
            <img
                src={src}
                alt={name || userId}
                className={clsx(
                    'inline-flex items-center justify-center rounded-full object-cover',
                    sizeClasses[size],
                    className
                )}
                title={name || userId}
                onError={(e) => {
                    const fallback = e.target.nextElementSibling;
                    if (fallback) fallback.style.display = 'flex';
                }}
            />
        );
    }

    return (
        <div
            className={clsx(
                'inline-flex items-center justify-center rounded-full text-white font-semibold',
                sizeClasses[size],
                bgColor,
                className
            )}
            title={name || userId}
        >
            {initials}
        </div>
    );
}

/**
 * Avatar Group - Hiển thị nhiều avatars chồng lên nhau
 */
export function AvatarGroup({ children, max = 3, className }) {
    const childrenArray = Array.isArray(children) ? children : [children];
    const displayChildren = childrenArray.slice(0, max);
    const remaining = childrenArray.length - max;

    return (
        <div className={clsx('flex -space-x-2', className)}>
            {displayChildren.map((child, index) => (
                <div key={index} className="ring-2 ring-white rounded-full">
                    {child}
                </div>
            ))}
            {remaining > 0 && (
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gray-200 text-gray-600 text-sm font-medium ring-2 ring-white">
                    +{remaining}
                </div>
            )}
        </div>
    );
}
