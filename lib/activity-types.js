// lib/activity-types.js
import {
    FolderPlus, FileText, Archive, UserPlus, UserMinus, UserCog,
    CheckCircle, Trophy, Edit, Trash2, Clock, Tag, MessageSquare,
    FileUp, Settings, AlertCircle, Star, GitBranch, Users, Briefcase
} from 'lucide-react';
// Import thêm hàm dịch role project
import { tStatus, tPriority, tTeamRole, tProjectRole } from '@/lib/i18n';

export const ACTIVITY_TYPES = {
    // --- PROJECT TYPES ---
    'project.created': {
        icon: FolderPlus, color: 'text-blue-600', bg: 'bg-blue-100',
        label: 'đã tạo dự án',
    },
    'project.updated': {
        icon: Edit, color: 'text-gray-600', bg: 'bg-gray-100',
        label: 'đã cập nhật dự án',
    },
    'project.archived': {
        icon: Archive, color: 'text-orange-600', bg: 'bg-orange-100',
        label: 'đã lưu trữ dự án',
    },
    'project.deleted': {
        icon: Trash2, color: 'text-red-600', bg: 'bg-red-100',
        label: 'đã xóa dự án', // Mặc dù là soft delete/archive, log vẫn là deleted
    },
    // --- PROJECT MEMBER TYPES ---
    'project.member.added': {
        icon: UserPlus, color: 'text-green-600', bg: 'bg-green-100',
        label: 'đã thêm thành viên vào dự án',
    },
    'project.member.removed': {
        icon: UserMinus, color: 'text-red-600', bg: 'bg-red-100',
        label: 'đã xóa thành viên khỏi dự án',
    },
    'project.member.role_changed': {
        icon: UserCog, color: 'text-purple-600', bg: 'bg-purple-100',
        label: 'đã thay đổi vai trò thành viên dự án',
    },

    // --- TEAM TYPES ---
    'team.created': {
        icon: Users, color: 'text-blue-600', bg: 'bg-blue-100',
        label: 'đã tạo team',
    },
    'team.updated': {
        icon: Edit, color: 'text-gray-600', bg: 'bg-gray-100',
        label: 'đã cập nhật team',
    },
    'team.deleted': {
        icon: Trash2, color: 'text-red-600', bg: 'bg-red-100',
        label: 'đã xóa team',
    },
    'team.archived': {
        icon: Archive, color: 'text-orange-600', bg: 'bg-orange-100',
        label: 'đã lưu trữ team',
    },
    'team.member.added': {
        icon: UserPlus, color: 'text-green-600', bg: 'bg-green-100',
        label: 'đã thêm thành viên vào team', // Rõ hơn
    },
    'team.member.removed': {
        icon: UserMinus, color: 'text-red-600', bg: 'bg-red-100',
        label: 'đã xóa thành viên khỏi team', // Rõ hơn
    },
    'team.member.role_changed': {
        icon: UserCog, color: 'text-purple-600', bg: 'bg-purple-100',
        label: 'đã thay đổi vai trò thành viên team', // Rõ hơn
    },

    // --- TASK TYPES ---
    'task.created': {
        icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100',
        label: 'đã tạo task',
    },
    'task.updated': {
        icon: Edit, color: 'text-gray-600', bg: 'bg-gray-100',
        label: 'đã cập nhật task',
    },
    'task.completed': {
        icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100',
        label: 'đã hoàn thành task',
    },
    'task.reopened': {
        icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100',
        label: 'đã mở lại task',
    },
    'task.deleted': {
        icon: Trash2, color: 'text-red-600', bg: 'bg-red-100',
        label: 'đã xóa task',
    },
    'task.status.changed': {
        icon: GitBranch, color: 'text-indigo-600', bg: 'bg-indigo-100',
        label: 'đã thay đổi trạng thái task',
    },
    'task.priority.changed': {
        icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100',
        label: 'đã thay đổi độ ưu tiên task',
    },
    'task.assignee.changed': {
        icon: UserCog, color: 'text-purple-600', bg: 'bg-purple-100',
        label: 'đã thay đổi người thực hiện task',
    },
    'task.due.changed': {
        icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100',
        label: 'đã thay đổi deadline task',
    },

    // --- OTHER TYPES --- (Giữ nguyên)
    'comment.added': { icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-100', label: 'đã bình luận về task' },
    'comment.updated': { icon: Edit, color: 'text-gray-600', bg: 'bg-gray-100', label: 'đã chỉnh sửa bình luận' },
    'comment.deleted': { icon: Trash2, color: 'text-red-600', bg: 'bg-red-100', label: 'đã xóa bình luận' },
    'attachment.added': { icon: FileUp, color: 'text-green-600', bg: 'bg-green-100', label: 'đã thêm tệp đính kèm' },
    'attachment.deleted': { icon: Trash2, color: 'text-red-600', bg: 'bg-red-100', label: 'đã xóa tệp đính kèm' },
    'tag.added': { icon: Tag, color: 'text-purple-600', bg: 'bg-purple-100', label: 'đã thêm thẻ' },
    'tag.removed': { icon: Tag, color: 'text-gray-600', bg: 'bg-gray-100', label: 'đã xóa thẻ' },
    'points.earned': { icon: Trophy, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'đã nhận' },
    'achievement.unlocked': { icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'đã mở khóa thành tựu' },
    'task.approval.requested': { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-100', label: 'đã yêu cầu phê duyệt task' },
    'task.approval.approved': { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'đã phê duyệt task' },
    'task.approval.rejected': { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'đã từ chối phê duyệt task' },
    'task.assignee.confirmed': { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'đã xác nhận nhận task' },
    'task.assignee.declined': { icon: UserMinus, color: 'text-red-600', bg: 'bg-red-100', label: 'đã từ chối nhận task' },
    'drive.folder.created': { icon: FolderPlus, color: 'text-blue-600', bg: 'bg-blue-100', label: 'đã tạo thư mục Drive' },
    'drive.file.uploaded': { icon: FileUp, color: 'text-green-600', bg: 'bg-green-100', label: 'đã tải tệp lên Drive' },
    'config.platform.created': { icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100', label: 'đã tạo platform' },
    'config.worktype.created': { icon: Briefcase, color: 'text-gray-600', bg: 'bg-gray-100', label: 'đã tạo loại công việc' },
    'default': { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', label: 'hoạt động không xác định' },
};

export function getActivityConfig(type) {
    return ACTIVITY_TYPES[type] || ACTIVITY_TYPES['default'];
}

export function formatActivityMessage(type, payload = {}) {
    const config = getActivityConfig(type);

    if (config.getMessage) {
        try {
            // Truyền thêm tProjectRole
            const helpers = { tStatus, tPriority, tTeamRole, tProjectRole };
            return config.getMessage(payload, helpers);
        } catch (e) {
            console.error(`Error in getMessage for type ${type}:`, e);
            return config.label || type;
        }
    }

    switch (type) {
        case 'task.status.changed':
            if (payload.from && payload.to) {
                return `đã thay đổi trạng thái task từ "${tStatus(payload.from)}" sang "${tStatus(payload.to)}"`;
            }
            return config.label;

        case 'team.member.added':
            return config.label; // "đã thêm thành viên vào team"
        case 'team.member.removed':
            return config.label; // "đã xóa thành viên khỏi team"
        case 'team.member.role_changed':
            if (payload.role) {
                return `đã thay đổi vai trò thành "${tTeamRole(payload.role)}" cho thành viên team`; // Rõ hơn
            }
            return config.label;

        // --- THÊM CÁC CASE CHO PROJECT MEMBER ---
        case 'project.member.added':
            return config.label; // "đã thêm thành viên vào dự án"
        case 'project.member.removed':
            return config.label; // "đã xóa thành viên khỏi dự án"
        case 'project.member.role_changed':
            if (payload.role) {
                // Dùng hàm dịch role project
                return `đã thay đổi vai trò thành "${tProjectRole(payload.role)}" cho thành viên dự án`; // Rõ hơn
            }
            return config.label;
        // --- HẾT PHẦN PROJECT MEMBER ---

        case 'task.priority.changed':
            if (payload.to) {
                return `đã thay đổi độ ưu tiên task thành "${tPriority(payload.to)}"`;
            }
            return config.label;

        case 'task.assignee.changed':
            if (payload.userId) {
                return `đã gán task cho`;
            } else {
                return `đã bỏ gán người thực hiện task`;
            }

        case 'task.due.changed':
            if (payload.to) {
                try {
                    const date = new Date(payload.to).toLocaleDateString('vi-VN');
                    return `đã thay đổi deadline task thành "${date}"`;
                } catch { /* ignore */ }
            } else if (payload.from && !payload.to) {
                return `đã xóa deadline task`;
            }
            return config.label;

        case 'points.earned':
            if (payload.points) {
                return `đã nhận +${payload.points} điểm`;
            }
            return config.label;

        case 'attachment.added':
        case 'attachment.deleted':
            if (payload.fileName) {
                return `${config.label} "${payload.fileName}"`;
            }
            return config.label;

        default:
            let message = config.label || type;
            if (payload.name && !type.startsWith('team.member') && !type.startsWith('project.member') && type !== 'task.assignee.changed') {
                message += ` "${payload.name}"`;
            }
            return message;
    }
}

export function getActivityColors(type) {
    const config = getActivityConfig(type);
    return {
        icon: config.color,
        text: config.color,
        bg: config.bg,
    };
}