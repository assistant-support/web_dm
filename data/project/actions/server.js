// // data/project/actions/server.js
// // Tác dụng file: Server actions Project — CRUD + membership + Drive folder khi create; enforce quyền, log, revalidate (async function + runAction).

// 'use server';

// import { connectDB } from '@/lib/db.js';
// import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
// import { isTeamManager, canManageProject } from '@/lib/permissions.js';
// import { logActivity } from '@/lib/activity.js';
// import * as tags from '@/data/_shared/tags.js';

// import Team from '@/model/team.model.js';

// import {
//     validate,
//     projectIdSchema,
//     teamIdSchema,
//     projectCreateSchema,
//     projectUpdateSchema,
//     memberAddSchema,
//     memberRemoveSchema,
//     memberChangeRoleSchema,
// } from '@/data/project/processors/validators.js';

// import {
//     listByTeam,
//     getDetail,
//     createProject,
//     updateProject,
//     archiveProject,
//     addMember,
//     removeMember,
//     changeMemberRole,
// } from '@/data/project/processors/repo.js';

// /** Liệt kê project theo team (yêu cầu thành viên team) */
// export async function listByTeamAction(teamId) {
//     'use server';
//     return await runAction(
//         async ({ user }) => {
//             await connectDB();
//             const id = validate(teamIdSchema, teamId);
//             const team = await Team.findById(id).lean();
//             assert(team, 'TEAM_NOT_FOUND', 'NOT_FOUND', 404);

//             const isMember = (team.members || []).some((m) => String(m.userId) === String(user.externalUserId));
//             assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

//             return await listByTeam(id);
//         },
//         { requireAuth: true }
//     );
// }

// /** Lấy chi tiết project (yêu cầu thành viên team của project) */
// export async function getDetailAction(projectId) {
//     'use server';
//     return await runAction(
//         async ({ user }) => {
//             await connectDB();
//             const id = validate(projectIdSchema, projectId);
//             const proj = await getDetail(id, { lean: true });
//             assert(proj, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

//             const team = await Team.findById(proj.team).lean();
//             assert(team, 'TEAM_NOT_FOUND', 'NOT_FOUND', 404);

//             const isMember = (team.members || []).some((m) => String(m.userId) === String(user.externalUserId));
//             assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

//             return proj;
//         },
//         { requireAuth: true }
//     );
// }

// /** Tạo project mới (chỉ Team Manager), kèm tạo thư mục Drive */
// export async function create(payload) {
//     'use server';
//     return await runAction(
//         async ({ user }) => {
//             await connectDB();

//             const data = validate(projectCreateSchema, payload);
//             const team = await Team.findById(data.team).lean();
//             assert(team, 'TEAM_NOT_FOUND', 'NOT_FOUND', 404);
//             assert(isTeamManager(team, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

//             const doc = await createProject(data, user.externalUserId);

//             await logActivity({
//                 actor: user.externalUserId,
//                 team: data.team,
//                 project: doc._id,
//                 type: 'project.created',
//                 payload: { name: doc.name },
//             });

//             await logActivity({
//                 actor: user.externalUserId,
//                 team: data.team,
//                 project: doc._id,
//                 type: 'drive.folder.created',
//                 payload: { driveFolderId: doc.driveFolderId },
//             });

//             await revalidateMany([tags.team(data.team), tags.project(doc._id)]);
//             return doc;
//         },
//         { requireAuth: true }
//     );
// }

// /** Cập nhật project (OWNER/MANAGER) */
// export async function update(projectId, patch) {
//     'use server';
//     return await runAction(
//         async ({ user }) => {
//             await connectDB();

//             const id = validate(projectIdSchema, projectId);
//             const projectDoc = await getDetail(id, { lean: false });
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

//             assert(canManageProject(projectDoc, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

//             const data = validate(projectUpdateSchema, patch);
//             const updated = await updateProject(id, data);

//             await logActivity({
//                 actor: user.externalUserId,
//                 team: projectDoc.team,
//                 project: id,
//                 type: 'project.updated',
//                 payload: data,
//             });

//             await revalidateMany([tags.team(projectDoc.team), tags.project(id)]);
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// /** Archive project (OWNER/MANAGER) */
// export async function archive(projectId) {
//     'use server';
//     return await runAction(
//         async ({ user }) => {
//             await connectDB();

//             const id = validate(projectIdSchema, projectId);
//             const projectDoc = await getDetail(id, { lean: false });
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

//             assert(canManageProject(projectDoc, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

//             const updated = await archiveProject(id);

//             await logActivity({
//                 actor: user.externalUserId,
//                 team: projectDoc.team,
//                 project: id,
//                 type: 'project.archived',
//             });

//             await revalidateMany([tags.team(projectDoc.team), tags.project(id)]);
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// /** Thêm thành viên (OWNER/MANAGER) – idempotent */
// export async function addMemberAction(projectId, payload) {
//     'use server';
//     return await runAction(
//         async ({ user }) => {
//             await connectDB();

//             const id = validate(projectIdSchema, projectId);
//             const data = validate(memberAddSchema, payload);

//             const projectDoc = await getDetail(id, { lean: false });
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
//             assert(canManageProject(projectDoc, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

//             const updated = await addMember(id, data);

//             await logActivity({
//                 actor: user.externalUserId,
//                 team: projectDoc.team,
//                 project: id,
//                 type: 'project.member.added',
//                 payload: { ...data },
//             });

//             await revalidateMany([tags.team(projectDoc.team), tags.project(id), tags.userInbox(data.userId)]);
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// /** Bỏ thành viên (OWNER/MANAGER) */
// export async function removeMemberAction(projectId, payload) {
//     'use server';
//     return await runAction(
//         async ({ user }) => {
//             await connectDB();

//             const id = validate(projectIdSchema, projectId);
//             const data = validate(memberRemoveSchema, payload);

//             const projectDoc = await getDetail(id, { lean: false });
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
//             assert(canManageProject(projectDoc, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

//             const updated = await removeMember(id, data.userId);

//             await logActivity({
//                 actor: user.externalUserId,
//                 team: projectDoc.team,
//                 project: id,
//                 type: 'project.member.removed',
//                 payload: { userId: data.userId },
//             });

//             await revalidateMany([tags.team(projectDoc.team), tags.project(id), tags.userInbox(data.userId)]);
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

// /** Đổi role (OWNER/MANAGER) */
// export async function changeRole(projectId, payload) {
//     'use server';
//     return await runAction(
//         async ({ user }) => {
//             await connectDB();

//             const id = validate(projectIdSchema, projectId);
//             const data = validate(memberChangeRoleSchema, payload);

//             const projectDoc = await getDetail(id, { lean: false });
//             assert(projectDoc, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
//             assert(canManageProject(projectDoc, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

//             const updated = await changeMemberRole(id, data.userId, data.role);

//             await logActivity({
//                 actor: user.externalUserId,
//                 team: projectDoc.team,
//                 project: id,
//                 type: 'project.member.role_changed',
//                 payload: { ...data },
//             });

//             await revalidateMany([tags.team(projectDoc.team), tags.project(id), tags.userInbox(data.userId)]);
//             return updated;
//         },
//         { requireAuth: true }
//     );
// }

//ver 1
// data/project/actions/server.js
// Tác dụng file: Server Actions cho Project — enforce quyền + log + revalidate + TRẢ KẾT QUẢ DẠNG PLAIN JSON.

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { isTeamManager, canManageProject } from '@/lib/permissions.js';
import { logActivity } from '@/lib/activity.js';
import * as tags from '@/data/_shared/tags.js';

import Team from '@/model/team.model.js';
import { PROJECT_ROLE } from '@/model/common/enums.js';

import {
    validate, projectIdSchema, teamIdSchema,
    projectCreateSchema, projectUpdateSchema,
    memberAddSchema, memberRemoveSchema, memberChangeRoleSchema
} from '@/data/project/processors/validators.js';

import {
    listByTeam, getDetail, createProject, updateProject, archiveProject,
    addMember, removeMember, changeMemberRole
} from '@/data/project/processors/repo.js';

import { asPlainProject } from '@/lib/serialize.js';

/** Liệt kê project theo team (yêu cầu user là thành viên team). */
export async function listByTeamAction(teamId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(teamIdSchema, teamId);

        // Kiểm tra là thành viên team (tối thiểu)
        const team = await Team.findById(id).lean().exec();
        assert(team, 'TEAM_NOT_FOUND', 'NOT_FOUND', 404);
        const isMember = (team.members || []).some((m) => String(m.userId) === String(user.externalUserId));
        assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

        const rows = await listByTeam(id);
        return rows.map(asPlainProject);
    }, { requireAuth: true });
}

/** Lấy chi tiết project. */
export async function getDetailAction(projectId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(projectIdSchema, projectId);
        const proj = await getDetail(id);
        assert(proj, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

        // Quyền xem tối thiểu: là thành viên team của project
        const team = await Team.findById(proj.team).lean().exec();
        const isMember = (team?.members || []).some((m) => String(m.userId) === String(user.externalUserId));
        assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

        return asPlainProject(proj);
    }, { requireAuth: true });
}

/** Tạo project (team manager hoặc độc lập nếu không có team). */
export async function create(payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const data = validate(projectCreateSchema, payload);

        // Nếu có team, kiểm tra quyền manager
        if (data.team) {
            const team = await Team.findById(data.team).lean().exec();
            assert(team, 'TEAM_NOT_FOUND', 'NOT_FOUND', 404);
            assert(isTeamManager(team, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);
        }
        // Nếu không có team, dự án sẽ là dự án độc lập với creator là owner

        const doc = await createProject(data, user.externalUserId);
        
        // Log activity
        await logActivity({ 
            actor: user.externalUserId, 
            team: data.team || undefined, 
            project: doc._id, 
            type: 'project.created', 
            payload: { name: doc.name, isIndependent: !data.team } 
        });
        
        await logActivity({ 
            actor: user.externalUserId, 
            team: data.team || undefined, 
            project: doc._id, 
            type: 'drive.folder.created', 
            payload: { driveFolderId: doc.driveFolderId } 
        });
        
        // Revalidate tags
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

        const raw = await getDetail(id, { lean: false });
        assert(raw, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        assert(canManageProject(raw, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

        const updated = await updateProject(id, data);
        await logActivity({ actor: user.externalUserId, project: id, team: updated.team, type: 'project.updated', payload: data });
        await revalidateMany([tags.team(updated.team), tags.project(id)]);

        return asPlainProject(updated);
    }, { requireAuth: true });
}

/** Archive project */
export async function archive(projectId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(projectIdSchema, projectId);
        const raw = await getDetail(id, { lean: false });
        assert(raw, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        assert(canManageProject(raw, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

        const updated = await archiveProject(id);
        await logActivity({ actor: user.externalUserId, project: id, team: updated.team, type: 'project.archived' });
        await revalidateMany([tags.team(updated.team), tags.project(id)]);
        return asPlainProject(updated);
    }, { requireAuth: true });
}

/** Thêm member */
export async function addMemberAction(projectId, payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(projectIdSchema, projectId);
        const data = validate(memberAddSchema, payload);

        const raw = await getDetail(id, { lean: false });
        assert(raw, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        assert(canManageProject(raw, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

        const updated = await addMember(id, data);
        await logActivity({ actor: user.externalUserId, project: id, team: updated.team, type: 'project.member.added', payload: { ...data } });
        await revalidateMany([tags.team(updated.team), tags.project(id), tags.userInbox(data.userId)]);

        return asPlainProject(updated);
    }, { requireAuth: true });
}

/** Xoá member */
export async function removeMemberAction(projectId, payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(projectIdSchema, projectId);
        const data = validate(memberRemoveSchema, payload);

        const raw = await getDetail(id, { lean: false });
        assert(raw, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        assert(canManageProject(raw, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

        const updated = await removeMember(id, data.userId);
        await logActivity({ actor: user.externalUserId, project: id, team: updated.team, type: 'project.member.removed', payload: { userId: data.userId } });
        await revalidateMany([tags.team(updated.team), tags.project(id), tags.userInbox(data.userId)]);

        return asPlainProject(updated);
    }, { requireAuth: true });
}

/** Đổi role member */
export async function changeRole(projectId, payload) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(projectIdSchema, projectId);
        const data = validate(memberChangeRoleSchema, payload);

        const raw = await getDetail(id, { lean: false });
        assert(raw, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        assert(canManageProject(raw, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

        const updated = await changeMemberRole(id, data.userId, data.role);
        await logActivity({ actor: user.externalUserId, project: id, team: updated.team, type: 'project.member.role_changed', payload: { ...data } });
        await revalidateMany([tags.team(updated.team), tags.project(id), tags.userInbox(data.userId)]);

        return asPlainProject(updated);
    }, { requireAuth: true });
}

/** Update project - wrapper cho update với tên khác */
export async function updateProjectAction(projectId, updates) {
    return await update(projectId, updates);
}

/** Delete project (soft delete bằng cách archive) */
export async function deleteProjectAction(projectId) {
    await connectDB();
    return runAction(async ({ user }) => {
        const id = validate(projectIdSchema, projectId);
        const raw = await getDetail(id, { lean: false });
        assert(raw, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);
        
        // Chỉ owner mới có quyền xóa
        const isOwner = raw.members.some(m => m.userId === user.externalUserId && m.role === 'owner');
        assert(isOwner, 'FORBIDDEN', 'FORBIDDEN', 403);

        // Soft delete: đánh dấu là deleted
        const updated = await updateProject(id, { isDeleted: true, deletedAt: new Date() });
        
        await logActivity({ 
            actor: user.externalUserId, 
            project: id, 
            team: updated.team, 
            type: 'project.deleted' 
        });
        
        await revalidateMany([tags.team(updated.team), tags.project(id)]);
        return asPlainProject(updated);
    }, { requireAuth: true });
}
