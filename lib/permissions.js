/**
 * @file lib/permissions.js
 * @description A collection of pure helper functions for permission checking.
 * These functions operate on populated data shapes and do not perform database calls.
 */

import { PROJECT_ROLE, TEAM_ROLE } from '@/model/common/enums.js';

/**
 * Checks if a user is a member of a given team.
 * @param {object} team - The team object, expected to have a `members` array.
 * @param {string} uid - The user's ID.
 * @returns {boolean} True if the user is a team member, otherwise false.
 */
export function isTeamMember(team, uid) {
    if (!team?.members || !uid) return false;
    return team.members.some((m) => String(m.userId) === String(uid));
}

/**
 * Checks if a user is a manager of a given team.
 * @param {object} team - The team object.
 * @param {string} uid - The user's ID.
 * @returns {boolean} True if the user is a team manager, otherwise false.
 */
export function isTeamManager(team, uid) {
    if (!team?.members || !uid) return false;
    return team.members.some(
        (m) => String(m.userId) === String(uid) && String(m.role) === String(TEAM_ROLE.MANAGER)
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
 * @param {string} uid - The user's ID.
 * @returns {boolean} True if the user is an owner or manager, otherwise false.
 */
export function canManageProject(project, uid) {
    const role = getProjectRole(project, uid);
    return role === PROJECT_ROLE.OWNER || role === PROJECT_ROLE.MANAGER;
}

/**
 * Checks if a user has view permissions for a project.
 * @param {object} project - The project object.
 * @param {string} uid - The user's ID.
 * @returns {boolean} True if the user has any role in the project, otherwise false.
 */
export function canViewProject(project, uid) {
    return !!getProjectRole(project, uid);
}

/**
 * Checks if a user can edit a specific task.
 * @param {object} task - The task object, potentially populated with project data.
 * @param {string} uid - The user's ID.
 * @returns {boolean} True if the user can edit the task.
 */
export function canEditTask(task, uid) {
    if (!task || !uid) return false;
    if (task.project && canManageProject(task.project, uid)) return true;
    return String(task.createdBy) === String(uid) || String(task.assignee) === String(uid);
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
 * @param {string} uid - The user's ID.
 * @returns {boolean} True if the user can view the task.
 */
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
