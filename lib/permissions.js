/**
 * @file lib/permissions.js
 * @description A collection of pure helper functions for permission checking.
 * These functions operate on populated data shapes and do not perform database calls.
 */

import { PROJECT_ROLE, TEAM_ROLE } from '@/model/common/enums.js';

/**
 * Checks if a user is a member of a given team.
 * @param {object} team - The team object, expected to have a `members` array.
 * @param {string|object} userOrId - The user's ID or user object with role.
 * @returns {boolean} True if the user is a team member or global admin.
 */
export function isTeamMember(team, userOrId) {
    if (typeof userOrId === 'object' && userOrId.role === 'admin') return true;
    
    const uid = getUserId(userOrId);
    if (!team?.members || !uid) return false;
    return team.members.some((m) => String(m.userId) === String(uid));
}

/**
 * Normalize a user reference to an external user id string.
 * Accepts a string id, or an object that may contain `externalUserId` or `_id`.
 */
export function getUserId(ref) {
    if (!ref) return null;
    if (typeof ref === 'string') return String(ref);
    if (typeof ref === 'object') {
        if (ref.externalUserId) return String(ref.externalUserId);
        if (ref.externalId) return String(ref.externalId);
        if (ref._id) return String(ref._id);
    }
    return null;
}

/**
 * Checks if a user is a manager of a given team.
 * @param {object} team - The team object.
 * @param {string|object} userOrId - The user's ID or user object with role.
 * @returns {boolean} True if the user is a team manager or global admin.
 */
export function isTeamManager(team, userOrId) {
    if (typeof userOrId === 'object' && userOrId.role === 'admin') return true;
    
    const uid = getUserId(userOrId);
    if (!team?.members || !uid) return false;
    return team.members.some(
        (m) => String(m.userId) === String(uid) && (String(m.role) === String(TEAM_ROLE.MANAGER) || String(m.role) === String(TEAM_ROLE.OWNER))
    );
}

/**
 * Retrieves the user's role within a specific project.
 * @param {object} project - The project object, expected to have a `members` array.
 * @param {string} uid - The user's ID.
 * @returns {string|null} The user's role (e.g., 'owner', 'manager') or null if not a member.
 */
export function getProjectRole(project, uid) {
    if (!project?.members || !uid) return null;
    const found = project.members.find((m) => String(m.userId) === String(uid));
    return found?.role || null;
}

/**
 * Checks if a user has management permissions for a project.
 * @param {object} project - The project object.
 * @param {string|object} userOrId - The user's ID or user object with role.
 * @returns {boolean} True if the user is an owner, manager, or global admin.
 */
export function canManageProject(project, userOrId) {
    if (typeof userOrId === 'object' && userOrId.role === 'admin') return true;

    const uid = getUserId(userOrId);
    const role = getProjectRole(project, uid);
    return role === PROJECT_ROLE.OWNER || role === PROJECT_ROLE.MANAGER;
}

/**
 * Checks if a user has view permissions for a project.
 * @param {object} project - The project object.
 * @param {string|object} userOrId - The user's ID or user object with role.
 * @returns {boolean} True if the user has any role in the project or is global admin.
 */
export function canViewProject(project, userOrId) {
    if (typeof userOrId === 'object' && userOrId.role === 'admin') return true;

    const uid = getUserId(userOrId);
    return !!getProjectRole(project, uid);
}

/**
 * Checks if a user can edit a specific task.
 * @param {object} task - The task object, potentially populated with project data.
 * @param {string|object} userOrId - The user's ID or user object with role.
 * @returns {boolean} True if the user can edit the task.
 */
export function canEditTask(task, userOrId) {
    if (!task || !userOrId) return false;
    if (typeof userOrId === 'object' && userOrId.role === 'admin') return true;

    const uid = getUserId(userOrId);
    if (task.project && canManageProject(task.project, userOrId)) return true;
    const createdById = getUserId(task.createdBy);
    const assigneeId = getUserId(task.assignee);
    return String(createdById) === String(uid) || String(assigneeId) === String(uid);
}

/**
 * Checks if a user is a collaborator of a task.
 * @param {object} task - The task object.
 * @param {string} uid - The user's ID.
 * @returns {boolean} True if the user is a collaborator, otherwise false.
 */
export function isTaskCollaborator(task, uid) {
    if (!task?.collaborators || !uid) return false;
    return task.collaborators.some(
        (c) => String(c.userId) === String(uid) && c.status === 'accepted'
    );
}

/**
 * Checks if a user can view a specific task.
 * @param {object} task - The task object.
 * @param {string|object} userOrId - The user's ID or user object with role.
 * @returns {boolean} True if the user can view the task.
 */
export function canViewTask(task, userOrId) {
    if (!task || !userOrId) return false;
    if (typeof userOrId === 'object' && userOrId.role === 'admin') return true;

    const uid = getUserId(userOrId);

    // Public đã publish => ai cũng xem được
    if (task.scope === 'public') {
        return !!task.public?.published;
    }

    // Creator, assignee, watchers
    const createdById = getUserId(task.createdBy);
    const assigneeId = getUserId(task.assignee);
    if (createdById === uid) return true;
    if (assigneeId === uid) return true;
    if (Array.isArray(task.watchers) && task.watchers.some(w => getUserId(w) === uid)) return true;

    // Collaborators (đã accept)
    if (isTaskCollaborator(task, uid)) return true;

    if (task.project) {
        return canViewProject(task.project, userOrId);
    }
    return false;
}

/** Có thể gán người làm cho task hay không */
export function canAssignTask(task, userOrId) {
    if (!task || !userOrId) return false;
    if (typeof userOrId === 'object' && userOrId.role === 'admin') return true;

    const uid = getUserId(userOrId);

    if (task.project && canManageProject(task.project, userOrId)) return true;

    // Trường hợp không thuộc project: creator có thể gán
    if (!task.project && getUserId(task.createdBy) === uid) return true;

    return false;
}

/**
 * Check quyền duyệt subtask
 * PM/Owner hoặc parent task assignee có quyền duyệt subtask
 * 
 * @param {object} subtask - Subtask object
 * @param {object} parentTask - Parent task object with project populated
 * @param {string|object} userOrId - User's external ID or user object with role
 * @returns {boolean} True if user can approve subtask
 */
export function canApproveSubtask(subtask, parentTask, userOrId) {
    if (!subtask?.parentTask || !parentTask || !userOrId) return false;
    if (typeof userOrId === 'object' && userOrId.role === 'admin') return true;
    
    const uid = getUserId(userOrId);

    // PM/Owner của project có quyền duyệt MỌI subtask
    if (parentTask.project && canManageProject(parentTask.project, userOrId)) {
        return true;
    }
    
    // Parent task assignee có quyền duyệt subtask
    return String(getUserId(parentTask.assignee)) === String(uid);
}

/**
 * Checks if a user can create a ROOT task in a project.
 * Only Project Managers (owner or manager role) can create root tasks.
 * 
 * @param {object} project - The project object with members array.
 * @param {string|object} userOrId - The user's external ID or user object with role.
 * @returns {boolean} True if user can create root task, otherwise false.
 */
export function canCreateTask(project, userOrId) {
    // Project Manager (owner or manager) có quyền tạo task gốc
    return canManageProject(project, userOrId);
}

/**
 * Checks if a user can create a SUBTASK for a parent task.
 * 
 * Rules:
 * 1. Project Manager can always create subtasks for any task in their project
 * 2. Task creator can create subtasks for their task
 * 3. Task assignee can create subtasks for their assigned task
 * 
 * @param {object} task - The parent task object.
 * @param {object} project - The project object (can be null for public tasks).
 * @param {string|object} userOrId - The user's external ID or user object with role.
 * @returns {boolean} True if user can create subtask, otherwise false.
 */
export function canCreateSubtask(task, project, userOrId) {
    if (!task || !userOrId) return false;
    if (typeof userOrId === 'object' && userOrId.role === 'admin') return true;

    const uid = getUserId(userOrId);

    // 1. Project Manager luôn có quyền tạo subtask cho mọi task trong dự án
    if (project && canManageProject(project, userOrId)) {
        return true;
    }

    // 2. Người tạo task cha có quyền tạo subtask
    const createdById = getUserId(task.createdBy);
    if (createdById && String(createdById) === String(uid)) {
        return true;
    }

    // 3. Người được giao task cha có quyền tạo subtask
    const assigneeId = getUserId(task.assignee);
    if (assigneeId && String(assigneeId) === String(uid)) {
        return true;
    }

    // Mặc định: không có quyền
    return false;
}
