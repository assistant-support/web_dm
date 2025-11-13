// components/ui/badge/index.js
// Mục đích: Badge component để hiển thị status, priority, tags với màu sắc phù hợp

import clsx from 'clsx';
import { TASK_STATUS, PRIORITY } from '@/model/common/enums.js';

/**
 * Badge Component
 * @param {Object} props
 * @param {'default'|'status'|'priority'|'tag'|'role'} props.variant - Loại badge
 * @param {string} props.status - Task status (nếu variant='status')
 * @param {string} props.priority - Priority level (nếu variant='priority')
 * @param {string} props.role - Role name (nếu variant='role')
 * @param {string} props.className - Custom classes
 * @param {React.ReactNode} props.children - Nội dung badge
 */
export default function Badge({ 
    variant = 'default', 
    status, 
    priority, 
    role,
    className, 
    children 
}) {
    // Màu cho status
    const statusColors = {
        [TASK_STATUS.DRAFT]: 'bg-gray-100 text-gray-700',
        [TASK_STATUS.PENDING_APPROVAL]: 'bg-yellow-100 text-yellow-800',
        [TASK_STATUS.WAITING_ASSIGNEE_CONFIRM]: 'bg-orange-100 text-orange-800',
        [TASK_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
        [TASK_STATUS.ON_HOLD]: 'bg-purple-100 text-purple-800',
        [TASK_STATUS.COMPLETED_AWAIT_REVIEW]: 'bg-indigo-100 text-indigo-800',
        [TASK_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
        [TASK_STATUS.REJECTED]: 'bg-red-100 text-red-800',
        [TASK_STATUS.CANCELLED]: 'bg-gray-100 text-gray-600',
    };

    // Màu cho priority
    const priorityColors = {
        [PRIORITY.URGENT]: 'bg-red-100 text-red-800 ring-1 ring-red-300',
        [PRIORITY.HIGH]: 'bg-orange-100 text-orange-800',
    [PRIORITY.MEDIUM]: 'bg-blue-100 text-blue-800',
        [PRIORITY.LOW]: 'bg-gray-100 text-gray-700',
    };

    // Màu cho role
    const roleColors = {
        manager: 'bg-purple-100 text-purple-800',
        owner: 'bg-indigo-100 text-indigo-800',
        member: 'bg-blue-100 text-blue-800',
        viewer: 'bg-gray-100 text-gray-700',
    };

    let colorClass = 'bg-gray-100 text-gray-700'; // default

    if (variant === 'status' && status) {
        colorClass = statusColors[status] || colorClass;
    } else if (variant === 'priority' && priority) {
        colorClass = priorityColors[priority] || colorClass;
    } else if (variant === 'role' && role) {
        colorClass = roleColors[role.toLowerCase()] || colorClass;
    } else if (variant === 'tag') {
        colorClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200';
    }

    return (
        <span
            className={clsx(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                colorClass,
                className
            )}
        >
            {children}
        </span>
    );
}

/**
 * Badge Group - Hiển thị nhiều badges
 */
export function BadgeGroup({ children, className }) {
    return (
        <div className={clsx('flex flex-wrap gap-1', className)}>
            {children}
        </div>
    );
}
