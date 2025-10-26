// cấu trúc thư mục hiện tại: /model/common/enums.js
// Tác dụng file: Tập trung các hằng số dùng xuyên suốt dự án (role, status, priority, ...).

export const TEAM_ROLE = Object.freeze({ MANAGER: 'manager', MEMBER: 'member' });
export const PROJECT_ROLE = Object.freeze({ OWNER: 'owner', MANAGER: 'manager', MEMBER: 'member', VIEWER: 'viewer' });

export const TASK_STATUS = Object.freeze({
    DRAFT: 'draft',
    PENDING_APPROVAL: 'pending_approval',
    WAITING_ASSIGNEE_CONFIRM: 'waiting_confirm',
    IN_PROGRESS: 'in_progress',
    ON_HOLD: 'on_hold',
    COMPLETED_AWAIT_REVIEW: 'completed_await_review',
    COMPLETED: 'completed',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
});

export const PRIORITY = Object.freeze({ URGENT: 'urgent', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' });
export const APPROVAL_STATUS = Object.freeze({ NONE: 'none', PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' });
export const STORAGE_PROVIDER = Object.freeze({ DRIVE: 'google_drive' });
export const FILE_KIND = Object.freeze({ IMAGE: 'image', VIDEO: 'video', DOC: 'doc', OTHER: 'other' });

// === NEW ===
export const TASK_SCOPE = Object.freeze({
    PROJECT: 'project', // task nội bộ dự án
    PUBLIC: 'public',   // task trên bảng công khai (không thuộc project/team)
});

export const CLAIM_MODE = Object.freeze({
    AUTO: 'auto',     // ai claim trước thì vào làm ngay
    REVIEW: 'review', // quản lý chọn người làm
});

export const CLAIM_STATUS = Object.freeze({
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn',
});
