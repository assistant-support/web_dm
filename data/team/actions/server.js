// data/team/actions/server.js
// Tác dụng file: Server actions Team — CRUD + membership; enforce quyền, log activity, revalidate (async function + runAction).

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import { isTeamManager } from '@/lib/permissions.js';
import { logActivity } from '@/lib/activity.js';
import * as tags from '@/data/_shared/tags.js';

import {
    validate,
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
            return await listByUser(user.externalUserId);
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
            const doc = await createTeam(data, user.externalUserId);

            await logActivity({
                actor: user.externalUserId,
                team: doc._id,
                type: 'team.created',
                payload: { name: doc.name },
            });

            await revalidateMany([tags.team(doc._id)]);
            return doc;
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
            assert(team, 'TEAM_NOT_FOUND', 'NOT_FOUND', 404);
            assert(isTeamManager(team, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

            const data = validate(teamUpdateSchema, patch);
            const updated = await updateTeam(id, data);

            await logActivity({
                actor: user.externalUserId,
                team: id,
                type: 'team.updated',
                payload: data,
            });

            await revalidateMany([tags.team(id)]);
            return updated;
        },
        { requireAuth: true }
    );
}

/** Archive team (chỉ manager) */
export async function archive(teamId) {
    'use server';
    return await runAction(
        async ({ user }) => {
            await connectDB();
            const id = validate(teamIdSchema, teamId);
            const team = await getById(id, { lean: false });
            assert(team, 'TEAM_NOT_FOUND', 'NOT_FOUND', 404);
            assert(isTeamManager(team, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

            const updated = await archiveTeam(id);

            await logActivity({
                actor: user.externalUserId,
                team: id,
                type: 'team.archived',
            });

            await revalidateMany([tags.team(id)]);
            return updated;
        },
        { requireAuth: true }
    );
}

/** Thêm thành viên (chỉ manager) – idempotent */
export async function addMemberAction(teamId, payload) {
    'use server';
    return await runAction(
        async ({ user }) => {
            await connectDB();
            const id = validate(teamIdSchema, teamId);
            const data = validate(memberAddSchema, payload);

            const team = await getById(id, { lean: false });
            assert(team, 'TEAM_NOT_FOUND', 'NOT_FOUND', 404);
            assert(isTeamManager(team, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

            const updated = await addMember(id, data);

            await logActivity({
                actor: user.externalUserId,
                team: id,
                type: 'team.member.added',
                payload: { ...data },
            });

            await revalidateMany([tags.team(id), tags.userInbox(data.userId)]);
            return updated;
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
            assert(team, 'TEAM_NOT_FOUND', 'NOT_FOUND', 404);
            assert(isTeamManager(team, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

            const updated = await removeMember(id, data.userId);

            await logActivity({
                actor: user.externalUserId,
                team: id,
                type: 'team.member.removed',
                payload: { userId: data.userId },
            });

            await revalidateMany([tags.team(id), tags.userInbox(data.userId)]);
            return updated;
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
            assert(team, 'TEAM_NOT_FOUND', 'NOT_FOUND', 404);
            assert(isTeamManager(team, user.externalUserId), 'FORBIDDEN', 'FORBIDDEN', 403);

            const updated = await changeMemberRole(id, data.userId, data.role);

            await logActivity({
                actor: user.externalUserId,
                team: id,
                type: 'team.member.role_changed',
                payload: { ...data },
            });

            await revalidateMany([tags.team(id), tags.userInbox(data.userId)]);
            return updated;
        },
        { requireAuth: true }
    );
}
