// data/project/actions/server.js
// Actions CRUD chính cho Project
// Tối ưu: Sử dụng repo functions đã cache

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { isTeamManager, canManageProject } from '@/lib/permissions.js';
import { logActivity } from '@/lib/activity.js';
import * as tags from '@/data/_shared/tags.js';
import { 
    notifyProjectMemberAdded,
    notifyProjectMemberRemoved,
    notifyProjectMemberRoleUpdated
} from '@/lib/noti-helpers.js';

// Tối ưu: Import repo của Team và Project
import { getById as getTeamById } from '@/data/team/processors/repo.js';
import {
    listByTeam, getDetail, createProject, updateProject, archiveProject,
    addMember, removeMember, changeMemberRole
} from '@/data/project/processors/repo.js'; // Các hàm project repo

import { PROJECT_ROLE } from '@/model/common/enums.js'; // Cần cho delete
import Project from '@/model/project.model.js'; // Cần cho populate thủ công nếu repo ko populate đủ
import Team from '@/model/team.model.js'; // Import Team model

import {
    validate, validateAsync, projectIdSchema, teamIdSchema,
    projectCreateSchema, projectUpdateSchema,
    memberAddSchema, memberRemoveSchema, memberChangeRoleSchema
} from '@/data/project/processors/validators.js';

import { asPlainProject } from '@/lib/serialize.js';

/** Liệt kê project theo team (yêu cầu user là thành viên team). */
export async function listByTeamAction(teamId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(teamIdSchema, teamId);

        // Tối ưu: Dùng hàm repo team đã cache
        const team = await getTeamById(id, { lean: true });
        assert(team, 'TEAM_NOT_FOUND', 'NOT_FOUND', 404);
        
        const isMember = (team.members || []).some((m) => String(m.userId) === String(user.externalUserId));
        const isAdmin = user.role === 'admin';
        assert(isMember || isAdmin, 'FORBIDDEN', 'FORBIDDEN', 403);

        // Gọi hàm repo project
        const rows = await listByTeam(id); // Hàm này đã populate team và lean
        return rows.map(asPlainProject); // Dùng asPlainProject để serialize

    }, { requireAuth: true });
}

/** Lấy chi tiết project. */
export async function getDetailAction(projectId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(projectIdSchema, projectId);
        // Tối ưu: Dùng hàm repo project đã cache (đã populate team)
        const proj = await getDetail(id, { lean: true });
        assert(proj, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        // Quyền xem tối thiểu: là thành viên project
        const isMember = (proj.members || []).some((m) => String(m.userId) === String(user.externalUserId));
        const isAdmin = user.role === 'admin';
        assert(isMember || isAdmin, 'FORBIDDEN', 'FORBIDDEN', 403);

        return asPlainProject(proj); // Dùng asPlainProject để serialize
    }, { requireAuth: true });
}

/** Tạo project (chỉ team manager có quyền). */
export async function create(payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const data = validate(projectCreateSchema, payload);
        // PERMISSION CHECK:
        // - Nếu payload có `team` thì người tạo cần là quản lý/owner của team (isTeamManager)
        // - Nếu không có `team` (project độc lập) thì chỉ global admin mới được tạo
        if (data.team) {
            const team = await getTeamById(data.team, { lean: true }); // Tối ưu: Dùng repo team
            assert(team, 'Team không tồn tại', 'NOT_FOUND', 404);

            const allowed = isTeamManager(team, user);
            assert(allowed, 'Chỉ quản lý hoặc người tạo nhóm mới được tạo dự án cho team này', 'FORBIDDEN', 403);
        } else {
            assert(user && user.role === 'admin', 'Chỉ admin mới được tạo dự án độc lập', 'FORBIDDEN', 403);
        }
        const doc = await createProject(data, user.externalUserId);

        await logActivity({
            actor: user.externalUserId, team: data.team || undefined, project: doc._id,
            type: 'project.created', payload: { name: doc.name, isIndependent: !data.team }
        });
        const tagsToRevalidate = data.team ? [tags.team(data.team), tags.project(doc._id)] : [tags.project(doc._id)];
        await revalidateMany(tagsToRevalidate);

        return asPlainProject(doc);
    }, { requireAuth: true });
}

/** Cập nhật project */
export async function update(projectId, patch) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(projectIdSchema, projectId);
        const data = validate(projectUpdateSchema, patch);

        // Tối ưu: Dùng hàm repo project đã cache (lấy lean false vì repo update cần Mongoose doc)
        const raw = await getDetail(id, { lean: false });
        assert(raw, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        assert(canManageProject(raw, user), 'FORBIDDEN', 'FORBIDDEN', 403);

        const updated = await updateProject(id, data); // Repo trả về doc đã populate team

        // Kiểm tra nếu updateProject trả về null (ví dụ bị xóa đồng thời)
        assert(updated, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        await logActivity({ actor: user.externalUserId, project: id, team: updated.team?._id, type: 'project.updated', payload: data });
        await revalidateMany([tags.team(updated.team?._id), tags.project(id)]);

        return asPlainProject(updated);
    }, { requireAuth: true });
}

/** Archive project */
export async function archive(projectId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(projectIdSchema, projectId);
        // Tối ưu: Dùng hàm repo project đã cache (lấy lean false)
        const raw = await getDetail(id, { lean: false });
        assert(raw, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        assert(canManageProject(raw, user), 'FORBIDDEN', 'FORBIDDEN', 403);

        const updated = await archiveProject(id); // Repo trả về doc đã populate team
        await logActivity({ actor: user.externalUserId, project: id, team: updated.team?._id, type: 'project.archived' });
        await revalidateMany([tags.team(updated.team?._id), tags.project(id)]);

        return asPlainProject(updated);
    }, { requireAuth: true });
}

/** Thêm member */
export async function addMemberAction(projectId, payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(projectIdSchema, projectId);
        const data = await validateAsync(memberAddSchema, payload);

        // Tối ưu: Dùng hàm repo project đã cache (lấy lean false)
        const raw = await getDetail(id, { lean: false });
        assert(raw, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        assert(canManageProject(raw, user), 'FORBIDDEN', 'FORBIDDEN', 403);

        // **CHO PHÉP THÊM NGƯỜI NGOÀI TEAM** - Chỉ log warning
        let isOutsider = false;
        if (raw.team) {
            const team = await Team.findById(raw.team).lean();
            if (team) {
                const userInTeam = (team.members || []).some((m) => String(m.userId) === String(data.userId));
                if (!userInTeam) {
                    isOutsider = true;
                    console.warn(`[PROJECT] Adding outsider ${data.userId} to project ${id} (team: ${raw.team})`);
                }
            }
        }

        const updated = await addMember(id, data); // Repo trả về doc đã populate team

        await logActivity({
            actor: user.externalUserId,
            project: id,
            team: updated.team?._id,
            type: isOutsider ? 'project.member.added.outsider' : 'project.member.added',
            payload: { ...data, isOutsider }
        });

        // --- Send Zalo Notification for Project Member Added ---
        notifyProjectMemberAdded(
            updated.name || 'dự án',
            String(data.userId)
        ).catch(err => {
            console.error(`[addMemberAction] Failed to send Zalo notification to user ${data.userId}:`, err);
        });
        // -------------------------------------------------------

        await revalidateMany([tags.team(updated.team?._id), tags.project(id), tags.userInbox(data.userId)]);

        return asPlainProject(updated);
    }, { requireAuth: true });
}

/** Xoá member */
export async function removeMemberAction(projectId, payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(projectIdSchema, projectId);
        const data = validate(memberRemoveSchema, payload);

        // Tối ưu: Dùng hàm repo project đã cache (lấy lean false)
        const raw = await getDetail(id, { lean: false });
        assert(raw, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        assert(canManageProject(raw, user), 'FORBIDDEN', 'FORBIDDEN', 403);

        const updated = await removeMember(id, data.userId); // Repo trả về doc đã populate team
        await logActivity({ actor: user.externalUserId, project: id, team: updated.team?._id, type: 'project.member.removed', payload: { userId: data.userId } });
        
        // [NEW] Notify
        const managers = (raw.members || [])
            .filter(m => m.role === PROJECT_ROLE.OWNER || m.role === PROJECT_ROLE.MANAGER)
            .map(m => m.userId);

        notifyProjectMemberRemoved(
            updated.name || 'dự án',
            String(data.userId),
            managers,
            String(id)
        ).catch(err => {
            console.error(`[removeMemberAction] Failed to send notification:`, err);
        });

        await revalidateMany([tags.team(updated.team?._id), tags.project(id), tags.userInbox(data.userId)]);

        return asPlainProject(updated);
    }, { requireAuth: true });
}

/** Đổi role member */
export async function changeRole(projectId, payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(projectIdSchema, projectId);
        const data = validate(memberChangeRoleSchema, payload);

        // Tối ưu: Dùng hàm repo project đã cache (lấy lean false)
        const raw = await getDetail(id, { lean: false });
        assert(raw, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        assert(canManageProject(raw, user), 'FORBIDDEN', 'FORBIDDEN', 403);

        const updated = await changeMemberRole(id, data.userId, data.role); // Repo trả về doc đã populate team
        await logActivity({ actor: user.externalUserId, project: id, team: updated.team?._id, type: 'project.member.role_changed', payload: { ...data } });
        
        // [NEW] Notify
        const managers = (raw.members || [])
            .filter(m => m.role === PROJECT_ROLE.OWNER || m.role === PROJECT_ROLE.MANAGER)
            .map(m => m.userId);

        notifyProjectMemberRoleUpdated(
            updated.name || 'dự án',
            String(data.userId),
            data.role,
            managers,
            String(id)
        ).catch(err => {
            console.error(`[changeRole] Failed to send notification:`, err);
        });

        await revalidateMany([tags.team(updated.team?._id), tags.project(id), tags.userInbox(data.userId)]);

        return asPlainProject(updated);
    }, { requireAuth: true });
}

/** Update project - wrapper */
export async function updateProjectAction(projectId, updates) {
    return await update(projectId, updates);
}

/** Delete project (soft delete) */
export async function deleteProjectAction(projectId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(projectIdSchema, projectId);
        // Tối ưu: Dùng hàm repo project đã cache (lấy lean false)
        const raw = await getDetail(id, { lean: false });
        assert(raw, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        // Chỉ owner mới có quyền xóa
        const isOwner = (raw.members || []).some(m => String(m.userId) === String(user.externalUserId) && m.role === PROJECT_ROLE.OWNER);
        
        // Allow global admin to delete project
        const isAdmin = user.role === 'admin';
        
        assert(isOwner || isAdmin, 'FORBIDDEN', 'FORBIDDEN', 403);

        const updated = await archiveProject(id);

        await logActivity({
            actor: user.externalUserId, project: id, team: updated.team?._id,
            type: 'project.deleted' // Log là deleted dù chỉ là archive/deactivate
        });

        await revalidateMany([tags.team(updated.team?._id), tags.project(id)]);
        return asPlainProject(updated);
    }, { requireAuth: true });
}