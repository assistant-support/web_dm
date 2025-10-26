// data/project/processors/repo.js
// Tác dụng file: Repository thao tác Mongoose + tạo thư mục Drive khi tạo Project. Không kiểm tra quyền ở đây.

import Project from '@/model/project.model.js';
import Team from '@/model/team.model.js'; // (dự phòng cho các kiểm tra nâng cao)
import { PROJECT_ROLE } from '@/model/common/enums.js';
import { createProjectFolder } from '@/lib/drive.js';
import { AppError } from '@/lib/errors.js';

/** Kiểm tra danh sách members còn ít nhất 1 quản trị (OWNER hoặc MANAGER) */
function hasAnyManagerLike(members = []) {
    return (members || []).some((m) => m.role === PROJECT_ROLE.OWNER || m.role === PROJECT_ROLE.MANAGER);
}

/**
 * Liệt kê project theo team.
 * @param {string} teamId
 * @param {{ activeOnly?: boolean }} [opts]
 */
export async function listByTeam(teamId, { activeOnly = true } = {}) {
    const query = { team: teamId, ...(activeOnly ? { isActive: true } : {}) };
    return Project.find(query).lean().exec();
}

/**
 * Lấy chi tiết project.
 * @param {string} projectId
 * @param {{ lean?: boolean }} [opts]
 */
export async function getDetail(projectId, { lean = true } = {}) {
    const q = Project.findById(projectId);
    return lean ? q.lean().exec() : q.exec();
}

/**
 * Tạo Project mới + thư mục Drive tương ứng.
 * Nếu project thuộc team, folder sẽ được tạo trong folder của team.
 * @param {object} payload - theo projectCreateSchema
 * @param {string} creatorUserId - externalUserId của người tạo (sẽ là OWNER)
 */
export async function createProject(payload, creatorUserId) {
    console.log('[repo.createProject] START');
    console.log('[repo.createProject] Payload:', payload);
    console.log('[repo.createProject] CreatorUserId:', creatorUserId);

    // Xác định parent folder: Ưu tiên dùng folder của team
    let parentFolderId = '1_guao-kh5cGjvcvLYiZVioujTkqJveEG';
    const { id: driveFolderId, name: driveFolderName } = await createProjectFolder(
        payload.name,
        parentFolderId
    );
    console.log('[repo.createProject] Drive folder created:', driveFolderId, 'in parent:', parentFolderId);

    const docData = {
        team: payload.team,
        name: payload.name,
        code: payload.code || undefined,
        description: payload.description || undefined,
        priority: payload.priority || undefined,
        startDate: payload.startDate || undefined,
        dueDate: payload.dueDate || undefined,

        driveFolderId,
        driveFolderName,
        driveParentId: parentFolderId || undefined,

        members: [{ userId: creatorUserId, role: PROJECT_ROLE.OWNER }],

        platforms: payload.platforms || [],
        workTypes: payload.workTypes || [],
        tags: payload.tags || [],
    };

    console.log('[repo.createProject] Creating project with data:', JSON.stringify(docData, null, 2));
    const doc = await Project.create(docData);
    console.log('[repo.createProject] Project created, _id:', doc._id);
    console.log('[repo.createProject] Members:', doc.members);

    return doc.toObject();
}

/**
 * Cập nhật Project (bỏ qua isActive).
 * @param {string} projectId
 * @param {object} patch - theo projectUpdateSchema (trừ isActive)
 */
export async function updateProject(projectId, patch) {
    const doc = await Project.findById(projectId);
    if (!doc) return null;

    if (patch.name !== undefined) doc.name = patch.name;
    if (patch.code !== undefined) doc.code = patch.code || undefined;
    if (patch.description !== undefined) doc.description = patch.description || undefined;
    if (patch.priority !== undefined) doc.priority = patch.priority;

    if ('startDate' in patch) doc.startDate = patch.startDate ?? null;
    if ('dueDate' in patch) doc.dueDate = patch.dueDate ?? null;

    if (patch.tags !== undefined) doc.tags = patch.tags || [];
    if (patch.statuses !== undefined) doc.statuses = patch.statuses || [];
    if (patch.platforms !== undefined) doc.platforms = patch.platforms || [];
    if (patch.workTypes !== undefined) doc.workTypes = patch.workTypes || [];

    await doc.save();
    return doc.toObject();
}

/**
 * Archive Project (isActive = false).
 * @param {string} projectId
 */
export async function archiveProject(projectId) {
    const doc = await Project.findById(projectId);
    if (!doc) return null;
    doc.isActive = false;
    await doc.save();
    return doc.toObject();
}

/**
 * Thêm thành viên (idempotent: có rồi thì cập nhật role).
 * @param {string} projectId
 * @param {{ userId:string, role:string }} param1
 */
export async function addMember(projectId, { userId, role }) {
    const doc = await Project.findById(projectId);
    if (!doc) return null;

    const members = doc.members || [];
    const idx = members.findIndex((m) => String(m.userId) === String(userId));
    if (idx >= 0) {
        doc.members[idx].role = role;
    } else {
        doc.members.push({ userId, role });
    }

    await doc.save();
    return doc.toObject();
}

/**
 * Bỏ thành viên – không được làm mất quản trị cuối cùng.
 * @param {string} projectId
 * @param {string} userId
 */
export async function removeMember(projectId, userId) {
    const doc = await Project.findById(projectId);
    if (!doc) return null;

    const members = doc.members || [];
    const target = members.find((m) => String(m.userId) === String(userId));
    if (!target) {
        // idempotent
        return doc.toObject();
    }

    // Nếu target là quản trị, kiểm tra sau khi bỏ còn ai quản trị không
    const isAdminRole = target.role === PROJECT_ROLE.OWNER || target.role === PROJECT_ROLE.MANAGER;
    if (isAdminRole) {
        const remaining = members.filter((m) => String(m.userId) !== String(userId));
        if (!hasAnyManagerLike(remaining)) {
            throw new AppError('LAST_MANAGER', 'LAST_MANAGER', 400);
        }
    }

    doc.members = members.filter((m) => String(m.userId) !== String(userId));
    await doc.save();
    return doc.toObject();
}

/**
 * Đổi role thành viên – không làm mất quản trị cuối cùng.
 * @param {string} projectId
 * @param {string} userId
 * @param {string} role
 */
export async function changeMemberRole(projectId, userId, role) {
    const doc = await Project.findById(projectId);
    if (!doc) return null;

    const members = doc.members || [];
    const target = members.find((m) => String(m.userId) === String(userId));
    if (!target) {
        throw new AppError('MEMBER_NOT_FOUND', 'MEMBER_NOT_FOUND', 404);
    }

    const wasAdmin = target.role === PROJECT_ROLE.OWNER || target.role === PROJECT_ROLE.MANAGER;
    const willBeAdmin = role === PROJECT_ROLE.OWNER || role === PROJECT_ROLE.MANAGER;

    if (wasAdmin && !willBeAdmin) {
        // đổi từ admin -> non-admin => kiểm tra còn admin khác không
        const adminsOther = members.filter((m) => String(m.userId) !== String(userId));
        if (!hasAnyManagerLike(adminsOther)) {
            throw new AppError('LAST_MANAGER', 'LAST_MANAGER', 400);
        }
    }

    target.role = role;
    await doc.save();
    return doc.toObject();
}
