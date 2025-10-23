// cấu trúc thư mục hiện tại: /lib/permissions.js
// Tác dụng file: Bộ helper kiểm tra quyền (pure function, không gọi DB).
// - Dựa trên shapes từ Team/Project/Task đã populate tối thiểu.

import { PROJECT_ROLE, TEAM_ROLE } from '@/model/common/enums.js';

/** Kiểm tra user có là thành viên team */
export function isTeamMember(team, uid) {
    if (!team || !uid) return false;
    const members = team.members || [];
    return members.some((m) => String(m.userId) === String(uid));
}

/** Kiểm tra user có là manager team */
export function isTeamManager(team, uid) {
    if (!team || !uid) return false;
    const members = team.members || [];
    return members.some(
        (m) => String(m.userId) === String(uid) && String(m.role) === String(TEAM_ROLE.MANAGER)
    );
}

/** Lấy role của user trong project (owner/manager/member/viewer|null) */
export function getProjectRole(project, uid) {
    if (!project || !uid) return null;
    const members = project.members || [];
    const found = members.find((m) => String(m.userId) === String(uid));
    return found ? found.role || null : null;
}

/** Được quản trị project hay không */
export function canManageProject(project, uid) {
    const role = getProjectRole(project, uid);
    return role === PROJECT_ROLE.OWNER || role === PROJECT_ROLE.MANAGER;
}

/** Có thể xem project hay không (có role là được) */
export function canViewProject(project, uid) {
    const role = getProjectRole(project, uid);
    return !!role;
}

/**
 * Check if user is collaborator of task (và đã accept)
 */
export function isTaskCollaborator(task, uid) {
    if (!task?.collaborators || !uid) return false;
    return task.collaborators.some(c => 
        String(c.userId) === String(uid) && c.acceptedAt
    );
}

/** Có thể xem task hay không */
export function canViewTask(task, uid) {
    if (!task || !uid) return false;

    // Public đã publish => ai cũng xem được
    if (task.scope === 'public') {
        return !!task.public?.published;
    }

    // Creator, assignee, watchers
    if (task.createdBy === uid) return true;
    if (task.assignee === uid) return true;
    if (Array.isArray(task.watchers) && task.watchers.includes(uid)) return true;

    // Collaborators (đã accept)
    if (isTaskCollaborator(task, uid)) return true;

    if (task.project) {
        return canViewProject(task.project, uid);
    }
    return false;
}

/** Có thể chỉnh sửa task hay không */
export function canEditTask(task, uid) {
    if (!task || !uid) return false;

    // Chủ/quản lý dự án
    if (task.project && canManageProject(task.project, uid)) return true;

    // Người tạo/assignee có thể chỉnh sửa một số trường
    if (task.createdBy === uid) return true;
    if (task.assignee === uid) return true;

    return false;
}

/** Có thể gán người làm cho task hay không */
export function canAssignTask(task, uid) {
    if (!task || !uid) return false;

    if (task.project && canManageProject(task.project, uid)) return true;

    // Trường hợp không thuộc project: creator có thể gán
    if (!task.project && task.createdBy === uid) return true;

    return false;
}

/**
 * Check quyền duyệt subtask
 * Chỉ parent task assignee mới duyệt được
 */
export function canApproveSubtask(subtask, parentTask, uid) {
    if (!subtask?.parentTask || !parentTask || !uid) return false;
    return String(parentTask.assignee) === String(uid);
}
