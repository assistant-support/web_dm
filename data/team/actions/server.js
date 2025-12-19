// data/team/actions/server.js
// Tác dụng file: Server actions Team — CRUD + membership; enforce quyền, log activity, revalidate (async function + runAction).

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { isTeamManager } from '@/lib/permissions.js';
import { logActivity } from '@/lib/activity.js';
import * as tags from '@/data/_shared/tags.js';
import { asPlainTeam } from '@/lib/serialize.js';
import { 
    notifyTeamMemberAdded, 
    notifyTeamMemberRemoved, 
    notifyTeamMemberRoleUpdated 
} from '@/lib/noti-helpers.js'; // [NEW]
import { listByTeam as listProjectsByTeam, archiveProject } from '@/data/project/processors/repo.js'; // [NEW]
import Team from '@/model/team.model.js';
import { TEAM_ROLE } from '@/model/common/enums.js';

import {
    validate,
    validateAsync,
    teamIdSchema,
    teamCreateSchema,
    teamUpdateSchema,
    memberAddSchema,
    memberRemoveSchema,
    memberChangeRoleSchema,
} from '@/data/team/processors/validators.js';

import {
    getById,
    listByUser,
    createTeam,
    updateTeam,
    archiveTeam,
    addMember,
    removeMember,
    changeMemberRole,
} from '@/data/team/processors/repo.js';

/** Liệt kê team của bản thân */
export async function listMy() {
    'use server';
    return await runAction(
        async ({ user }) => {
            await connectDB();
            
            

            if (user.role === 'admin') {
                const teams = await Team.find({ isActive: true }).lean();
                return teams.map(asPlainTeam);
            }

            const teams = await listByUser(user.externalUserId);
            return teams.map(asPlainTeam);
        },
        { requireAuth: true }
    );
}

/** Liệt kê tất cả team (bao gồm archived) */
export async function listMyAll() {
    'use server';
    return await runAction(
        async ({ user }) => {
            await connectDB();

            if (user.role === 'admin') {
                const teams = await Team.find({}).lean();
                return teams.map(asPlainTeam);
            }

            const teams = await listByUser(user.externalUserId, { activeOnly: false });
            return teams.map(asPlainTeam);
        },
        { requireAuth: true }
    );
}

/** Liệt kê team mà user là manager (để chọn khi tạo project) */
export async function listManagedTeams() {
    'use server';
    return await runAction(
        async ({ user }) => {
            await connectDB();
            
            if (user.role === 'admin') {
                const teams = await Team.find({ isActive: true }).lean();
                return teams.map(asPlainTeam);
            }

            const teams = await listByUser(user.externalUserId);
            // Chỉ lấy teams mà user là manager
            const managedTeams = teams.filter(team => 
                isTeamManager(team, user)
            );
            return managedTeams.map(asPlainTeam);
        },
        { requireAuth: true }
    );
}

/** Lấy chi tiết team (yêu cầu là member) */
export async function getByIdAction(teamId) {
    'use server';
    return await runAction(
        async ({ user }) => {
            await connectDB();
            const id = validate(teamIdSchema, teamId);
            const team = await getById(id, { lean: true });
            assert(team, 'Không tìm thấy nhóm', 'NOT_FOUND', 404);

            // Check member
            const isMember = (team.members || []).some(
                (m) => String(m.userId) === String(user.externalUserId)
            );
            const isAdmin = user.role === 'admin';
            assert(isMember || isAdmin, 'Bạn không có quyền thực hiện thao tác này', 'FORBIDDEN', 403);

            return asPlainTeam(team);
        },
        { requireAuth: true }
    );
}

/** Tạo team mới (caller = manager) */
export async function create(payload) {
    'use server';
    return await runAction(
        async ({ user }) => {
            await connectDB();
            const data = validate(teamCreateSchema, payload);
            // Only allow app users with role 'admin' to create teams
            assert(user && user.role === 'admin', 'Chỉ quản trị viên mới được tạo nhóm', 'FORBIDDEN', 403);

            const doc = await createTeam(data, user.externalUserId);

            await logActivity({
                actor: user.externalUserId,
                team: doc._id,
                type: 'team.created',
                payload: { name: doc.name },
            });

            await revalidateMany([tags.team(doc._id)]);
            return asPlainTeam(doc);
        },
        { requireAuth: true }
    );
}

/** Cập nhật team (chỉ manager) */
export async function update(teamId, patch) {
    'use server';
    return await runAction(
        async ({ user }) => {
            await connectDB();
            const id = validate(teamIdSchema, teamId);
            const team = await getById(id, { lean: false });
            assert(team, 'Không tìm thấy nhóm', 'NOT_FOUND', 404);
            assert(isTeamManager(team, user.externalUserId), 'Bạn không có quyền thực hiện thao tác này', 'FORBIDDEN', 403);

            const data = validate(teamUpdateSchema, patch);
            const updated = await updateTeam(id, data);

            await logActivity({
                actor: user.externalUserId,
                team: id,
                type: 'team.updated',
                payload: data,
            });

            await revalidateMany([tags.team(id)]);
            return asPlainTeam(updated);
        },
        { requireAuth: true }
    );
}

/** Archive team (chỉ manager/owner) */
export async function archive(teamId) {
    'use server';
    return await runAction(
        async ({ user }) => {
            await connectDB();
            const id = validate(teamIdSchema, teamId);
            const team = await getById(id, { lean: false });
            assert(team, 'Không tìm thấy nhóm', 'NOT_FOUND', 404);
            assert(isTeamManager(team, user.externalUserId), 'Bạn không có quyền thực hiện thao tác này', 'FORBIDDEN', 403);

            // 1. Archive Team
            const updated = await archiveTeam(id);

            // 2. Archive Related Projects
            const projects = await listProjectsByTeam(id);
            const projectIds = [];
            for (const proj of projects) {
                await archiveProject(proj._id);
                projectIds.push(proj._id);
            }

            await logActivity({
                actor: user.externalUserId,
                team: id,
                type: 'team.archived',
                payload: { archivedProjectsCount: projects.length }
            });

            // Revalidate team and all archived projects
            const tagsToRevalidate = [
                tags.team(id), 
                ...projectIds.map(pid => tags.project(pid))
            ];
            await revalidateMany(tagsToRevalidate);
            
            return asPlainTeam(updated);
        },
        { requireAuth: true }
    );
}

/** Thêm thành viên (chỉ manager) */
export async function addMemberAction(teamId, payload) {
    'use server';
    return await runAction(
        async ({ user }) => {
            await connectDB();
            const id = validate(teamIdSchema, teamId);
            const data = await validateAsync(memberAddSchema, payload);

            const team = await getById(id, { lean: false });
            assert(team, 'Không tìm thấy nhóm hoặc đã bị xóa', 'NOT_FOUND', 404);
            assert(isTeamManager(team, user.externalUserId), 'Bạn không có quyền thêm thành viên. Chỉ quản lý nhóm mới được phép.', 'FORBIDDEN', 403);

            const updated = await addMember(id, data);

            await logActivity({
                actor: user.externalUserId,
                team: id,
                type: 'team.member.added',
                payload: { ...data },
            });

            // [NEW] Notify new member
            notifyTeamMemberAdded(
                updated.name || 'nhóm',
                String(data.userId),
                String(id)
            ).catch(err => {
                console.error(`[addMemberAction] Failed to send notification to user ${data.userId}:`, err);
            });

            await revalidateMany([tags.team(id)]);
            return asPlainTeam(updated);
        },
        { requireAuth: true }
    );
}

/** Bỏ thành viên (chỉ manager) */
export async function removeMemberAction(teamId, payload) {
    'use server';
    return await runAction(
        async ({ user }) => {
            await connectDB();
            const id = validate(teamIdSchema, teamId);
            const data = validate(memberRemoveSchema, payload);

            const team = await getById(id, { lean: false });
            assert(team, 'Không tìm thấy nhóm hoặc đã bị xóa', 'NOT_FOUND', 404);
            assert(isTeamManager(team, user.externalUserId), 'Bạn không có quyền xóa thành viên. Chỉ quản lý nhóm mới được phép.', 'FORBIDDEN', 403);

            const currentUserMember = team.members.find(m => String(m.userId) === String(user.externalUserId));
            const isManager = currentUserMember && currentUserMember.role === TEAM_ROLE.MANAGER;

            // Security check: Cannot remove Owner
            const targetMember = team.members.find(m => String(m.userId) === String(data.userId));
            if (targetMember && targetMember.role === TEAM_ROLE.OWNER) {
                throw new Error('Không thể xóa Chủ sở hữu khỏi nhóm.');
            }

            // [FIX] Manager cannot remove other Managers
            if (isManager && targetMember && targetMember.role === TEAM_ROLE.MANAGER) {
                throw new Error('Quản lý không thể xóa một Quản lý khác. Chỉ Chủ sở hữu mới có quyền này.');
            }

            const updated = await removeMember(id, data.userId);

            await logActivity({
                actor: user.externalUserId,
                team: id,
                type: 'team.member.removed',
                payload: { userId: data.userId },
            });

            // [NEW] Notify
            const managers = (team.members || [])
                .filter(m => m.role === TEAM_ROLE.MANAGER)
                .map(m => m.userId);

            notifyTeamMemberRemoved(
                team.name || 'nhóm',
                String(data.userId),
                managers,
                String(id)
            ).catch(err => {
                console.error(`[removeMemberAction] Failed to send notification:`, err);
            });

            await revalidateMany([tags.team(id), tags.userInbox(data.userId)]);
            return asPlainTeam(updated);
        },
        { requireAuth: true }
    );
}

/** Đổi role thành viên (chỉ manager) */
export async function changeRole(teamId, payload) {
    'use server';
    return await runAction(
        async ({ user }) => {
            await connectDB();
            const id = validate(teamIdSchema, teamId);
            const data = validate(memberChangeRoleSchema, payload);

            const team = await getById(id, { lean: false });
            assert(team, 'Không tìm thấy nhóm hoặc đã bị xóa', 'NOT_FOUND', 404);
            assert(isTeamManager(team, user.externalUserId), 'Bạn không có quyền thay đổi vai trò thành viên. Chỉ quản lý nhóm mới được phép.', 'FORBIDDEN', 403);

            const currentUserMember = team.members.find(m => String(m.userId) === String(user.externalUserId));
            const isManager = currentUserMember && currentUserMember.role === TEAM_ROLE.MANAGER;

            // Security check: Cannot change Owner role
            const targetMember = team.members.find(m => String(m.userId) === String(data.userId));
            if (targetMember && targetMember.role === TEAM_ROLE.OWNER) {
                throw new Error('Không thể thay đổi vai trò của Chủ sở hữu.');
            }

            // [FIX] Manager cannot change Manager role
            if (isManager && targetMember && targetMember.role === TEAM_ROLE.MANAGER) {
                throw new Error('Quản lý không thể thay đổi vai trò của một Quản lý khác. Chỉ Chủ sở hữu mới có quyền này.');
            }

            // [FIX] Manager cannot promote to Manager or Owner
            if (isManager && (data.role === TEAM_ROLE.MANAGER || data.role === TEAM_ROLE.OWNER)) {
                throw new Error('Quản lý không thể thăng cấp thành viên lên Quản lý hoặc Chủ sở hữu. Chỉ Chủ sở hữu mới có quyền này.');
            }

            const updated = await changeMemberRole(id, data.userId, data.role);

            await logActivity({
                actor: user.externalUserId,
                team: id,
                type: 'team.member.role_changed',
                payload: { ...data },
            });

            // [NEW] Notify
            const managers = (team.members || [])
                .filter(m => m.role === TEAM_ROLE.MANAGER)
                .map(m => m.userId);

            notifyTeamMemberRoleUpdated(
                team.name || 'nhóm',
                String(data.userId),
                data.role,
                managers,
                String(id)
            ).catch(err => {
                console.error(`[changeRole] Failed to send notification:`, err);
            });

            await revalidateMany([tags.team(id), tags.userInbox(data.userId)]);
            return asPlainTeam(updated);
        },
        { requireAuth: true }
    );
}
