// data/team/actions/management.js
// Server actions cho quản lý team (archive, delete)

'use server';

import { z } from 'zod';
import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import Team from '@/model/team.model.js';
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

            const team = await Team.findById(teamId);
            assert(team, 'Team không tồn tại', 'NOT_FOUND', 404);
            assert(isTeamManager(team, uid), 'Chỉ manager mới có thể archive team', 'FORBIDDEN', 403);

            team.isActive = !team.isActive;
            await team.save();

            await revalidateMany([tags.team(teamId)]);

            // Serialize để tránh lỗi MongoDB ObjectId
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

            const team = await Team.findById(teamId);
            assert(team, 'Team không tồn tại', 'NOT_FOUND', 404);
            assert(isTeamManager(team, uid), 'Chỉ manager mới có thể xóa team', 'FORBIDDEN', 403);

            // Kiểm tra confirmation text
            assert(
                confirmText.toLowerCase() === team.name.toLowerCase(),
                'Tên team không khớp',
                'INVALID_INPUT',
                400
            );

            // Kiểm tra có projects không
            const projectCount = await Project.countDocuments({ team: teamId });
            assert(
                projectCount === 0,
                `Team còn ${projectCount} dự án. Vui lòng xóa hoặc chuyển các dự án trước.`,
                'HAS_DEPENDENCIES',
                400
            );

            // Kiểm tra có tasks không (các tasks không thuộc project nào)
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

            // Xóa team
            await Team.findByIdAndDelete(teamId);

            await revalidateMany([tags.team(teamId)]);

            // Serialize để tránh lỗi MongoDB ObjectId
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

            const team = await Team.findById(teamId);
            assert(team, 'Team không tồn tại', 'NOT_FOUND', 404);
            assert(isTeamManager(team, uid), 'Chỉ manager mới có thể chuyển quyền', 'FORBIDDEN', 403);

            // Kiểm tra newManager có trong team không
            const newManager = team.members.find(m => String(m.userId) === String(newManagerUserId));
            assert(newManager, 'Người dùng không phải thành viên của team', 'INVALID_INPUT', 400);

            // Đổi role: current manager -> member, new -> manager
            team.members = team.members.map(m => {
                if (String(m.userId) === String(uid)) {
                    return { ...m, role: 'member' };
                }
                if (String(m.userId) === String(newManagerUserId)) {
                    return { ...m, role: 'manager' };
                }
                return m;
            });

            await team.save();

            await revalidateMany([tags.team(teamId)]);

            // Serialize để tránh lỗi MongoDB ObjectId
            return JSON.parse(JSON.stringify({
                message: 'Đã chuyển quyền quản lý thành công'
            }));
        },
        { requireAuth: true }
    );
}
