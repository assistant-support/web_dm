// components/ui/TaskStatusBadge.js
// Badge component cho task status với color coding

'use client';

import { clsx } from 'clsx';
import { 
    Circle, 
    Clock, 
    PlayCircle, 
    PauseCircle, 
    CheckCircle2, 
    XCircle, 
    AlertCircle,
    FileText
} from 'lucide-react';

const STATUS_CONFIG = {
    draft: {
        label: 'Nháp',
        icon: FileText,
        className: 'bg-gray-100 text-gray-700 border-gray-200',
    },
    pending_approval: {
        label: 'Chờ duyệt',
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    },
    waiting_confirm: {
        label: 'Chờ xác nhận',
        icon: AlertCircle,
        className: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    in_progress: {
        label: 'Đang làm',
        icon: PlayCircle,
        className: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    on_hold: {
        label: 'Tạm dừng',
        icon: PauseCircle,
        className: 'bg-purple-100 text-purple-700 border-purple-200',
    },
    completed_await_review: {
        label: 'Chờ review',
        icon: Circle,
        className: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    },
    completed: {
        label: 'Hoàn thành',
        icon: CheckCircle2,
        className: 'bg-green-100 text-green-700 border-green-200',
    },
    rejected: {
        label: 'Từ chối',
        icon: XCircle,
        className: 'bg-red-100 text-red-700 border-red-200',
    },
    cancelled: {
        label: 'Đã hủy',
        icon: XCircle,
        className: 'bg-gray-100 text-gray-600 border-gray-200',
    },
};

/**
 * TaskStatusBadge - Badge hiển thị status của task
 * @param {Object} props
 * @param {string} props.status - Task status (draft, in_progress, completed, etc.)
 * @param {boolean} props.showIcon - Hiển thị icon (default: true)
 * @param {'sm'|'md'|'lg'} props.size - Kích thước badge
 * @param {string} props.className - Custom classes
 */
export default function TaskStatusBadge({ 
    status = 'draft', 
    showIcon = true,
    size = 'md',
    className 
}) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
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
