// components/ui/TaskPriorityBadge.js
// Badge component cho task priority với color coding

'use client';

import { clsx } from 'clsx';
import { Flag, AlertTriangle, Zap } from 'lucide-react';

const PRIORITY_CONFIG = {
    low: {
        label: 'Thấp',
        icon: Flag,
        className: 'bg-gray-100 text-gray-600 border-gray-200',
    },
    normal: {
        label: 'Bình thường',
        icon: Flag,
        className: 'bg-blue-100 text-blue-600 border-blue-200',
    },
    high: {
        label: 'Cao',
        icon: AlertTriangle,
        className: 'bg-orange-100 text-orange-600 border-orange-200',
    },
    urgent: {
        label: 'Khẩn cấp',
        icon: Zap,
        className: 'bg-red-100 text-red-600 border-red-200',
    },
};

/**
 * TaskPriorityBadge - Badge hiển thị priority của task
 * @param {Object} props
 * @param {string} props.priority - Task priority (low, normal, high, urgent)
 * @param {boolean} props.showIcon - Hiển thị icon (default: true)
 * @param {'sm'|'md'|'lg'} props.size - Kích thước badge
 * @param {string} props.className - Custom classes
 */
export default function TaskPriorityBadge({ 
    priority = 'normal', 
    showIcon = true,
    size = 'md',
    className 
}) {
    const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
    const Icon = config.icon;

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
        lg: 'text-base px-3 py-1.5',
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-3.5 w-3.5',
        lg: 'h-4 w-4',
    };

    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1.5 rounded-md border font-medium',
                config.className,
                sizeClasses[size],
                className
            )}
        >
            {showIcon && <Icon className={iconSizes[size]} />}
            <span>{config.label}</span>
        </span>
    );
}
