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
            assert(team, 'Không tìm thấy nhóm hoặc đã bị xóa', 'NOT_FOUND', 404);
            assert(isTeamManager(team, uid), 'Bạn không có quyền thực hiện thao tác này. Chỉ quản lý nhóm mới được phép.', 'FORBIDDEN', 403);

            team.isActive = !team.isActive;
            await team.save();

            await revalidateMany([tags.team(teamId)]);

            return JSON.parse(JSON.stringify({
                isActive: team.isActive,
                message: team.isActive ? 'Đã kích hoạt lại nhóm thành công.' : 'Đã lưu trữ nhóm thành công.'
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
            assert(team, 'Không tìm thấy nhóm hoặc đã bị xóa', 'NOT_FOUND', 404);
            
            // [FIX] Chỉ OWNER mới có thể xóa team
            const currentUserMember = team.members.find(m => String(m.userId) === String(uid));
            const isOwner = currentUserMember && currentUserMember.role === 'owner'; // TEAM_ROLE.OWNER
            assert(isOwner, 'Bạn không có quyền xóa nhóm. Chỉ chủ sở hữu mới được phép xóa.', 'FORBIDDEN', 403);

            assert(
                confirmText.toLowerCase() === team.name.toLowerCase(),
                'Tên nhóm xác nhận không khớp. Vui lòng nhập đúng tên nhóm để xóa.',
                'INVALID_INPUT',
                400
            );

            const projectCount = await Project.countDocuments({ team: teamId });
            assert(
                projectCount === 0,
                `Nhóm này vẫn còn ${projectCount} dự án. Vui lòng xóa hoặc chuyển các dự án sang nhóm khác trước khi xóa nhóm.`,
                'HAS_DEPENDENCIES',
                400
            );

            const taskCount = await Task.countDocuments({
                team: teamId,
                project: null
            });
            assert(
                taskCount === 0,
                `Nhóm này vẫn còn ${taskCount} công việc độc lập. Vui lòng xóa hoặc chuyển các công việc này trước khi xóa nhóm.`,
                'HAS_DEPENDENCIES',
                400
            );

            // Dùng `findByIdAndDelete` vì `team` là Mongoose doc
            await Team.findByIdAndDelete(teamId);

            await revalidateMany([tags.team(teamId)]);

            return JSON.parse(JSON.stringify({
                message: 'Đã xóa nhóm thành công.'
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
            assert(team, 'Không tìm thấy nhóm hoặc đã bị xóa', 'NOT_FOUND', 404);
            
            // [FIX] Chỉ OWNER mới có thể chuyển quyền sở hữu
            const currentUserMember = team.members.find(m => String(m.userId) === String(uid));
            const isOwner = currentUserMember && currentUserMember.role === 'owner';
            assert(isOwner, 'Bạn không có quyền chuyển quyền sở hữu. Chỉ chủ sở hữu mới được phép.', 'FORBIDDEN', 403);

            const newManager = team.members.find(m => String(m.userId) === String(newManagerUserId));
            assert(newManager, 'Người dùng được chọn không phải là thành viên của nhóm này.', 'INVALID_INPUT', 400);

            team.members = team.members.map(m => {
                // Chuyển Mongoose sub-document về plain object để map an toàn
                const memberObj = m.toObject ? m.toObject() : m;
                if (String(memberObj.userId) === String(uid)) {
                    return { ...memberObj, role: 'manager' }; // Owner cũ thành Manager
                }
                if (String(memberObj.userId) === String(newManagerUserId)) {
                    return { ...memberObj, role: 'owner' }; // Người mới thành Owner
                }
                return memberObj;
            });

            await team.save();

            await revalidateMany([tags.team(teamId)]);

            return JSON.parse(JSON.stringify({
                message: 'Đã chuyển quyền sở hữu nhóm thành công.'
            }));
        },
        { requireAuth: true }
    );
}