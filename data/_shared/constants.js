// data/_shared/constants.js
// Tác dụng file: Gom meta (nhãn/màu/thứ tự) cho enums + helpers lấy meta nhanh (status/priority/roles).

import { TASK_STATUS, PRIORITY, TEAM_ROLE, PROJECT_ROLE } from '@/model/common/enums.js';

/** Meta trạng thái Task (tiếng Việt + màu + order) */
export const STATUS_META = {
    [TASK_STATUS.DRAFT]: { label: 'Nháp', color: '#94a3b8', order: 10 },
    [TASK_STATUS.PENDING_APPROVAL]: { label: 'Chờ duyệt', color: '#f59e0b', order: 20 },
    [TASK_STATUS.WAITING_ASSIGNEE_CONFIRM]: { label: 'Chờ xác nhận', color: '#38bdf8', order: 30 },
    [TASK_STATUS.IN_PROGRESS]: { label: 'Đang làm', color: '#3b82f6', order: 40 },
    [TASK_STATUS.ON_HOLD]: { label: 'Tạm dừng', color: '#7c8aa3', order: 50 },
    [TASK_STATUS.COMPLETED_AWAIT_REVIEW]: { label: 'Chờ nghiệm thu', color: '#8b5cf6', order: 60 },
    [TASK_STATUS.COMPLETED]: { label: 'Hoàn tất', color: '#16a34a', order: 70 },
    [TASK_STATUS.REJECTED]: { label: 'Từ chối', color: '#ef4444', order: 80 },
    [TASK_STATUS.CANCELLED]: { label: 'Hủy', color: '#9ca3af', order: 90 },
};

/** Meta mức độ ưu tiên */
export const PRIORITY_META = {
    [PRIORITY.URGENT]: { label: 'Khẩn cấp', color: '#ef4444', order: 10 },
    [PRIORITY.HIGH]: { label: 'Cao', color: '#f59e0b', order: 20 },
    [PRIORITY.MEDIUM]: { label: 'Bình thường', color: '#3b82f6', order: 30 },
    [PRIORITY.LOW]: { label: 'Thấp', color: '#94a3b8', order: 40 },
};

/** Meta vai trò trong Team */
export const TEAM_ROLE_META = {
    [TEAM_ROLE.MANAGER]: { label: 'Quản lý', color: '#3b82f6', order: 10 },
    [TEAM_ROLE.MEMBER]: { label: 'Thành viên', color: '#64748b', order: 20 },
};

/** Meta vai trò trong Project */
export const PROJECT_ROLE_META = {
    [PROJECT_ROLE.OWNER]: { label: 'Chủ dự án', color: '#0ea5e9', order: 10 },
    [PROJECT_ROLE.MANAGER]: { label: 'Quản lý', color: '#3b82f6', order: 20 },
    [PROJECT_ROLE.MEMBER]: { label: 'Thành viên', color: '#64748b', order: 30 },
    [PROJECT_ROLE.VIEWER]: { label: 'Xem', color: '#94a3b8', order: 40 },
};

const FALLBACK = (val) => ({ label: String(val ?? ''), color: '#94a3b8', order: 999 });

/** Lấy meta trạng thái (fallback an toàn nếu không khớp enum) */
export function getStatusMeta(status) {
    return STATUS_META?.[status] || FALLBACK(status);
}

/** Lấy meta priority (fallback an toàn nếu không khớp enum) */
export function getPriorityMeta(priority) {
    return PRIORITY_META?.[priority] || FALLBACK(priority);
}

/** Lấy meta role team (fallback an toàn nếu không khớp enum) */
export function getTeamRoleMeta(role) {
    return TEAM_ROLE_META?.[role] || FALLBACK(role);
}

/** Lấy meta role project (fallback an toàn nếu không khớp enum) */
export function getProjectRoleMeta(role) {
    return PROJECT_ROLE_META?.[role] || FALLBACK(role);
}

/** Bảng order nhanh cho status/priority (phục vụ sort) */
export const STATUS_ORDER = Object.fromEntries(
    Object.entries(STATUS_META).map(([k, v]) => [k, v.order])
);

export const PRIORITY_ORDER = Object.fromEntries(
    Object.entries(PRIORITY_META).map(([k, v]) => [k, v.order])
);
