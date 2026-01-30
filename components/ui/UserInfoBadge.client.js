'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { User, Shield, Crown } from 'lucide-react';

/**
 * Component hiển thị thông tin tài khoản và quyền của người dùng
 */
export default function UserInfoBadge({ userName, userRole, userId, className = '' }) {
    const [isVisible, setIsVisible] = useState(true);
    
    // Tự động ẩn sau 5 giây
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 5000);
        
        return () => clearTimeout(timer);
    }, []);
    
    if (!isVisible) return null;
    
    const getRoleInfo = (role) => {
        switch (role) {
            case 'admin':
                return {
                    label: 'Quản trị viên',
                    icon: Crown,
                    color: 'bg-purple-100 border-purple-300 text-purple-700',
                    iconColor: 'text-purple-600'
                };
            case 'manager':
                return {
                    label: 'Quản lý',
                    icon: Shield,
                    color: 'bg-blue-100 border-blue-300 text-blue-700',
                    iconColor: 'text-blue-600'
                };
            case 'owner':
                return {
                    label: 'Chủ sở hữu',
                    icon: Crown,
                    color: 'bg-amber-100 border-amber-300 text-amber-700',
                    iconColor: 'text-amber-600'
                };
            default:
                return {
                    label: 'Thành viên',
                    icon: User,
                    color: 'bg-gray-100 border-gray-300 text-gray-700',
                    iconColor: 'text-gray-600'
                };
        }
    };
    
    const roleInfo = getRoleInfo(userRole);
    const RoleIcon = roleInfo.icon;
    
    return (
        <div
            className={clsx(
                "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm",
                "flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300",
                roleInfo.color,
                className
            )}
            onClick={() => setIsVisible(false)}
            style={{ cursor: 'pointer' }}
            title="Click để đóng"
        >
            <RoleIcon className={clsx("h-5 w-5 flex-shrink-0", roleInfo.iconColor)} />
            <div className="flex flex-col min-w-0">
                <div className="font-semibold text-sm truncate">{userName || 'Unknown'}</div>
                <div className="text-xs opacity-80">{roleInfo.label}</div>
                {userId && (
                    <div className="text-[10px] opacity-60 mt-0.5 font-mono">ID: {userId.slice(0, 8)}...</div>
                )}
            </div>
            <button
                className="ml-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsVisible(false);
                }}
            >
                ✕
            </button>
        </div>
    );
}

