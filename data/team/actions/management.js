// data/team/actions/management.js

'use server';

import { z } from 'zod';
import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import Team from '@/model/team.model.js';
import { getById } from '@/data/team/processors/repo.js'; 
import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';
import { isTeamManager } from '@/lib/permissions.js';
import * as tags from '@/data/_shared/tags.js';

/**
 * Archive/Unarchive team
 */
export async function toggleArchive(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { teamId } = z
                .object({
                    teamId: z.string().min(1),
                })
                .parse(payload || {});

            // Tối ưu: Dùng getById (lean: false để lấy Mongoose doc)
            const team = await getById(teamId, { lean: false });
            assert(team, 'Team không tồn tại', 'NOT_FOUND', 404);
            assert(isTeamManager(team, uid), 'Chỉ manager mới có thể archive team', 'FORBIDDEN', 403);

            team.isActive = !team.isActive;
            await team.save();

            await revalidateMany([tags.team(teamId)]);

            return JSON.parse(JSON.stringify({
                isActive: team.isActive,
                message: team.isActive ? 'Đã kích hoạt lại team' : 'Đã lưu trữ team'
            }));
        },
        { requireAuth: true }
    );
}

/**
 * Delete team (với kiểm tra cascade)
 */
export async function deleteTeam(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { teamId, confirmText } = z
                .object({
                    teamId: z.string().min(1),
                    confirmText: z.string().min(1),
                })
                .parse(payload || {});

            // Tối ưu: Dùng getById (lean: false để lấy Mongoose doc)
            const team = await getById(teamId, { lean: false });
            assert(team, 'Team không tồn tại', 'NOT_FOUND', 404);
            assert(isTeamManager(team, uid), 'Chỉ manager mới có thể xóa team', 'FORBIDDEN', 403);

            assert(
                confirmText.toLowerCase() === team.name.toLowerCase(),
                'Tên team không khớp',
                'INVALID_INPUT',
                400
            );

            const projectCount = await Project.countDocuments({ team: teamId });
            assert(
                projectCount === 0,
                `Team còn ${projectCount} dự án. Vui lòng xóa hoặc chuyển các dự án trước.`,
                'HAS_DEPENDENCIES',
                400
            );

            const taskCount = await Task.countDocuments({
                team: teamId,
                project: null
            });
            assert(
                taskCount === 0,
                `Team còn ${taskCount} tasks. Vui lòng xóa hoặc chuyển các tasks trước.`,
                'HAS_DEPENDENCIES',
                400
            );

            // Dùng `findByIdAndDelete` vì `team` là Mongoose doc
            await Team.findByIdAndDelete(teamId);

            await revalidateMany([tags.team(teamId)]);

            return JSON.parse(JSON.stringify({
                message: 'Đã xóa team thành công'
            }));
        },
        { requireAuth: true }
    );
}

/**
 * Transfer ownership (thay đổi role của members)
 */
export async function transferOwnership(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { teamId, newManagerUserId } = z
                .object({
                    teamId: z.string().min(1),
                    newManagerUserId: z.string().min(1),
                })
                .parse(payload || {});

            // Tối ưu: Dùng getById (lean: false để lấy Mongoose doc)
            const team = await getById(teamId, { lean: false });
            assert(team, 'Team không tồn tại', 'NOT_FOUND', 404);
            assert(isTeamManager(team, uid), 'Chỉ manager mới có thể chuyển quyền', 'FORBIDDEN', 403);

            const newManager = team.members.find(m => String(m.userId) === String(newManagerUserId));
            assert(newManager, 'Người dùng không phải thành viên của team', 'INVALID_INPUT', 400);

            team.members = team.members.map(m => {
                // Chuyển Mongoose sub-document về plain object để map an toàn
                const memberObj = m.toObject ? m.toObject() : m;
                if (String(memberObj.userId) === String(uid)) {
                    return { ...memberObj, role: 'member' };
                }
                if (String(memberObj.userId) === String(newManagerUserId)) {
                    return { ...memberObj, role: 'manager' };
                }
                return memberObj;
            });

            await team.save();

            await revalidateMany([tags.team(teamId)]);

            return JSON.parse(JSON.stringify({
                message: 'Đã chuyển quyền quản lý thành công'
            }));
        },
        { requireAuth: true }
    );
}