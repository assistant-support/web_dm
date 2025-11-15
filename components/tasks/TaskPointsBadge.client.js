// components/tasks/TaskPointsBadge.client.js
'use client';

import clsx from 'clsx';

/**
 * TaskPointsBadge - Display task points with visual indicator
 * Shows finalized points in green, expected points in gray
 * 
 * @param {Object} props
 * @param {Object} props.task - Task object with displayPoints and isPointsFinalized
 * @param {string} props.size - Size variant: 'sm' | 'md' | 'lg'
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export default function TaskPointsBadge({ 
    task, 
    size = 'md', 
    className = '' 
}) {
    const displayPoints = task?.displayPoints ?? 0;
    const isFinalized = task?.isPointsFinalized ?? false;

    // Don't render if no points
    if (displayPoints === 0) {
        return (
            <span className={clsx(
                'inline-flex items-center gap-1 font-medium text-gray-400',
                sizeClasses[size],
                className
            )}>
                0đ
            </span>
        );
    }

    // Finalized points (completed tasks)
    if (isFinalized) {
        return (
            <div className={clsx(
                'inline-flex items-center gap-1.5 rounded-md px-2 py-1',
                'bg-green-50 border border-green-200',
                className
            )}>
                <span className={clsx(
                    'font-bold text-green-700',
                    sizeClasses[size]
                )}>
                    {displayPoints}đ
                </span>
                <span className={clsx(
                    'text-green-600 font-medium',
                    labelSizeClasses[size]
                )}>
                    (Đã chốt)
                </span>
            </div>
        );
    }

    // Expected/initial points (not yet completed)
    return (
        <div className={clsx(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-1',
            'bg-gray-50 border border-gray-200',
            className
        )}>
            <span className={clsx(
                'font-semibold text-gray-600',
                sizeClasses[size]
            )}>
                {displayPoints}đ
            </span>
            <span className={clsx(
                'text-gray-500',
                labelSizeClasses[size]
            )}>
                (Dự kiến)
            </span>
        </div>
    );
}

// Size variants
const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
};

const labelSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm'
};
