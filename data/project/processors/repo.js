// data/project/processors/repo.js
// Tác dụng file: Repository thao tác Mongoose + tạo thư mục Drive khi tạo Project.
// Tối ưu: Đã cập nhật logic Drive và bọc getDetail bằng React.cache.

import { cache } from 'react'; // Import cache
import mongoose from 'mongoose';
import Project from '@/model/project.model.js';
import Team from '@/model/team.model.js';
import { PROJECT_ROLE } from '@/model/common/enums.js';
// Giả định bạn có hàm tạo folder theo năm/tháng
import { createProjectMonthlyFolders, createProjectFolder } from '@/lib/drive.js';
import { AppError } from '@/lib/errors.js';

function hasAnyManagerLike(members = []) {
    return (members || []).some((m) => m.role === PROJECT_ROLE.OWNER || m.role === PROJECT_ROLE.MANAGER);
}

/**
 * Liệt kê project theo team.
 */
export async function listByTeam(teamId, { activeOnly = true } = {}) {
    const query = { team: teamId, ...(activeOnly ? { isActive: true } : {}) };
    return Project.find(query).populate('team', 'name').lean().exec(); // Thêm populate team
}

/**
 * Lấy chi tiết project (hàm gốc, không cache).
 */
const _getDetail = async (projectId, { lean = true } = {}) => {
    const q = Project.findById(projectId).populate('team', 'name'); // Thêm populate team
    return lean ? q.lean().exec() : q.exec();
}

/**
 * Lấy chi tiết project (đã cache).
 */
export const getDetail = cache(_getDetail);


/**
 * Tạo Project mới + 12 thư mục Drive hàng tháng cho năm hiện tại.
 */
export async function createProject(payload, creatorUserId) {
    console.log('[repo.createProject] START');

    let teamDriveFolderId = '1_guao-kh5cGjvcvLYiZVioujTkqJveEG'
    const projectParentFolderId = teamDriveFolderId
    const { id: projectRootFolderId } = await createProjectFolder(
        payload.name,
        projectParentFolderId
    );
    const currentYear = new Date().getFullYear();
    const monthlyFoldersData = await createProjectMonthlyFolders(projectRootFolderId, currentYear);
    console.log(`[repo.createProject] Created ${monthlyFoldersData.length} monthly folders for ${currentYear}`);


    const docData = {
        team: payload.team,
        name: payload.name,
        code: payload.code || undefined,
        description: payload.description || undefined,
        priority: payload.priority || undefined,
        startDate: payload.startDate || undefined,
        dueDate: payload.dueDate || undefined,

        // Lưu mảng folder tháng
        monthlyDriveFolders: monthlyFoldersData, // [{ year, month, folderId, folderName }]

        members: [{ userId: creatorUserId, role: PROJECT_ROLE.OWNER }],
        platforms: payload.platforms || [],
        workTypes: payload.workTypes || [],
        tags: payload.tags || [],
    };

    const doc = await Project.create(docData);
    console.log('[repo.createProject] Project created, _id:', doc._id);

    // Populate team name để trả về
    const finalDoc = await getDetail(doc._id, { lean: true }); // Dùng hàm cached để lấy lại
    return finalDoc || doc.toObject(); // Fallback nếu getDetail lỗi
}

/**
 * Cập nhật Project (bỏ qua isActive).
 */
export async function updateProject(projectId, patch) {
    const doc = await Project.findById(projectId);
    if (!doc) return null;

    // ... (các trường update khác giữ nguyên) ...
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
    // Populate team name để trả về
    const finalDoc = await getDetail(doc._id, { lean: true }); // Dùng hàm cached để lấy lại
    return finalDoc || doc.toObject();
}

/**
 * Archive Project (isActive = false).
 */
export async function archiveProject(projectId) {
    const doc = await Project.findById(projectId);
    if (!doc) return null;
    doc.isActive = false;
    await doc.save();
    const finalDoc = await getDetail(doc._id, { lean: true });
    return finalDoc || doc.toObject();
}

/**
 * Thêm thành viên (idempotent).
 */
export async function addMember(projectId, { userId, role }) {
    const doc = await Project.findById(projectId);
    if (!doc) return null;

    const members = doc.members || [];
    const idx = members.findIndex((m) => String(m.userId) === String(userId));
    if (idx >= 0) {
        // Cập nhật role nếu đã tồn tại
        if (doc.members[idx].role !== role) {
            doc.members[idx].role = role;
        }
    } else {
        doc.members.push({ userId, role });
    }

    await doc.save();
    const finalDoc = await getDetail(doc._id, { lean: true });
    return finalDoc || doc.toObject();
}

/**
 * Bỏ thành viên – không được làm mất quản trị cuối cùng.
 */
export async function removeMember(projectId, userId) {
    const doc = await Project.findById(projectId);
    if (!doc) return null;

    const members = doc.members || [];
    const target = members.find((m) => String(m.userId) === String(userId));
    if (!target) return doc.toObject(); // idempotent

    const isAdminRole = target.role === PROJECT_ROLE.OWNER || target.role === PROJECT_ROLE.MANAGER;
    if (isAdminRole) {
        const remaining = members.filter((m) => String(m.userId) !== String(userId));
        if (!hasAnyManagerLike(remaining)) {
            throw new AppError('LAST_MANAGER', 'LAST_MANAGER', 400);
        }
    }

    doc.members = members.filter((m) => String(m.userId) !== String(userId));
    await doc.save();
    const finalDoc = await getDetail(doc._id, { lean: true });
    return finalDoc || doc.toObject();
}

/**
 * Đổi role thành viên – không làm mất quản trị cuối cùng.
 */
export async function changeMemberRole(projectId, userId, role) {
    const doc = await Project.findById(projectId);
    if (!doc) return null;

    const members = doc.members || [];
    const targetIndex = members.findIndex((m) => String(m.userId) === String(userId));
    if (targetIndex < 0) {
        throw new AppError('MEMBER_NOT_FOUND', 'MEMBER_NOT_FOUND', 404);
    }
    const target = members[targetIndex];

    const wasAdmin = target.role === PROJECT_ROLE.OWNER || target.role === PROJECT_ROLE.MANAGER;
    const willBeAdmin = role === PROJECT_ROLE.OWNER || role === PROJECT_ROLE.MANAGER;

    if (wasAdmin && !willBeAdmin) {
        const adminsOtherThanTarget = members.filter((m, index) =>
            index !== targetIndex && (m.role === PROJECT_ROLE.OWNER || m.role === PROJECT_ROLE.MANAGER)
        );
        if (adminsOtherThanTarget.length === 0) {
            throw new AppError('LAST_MANAGER', 'LAST_MANAGER', 400);
        }
    }

    // Cập nhật role trực tiếp trong mảng
    doc.members[targetIndex].role = role;
    // Đánh dấu mảng members đã thay đổi để Mongoose biết cần lưu
    doc.markModified('members');

    await doc.save();
    const finalDoc = await getDetail(doc._id, { lean: true });
    return finalDoc || doc.toObject();
}