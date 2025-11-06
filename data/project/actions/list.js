// data/project/actions/list.js
// Actions để list projects của user
// Tối ưu: Sử dụng repo.getDetail

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert } from '@/lib/action-utils.js'; // Thêm assert
import Project from '@/model/project.model.js';
// Tối ưu: Import hàm repo
import { getDetail as getProjectDetailRepo } from '@/data/project/processors/repo.js';

/**
 * Liệt kê projects mà user là thành viên
 */
export async function listMyProjects({ search = '', teamId = null } = {}) {
    return runAction(
        async ({ user }) => {
            await connectDB();

            const query = {
                'members.userId': user.externalUserId,
                isActive: true, // Thường chỉ muốn list project active
                // deletedAt: null, // Thêm nếu bạn có soft delete
            };
            if (teamId) {
                query.team = teamId;
            }
            if (search && search.trim()) {
                const regex = { $regex: search.trim(), $options: 'i' };
                query.$or = [{ name: regex }];
            }

            // Cân nhắc chuyển logic query này vào repo nếu phức tạp hơn
            const projects = await Project.find(query)
                .populate('team') // Populate toàn bộ team (bao gồm members)
                .sort({ updatedAt: -1 })
                .limit(100) // Giới hạn số lượng trả về
                .lean();

            // Serialize thủ công để đảm bảo team được xử lý đúng
            const plainProjects = projects.map(p => {
                const plainP = { ...p };
                if (plainP.team && plainP.team._id) {
                    plainP.team = { _id: String(plainP.team._id), name: plainP.team.name };
                }
                plainP._id = String(plainP._id);
                // Xử lý các ObjectId khác nếu cần
                return plainP;
            });

            return { projects: plainProjects, count: plainProjects.length };

        },
        { requireAuth: true }
    );
    // Cân nhắc dùng unstable_cache ở đây nếu danh sách này ít thay đổi
    // và được gọi thường xuyên bởi cùng user/team/search params.
}

/**
 * Lấy chi tiết project - chỉ khi user là thành viên
 */
export async function getProjectDetail(projectId) {
    return runAction(
        async ({ user }) => {
            await connectDB();

            // Tối ưu: Sử dụng hàm repo đã cache
            const project = await getProjectDetailRepo(projectId, { lean: true });
            assert(project, 'PROJECT_NOT_FOUND', 'NOT_FOUND', 404);

            const isMember = (project.members || []).some(
                m => String(m.userId) === String(user.externalUserId)
            );
            assert(isMember, 'FORBIDDEN', 'FORBIDDEN', 403);

            // Hàm repo đã populate và lean, chỉ cần serialize
            return JSON.parse(JSON.stringify(project));
        },
        { requireAuth: true }
    );
}