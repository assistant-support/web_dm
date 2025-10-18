// lib/i18n.js
// Tác dụng file: Helper i18n đơn giản (tiếng Việt) cho enum & chuỗi ngắn.
// - Cung cấp hàm dịch ngắn cho Status/Priority/Role và t() tổng quát.
// - Ưu tiên dùng constants meta để lấy label; fallback dictionary.

import {
    TASK_STATUS,
    PRIORITY,
    TEAM_ROLE,
    PROJECT_ROLE,
} from '@/model/common/enums.js';
import {
    STATUS_META,
    PRIORITY_META,
    TEAM_ROLE_META,
    PROJECT_ROLE_META,
} from '@/data/_shared/constants.js';

/** Dictionary fallback cho vài khoá rời rạc */
const DICT_VI = {
    high: 'Cao',
    urgent: 'Khẩn cấp',
    normal: 'Bình thường',
    low: 'Thấp',
    manager: 'Quản lý',
    member: 'Thành viên',
    owner: 'Chủ dự án',
    viewer: 'Xem',
};

/** Trả nhãn tiếng Việt cho 1 chuỗi ngắn (fallback). */
export function t(key) {
    if (!key) return '';
    const k = String(key).toLowerCase();
    return DICT_VI[k] || key;
}

/** Dịch trạng thái Task (ưu tiên meta). */
export function tStatus(status) {
    if (!status) return '';
    const meta = STATUS_META[status] || null;
    return meta?.label || status;
}

/** Dịch độ ưu tiên (ưu tiên meta). */
export function tPriority(priority) {
    if (!priority) return '';
    const meta = PRIORITY_META[priority] || null;
    return meta?.label || t(priority);
}

/** Dịch role team (ưu tiên meta). */
export function tTeamRole(role) {
    if (!role) return '';
    const meta = TEAM_ROLE_META[role] || null;
    return meta?.label || t(role);
}

/** Dịch role project (ưu tiên meta). */
export function tProjectRole(role) {
    if (!role) return '';
    const meta = PROJECT_ROLE_META[role] || null;
    return meta?.label || t(role);
}

export const ENUMS = {
    TASK_STATUS,
    PRIORITY,
    TEAM_ROLE,
    PROJECT_ROLE,
};
