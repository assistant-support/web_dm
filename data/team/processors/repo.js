// data/team/processors/repo.js
// Tác dụng file: Repository cho Team – CRUD + membership trên Mongoose. Không log/revalidate tại đây.

import Team from '@/model/team.model.js';
import { TEAM_ROLE } from '@/model/common/enums.js';
import { createTeamFolder } from '@/lib/drive.js';

/**
 * Lấy team theo id.
 * @param {string} teamId
 * @param {{ lean?: boolean }} [opts]
 */
export async function getById(teamId, { lean = true } = {}) {
    const q = Team.findById(teamId);
    return lean ? q.lean().exec() : q.exec();
}

/**
 * Liệt kê các team mà user tham gia.
 * @param {string} userId
 * @param {{ activeOnly?: boolean }} [opts]
 */
export async function listByUser(userId, { activeOnly = true } = {}) {
    const query = { 'members.userId': userId, ...(activeOnly ? { isActive: true } : {}) };
    return Team.find(query).lean().exec();
}

/**
 * Tạo team mới, creator là manager mặc định.
 * Tạo folder trên Google Drive cho team.
 * @param {{ name:string, description?:string }} data
 * @param {string} creatorUserId
 */
export async function createTeam({ name, description }, creatorUserId) {
    console.log('[repo.createTeam] START');
    console.log('[repo.createTeam] Team name:', name);
    console.log('[repo.createTeam] Creator:', creatorUserId);

    // Tạo folder Drive cho team
    const { id: driveFolderId, name: driveFolderName } = await createTeamFolder(name, '1N1UtEAGaSJ5uzZTD1Ht0EugRwu1M9e-X');
    const doc = await Team.create({
        name,
        description: description || undefined,
        members: [{ userId: creatorUserId, role: TEAM_ROLE.MANAGER }],
        driveFolderId,
        driveFolderName,
        driveParentId: process.env.DRIVE_SHARED_DRIVE_ID || undefined,
    });
    console.log('[repo.createTeam] Team created, _id:', doc._id);

    return doc.toObject();
}

/**
 * Cập nhật tên/mô tả team.
 * @param {string} teamId
 * @param {{ name?:string, description?:string }} patch
 */
export async function updateTeam(teamId, patch) {
    const doc = await Team.findById(teamId);
    if (!doc) return null;
    if (patch.name !== undefined) doc.name = patch.name;
    if (patch.description !== undefined) doc.description = patch.description || undefined;
    // BỎ QUA isActive tại đây (archiveTeam xử lý)
    await doc.save();
    return doc.toObject();
}

/**
 * Lưu trữ (archive) team – đặt isActive=false.
 * @param {string} teamId
 */
export async function archiveTeam(teamId) {
    const doc = await Team.findById(teamId);
    if (!doc) return null;
    doc.isActive = false;
    await doc.save();
    return doc.toObject();
}

/**
 * Thêm thành viên (idempotent: nếu tồn tại -> cập nhật role).
 * @param {string} teamId
 * @param {{ userId:string, role: string }} param1
 */
export async function addMember(teamId, { userId, role }) {
    const doc = await Team.findById(teamId);
    if (!doc) return null;

    const idx = (doc.members || []).findIndex((m) => String(m.userId) === String(userId));
    if (idx >= 0) {
        // cập nhật role nếu khác
        if (doc.members[idx].role !== role) {
            doc.members[idx].role = role;
        }
    } else {
        doc.members.push({ userId, role });
    }

    await doc.save();
    return doc.toObject();
}

/**
 * Bỏ thành viên khỏi team.
 * - Không được xoá nếu là manager cuối cùng.
 * @param {string} teamId
 * @param {string} userId
 */
export async function removeMember(teamId, userId) {
    const doc = await Team.findById(teamId);
    if (!doc) return null;

    const members = doc.members || [];
    const target = members.find((m) => String(m.userId) === String(userId));
    if (!target) {
        // idempotent: không có thì xem như xong
        return doc.toObject();
    }

    if (target.role === TEAM_ROLE.MANAGER) {
        const managerCount = members.filter((m) => m.role === TEAM_ROLE.MANAGER).length;
        if (managerCount <= 1) {
            // vi phạm ràng buộc
            throw new Error('LAST_MANAGER');
        }
    }

    doc.members = members.filter((m) => String(m.userId) !== String(userId));
    await doc.save();
    return doc.toObject();
}

/**
 * Đổi role thành viên.
 * - Nếu từ MANAGER -> MEMBER: phải còn ít nhất 1 manager khác.
 * @param {string} teamId
 * @param {string} userId
 * @param {string} role
 */
export async function changeMemberRole(teamId, userId, role) {
    const doc = await Team.findById(teamId);
    if (!doc) return null;

    const members = doc.members || [];
    const target = members.find((m) => String(m.userId) === String(userId));
    if (!target) {
        throw new Error('MEMBER_NOT_FOUND');
    }

    if (target.role === TEAM_ROLE.MANAGER && role !== TEAM_ROLE.MANAGER) {
        const managerCount = members.filter((m) => m.role === TEAM_ROLE.MANAGER).length;
        if (managerCount <= 1) {
            throw new Error('LAST_MANAGER');
        }
    }

    target.role = role;
    await doc.save();
    return doc.toObject();
}
