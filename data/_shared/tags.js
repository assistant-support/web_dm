// data/_shared/tags.js
// Tác dụng file: Chuẩn hoá tên tag (string) để dùng với revalidateTag() ở server actions.

const s = (v) => String(v ?? '').trim();

/**
 * Tag theo Team.
 * @param {string|number} id
 * @returns {string}
 */
export function team(id) {
    const x = s(id);
    return x ? `team:${x}` : '';
}

/**
 * Tag theo Project.
 * @param {string|number} id
 * @returns {string}
 */
export function project(id) {
    const x = s(id);
    return x ? `project:${x}` : '';
}

/**
 * Tag theo Task.
 * @param {string|number} id
 * @returns {string}
 */
export function task(id) {
    const x = s(id);
    return x ? `task:${x}` : '';
}

/**
 * Tag danh sách Public Tasks.
 * @returns {string}
 */
export function publicTasks() {
    return 'public:tasks';
}

/**
 * Tag inbox cá nhân người dùng.
 * @param {string|number} uid
 * @returns {string}
 */
export function userInbox(uid) {
    const x = s(uid);
    return x ? `inbox:${x}` : '';
}

/**
 * Tag bảng xếp hạng (leaderboard) theo phạm vi & tháng (YYYY-MM).
 * @param {'team'|'project'|'global'} scope
 * @param {string} ym - 'YYYY-MM'
 * @returns {string}
 */
export function leaderboard(scope, ym) {
    const a = s(scope);
    const b = s(ym);
    return a && b ? `leaderboard:${a}:${b}` : '';
}

/**
 * Gom nhóm tag liên quan tới task để revalidate đồng loạt.
 * @param {{ taskId?: string|number, projectId?: string|number, teamId?: string|number }} [ids]
 * @returns {string[]} mảng tag unique, loại bỏ falsy
 */
export function taskBundle({ taskId, projectId, teamId } = {}) {
    const arr = [task(taskId), project(projectId), team(teamId)];
    return Array.from(new Set(arr.filter(Boolean)));
}

/**
 * Gom nhóm tag liên quan tới project để revalidate đồng loạt.
 * @param {{ projectId?: string|number, teamId?: string|number }} [ids]
 * @returns {string[]} mảng tag unique, loại bỏ falsy
 */
export function projectBundle({ projectId, teamId } = {}) {
    const arr = [project(projectId), team(teamId)];
    return Array.from(new Set(arr.filter(Boolean)));
}
