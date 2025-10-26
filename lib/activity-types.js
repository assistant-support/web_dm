// lib/activity-types.js
// Định nghĩa các loại hoạt động và cấu hình hiển thị

import { 
    FolderPlus, 
    FileText, 
    Archive, 
    UserPlus, 
    UserMinus, 
    UserCog,
    CheckCircle, 
    Trophy, 
    Edit,
    Trash2,
    Clock,
    Tag,
    MessageSquare,
    FileUp,
    Settings,
    AlertCircle,
    Star,
    GitBranch,
    Users,
    Briefcase
} from 'lucide-react';

/**
 * Activity Type Configuration
 * @typedef {Object} ActivityTypeConfig
 * @property {Component} icon - Lucide icon component
 * @property {string} color - Text color class (text-*)
 * @property {string} bg - Background color class (bg-*)
 * @property {string} label - Label hiển thị tiếng Việt
 * @property {Function} [getMessage] - Function tùy chỉnh message (optional)
 */

export const ACTIVITY_TYPES = {
    // ============ PROJECT ============
    'project.created': {
        icon: FolderPlus,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        label: 'tạo dự án',
    },
    'project.updated': {
        icon: Edit,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        label: 'cập nhật dự án',
    },
    'project.archived': {
        icon: Archive,
        color: 'text-orange-600',
        bg: 'bg-orange-100',
        label: 'lưu trữ dự án',
    },
    'project.deleted': {
        icon: Trash2,
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: 'xóa dự án',
    },

    // ============ TEAM ============
    'team.created': {
        icon: Users,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        label: 'tạo team',
    },
    'team.updated': {
        icon: Edit,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        label: 'cập nhật team',
    },
    'team.deleted': {
        icon: Trash2,
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: 'xóa team',
    },

    // ============ MEMBER ============
    'member.added': {
        icon: UserPlus,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'thêm thành viên',
    },
    'member.removed': {
        icon: UserMinus,
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: 'xóa thành viên',
    },
    'member.role.changed': {
        icon: UserCog,
        color: 'text-purple-600',
        bg: 'bg-purple-100',
        label: 'thay đổi vai trò',
    },

    // ============ TASK ============
    'task.created': {
        icon: FileText,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        label: 'tạo task',
    },
    'task.updated': {
        icon: Edit,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        label: 'cập nhật task',
    },
    'task.completed': {
        icon: CheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'hoàn thành task',
    },
    'task.reopened': {
        icon: AlertCircle,
        color: 'text-orange-600',
        bg: 'bg-orange-100',
        label: 'mở lại task',
    },
    'task.deleted': {
        icon: Trash2,
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: 'xóa task',
    },
    'task.status.changed': {
        icon: GitBranch,
        color: 'text-indigo-600',
        bg: 'bg-indigo-100',
        label: 'thay đổi trạng thái',
    },
    'task.priority.changed': {
        icon: AlertCircle,
        color: 'text-orange-600',
        bg: 'bg-orange-100',
        label: 'thay đổi độ ưu tiên',
    },
    'task.assignee.changed': {
        icon: UserCog,
        color: 'text-purple-600',
        bg: 'bg-purple-100',
        label: 'thay đổi người thực hiện',
    },
    'task.due.changed': {
        icon: Clock,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        label: 'thay đổi deadline',
    },

    // ============ COMMENT ============
    'comment.added': {
        icon: MessageSquare,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        label: 'bình luận',
    },
    'comment.updated': {
        icon: Edit,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        label: 'chỉnh sửa bình luận',
    },
    'comment.deleted': {
        icon: Trash2,
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: 'xóa bình luận',
    },

    // ============ ATTACHMENT ============
    'attachment.added': {
        icon: FileUp,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'thêm file đính kèm',
    },
    'attachment.deleted': {
        icon: Trash2,
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: 'xóa file đính kèm',
    },

    // ============ TAG ============
    'tag.added': {
        icon: Tag,
        color: 'text-purple-600',
        bg: 'bg-purple-100',
        label: 'thêm thẻ',
    },
    'tag.removed': {
        icon: Tag,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        label: 'xóa thẻ',
    },

    // ============ POINTS/REWARDS ============
    'points.earned': {
        icon: Trophy,
        color: 'text-yellow-600',
        bg: 'bg-yellow-100',
        label: 'nhận điểm',
    },
    'achievement.unlocked': {
        icon: Star,
        color: 'text-yellow-600',
        bg: 'bg-yellow-100',
        label: 'mở khóa thành tựu',
    },

    // ============ APPROVAL ============
    'task.approval.requested': {
        icon: AlertCircle,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        label: 'yêu cầu phê duyệt',
    },
    'task.approval.approved': {
        icon: CheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'phê duyệt task',
    },
    'task.approval.rejected': {
        icon: AlertCircle,
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: 'từ chối phê duyệt',
    },

    // ============ ASSIGNEE CONFIRMATION ============
    'task.assignee.confirmed': {
        icon: CheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'xác nhận nhận task',
    },
    'task.assignee.declined': {
        icon: UserMinus,
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: 'từ chối nhận task',
    },

    // ============ DRIVE ============
    'drive.folder.created': {
        icon: FolderPlus,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        label: 'tạo folder Drive',
    },
    'drive.file.uploaded': {
        icon: FileUp,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'tải file lên Drive',
    },

    // ============ CONFIG ============
    'config.platform.created': {
        icon: Settings,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        label: 'tạo platform',
    },
    'config.worktype.created': {
        icon: Briefcase,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        label: 'tạo loại công việc',
    },

    // ============ DEFAULT ============
    'default': {
        icon: Clock,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        label: 'hoạt động',
    },
};

/**
 * Get activity type configuration
 * @param {string} type - Activity type
 * @returns {ActivityTypeConfig}
 */
export function getActivityConfig(type) {
    return ACTIVITY_TYPES[type] || ACTIVITY_TYPES['default'];
}

/**
 * Format activity message with payload data
 * @param {string} type - Activity type
 * @param {Object} payload - Activity payload
 * @returns {string} - Formatted message
 */
export function formatActivityMessage(type, payload = {}) {
    const config = getActivityConfig(type);
    
    if (config.getMessage) {
        return config.getMessage(payload);
    }

    // Default message formatting
    let message = config.label;

    // Add specific details based on payload
    if (payload.name) {
        message += ` "${payload.name}"`;
    }

    if (payload.from && payload.to) {
        message += ` từ "${payload.from}" sang "${payload.to}"`;
    }

    if (payload.role) {
        message += ` với vai trò ${payload.role}`;
    }

    if (payload.points) {
        message += ` +${payload.points} điểm`;
    }

    return message;
}

/**
 * Get activity color classes
 * @param {string} type - Activity type
 * @returns {{ icon: string, text: string, bg: string }}
 */
export function getActivityColors(type) {
    const config = getActivityConfig(type);
    return {
        icon: config.color,
        text: config.color,
        bg: config.bg,
    };
}
