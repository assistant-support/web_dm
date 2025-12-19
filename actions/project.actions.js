/**
 * @file actions/project.actions.js
 * @description Server Actions for project-related business logic.
 * These actions encapsulate permission checks, data manipulation, activity logging, and cache revalidation.
 */

'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { getRequestUser } from '@/lib/request-user';
import { logActivity } from '@/lib/activity';
import { canManageProject, canViewProject, getProjectRole } from '@/lib/permissions';
import * as projectData from '@/data/project.data';
import { z } from 'zod';
import * as userData from '@/data/user.data'; // Cần import user data
import { PROJECT_ROLE } from '@/model/common/enums';

const CreateProjectSchema = z.object({
    name: z.string().min(3, "Tên dự án phải có ít nhất 3 ký tự."),
    team: z.string().optional(),
    description: z.string().optional(),
});

const MemberActionSchema = z.object({
    projectId: z.string(),
    userId: z.string(),
});

const InviteMemberSchema = MemberActionSchema.extend({
    email: z.string().email('Địa chỉ email không hợp lệ.'),
    role: z.nativeEnum(PROJECT_ROLE).default(PROJECT_ROLE.MEMBER),
});


/**
 * Creates a new project.
 * @param {object} formData - The project data from the form.
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>} Result object.
 */
export async function createProject(formData) {
    const user = await getRequestUser();
    if (!user) {
        return { success: false, data: null, error: 'Bạn chưa đăng nhập.' };
    }

    const validation = CreateProjectSchema.safeParse(formData);
    if (!validation.success) {
        return { success: false, data: null, error: validation.error.flatten().fieldErrors };
    }

    const { name, team, description } = validation.data;

    // In a real scenario, you would check team permissions here.
    // For now, we assume the user has permission to create a project in the team.

    try {
        const newProject = await projectData.createProject({
            name,
            team,
            description,
            members: [{ userId: user.id, role: 'owner' }], // Creator is the owner
        });

        await logActivity({
            actor: user.id,
            type: 'project.create',
            project: newProject._id,
            payload: { name },
        });

        revalidateTag('projects');
        revalidatePath('/projects');

        return { success: true, data: newProject, error: null };
    } catch (error) {
        console.error('Error creating project:', error);
        return { success: false, data: null, error: 'Tạo dự án thất bại.' };
    }
}

/**
 * Updates an existing project.
 * @param {string} projectId - The ID of the project to update.
 * @param {object} updateData - The data to update.
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>} Result object.
 */
export async function updateProject(projectId, updateData) {
    const user = await getRequestUser();
    if (!user) {
        return { success: false, data: null, error: 'Bạn chưa đăng nhập.' };
    }

    const project = await projectData.findProjectById(projectId);
    if (!project) {
        return { success: false, data: null, error: 'Dự án không tồn tại hoặc đã bị xóa.' };
    }

    if (!canManageProject(project, user.id)) {
        return { success: false, data: null, error: 'Bạn không có quyền thực hiện thao tác này.' };
    }

    try {
        const updatedProject = await projectData.updateProjectById(projectId, updateData);

        await logActivity({
            actor: user.id,
            type: 'project.update',
            project: projectId,
            payload: { changes: updateData },
        });

        revalidateTag(`project-${projectId}`);
        revalidateTag('projects');
        revalidatePath(`/projects/${projectId}`);

        return { success: true, data: updatedProject, error: null };
    } catch (error) {
        console.error(`Error updating project ${projectId}:`, error);
        return { success: false, data: null, error: 'Cập nhật dự án thất bại.' };
    }
}

/**
 * Deletes a project.
 * @param {string} projectId - The ID of the project to delete.
 * @returns {Promise<{success: boolean, error: string|null}>} Result object.
 */
export async function deleteProject(projectId) {
    const user = await getRequestUser();
    if (!user) {
        return { success: false, error: 'Bạn chưa đăng nhập.' };
    }

    const project = await projectData.findProjectById(projectId);
    if (!project) {
        return { success: false, error: 'Dự án không tồn tại hoặc đã bị xóa.' };
    }

    // Only the project owner can delete it
    const userRole = getProjectRole(project, user.id);
    if (userRole !== 'owner') {
        return { success: false, error: 'Bạn không có quyền xóa dự án này. Chỉ chủ sở hữu mới được phép xóa.' };
    }

    try {
        await projectData.deleteProjectById(projectId);

        await logActivity({
            actor: user.id,
            type: 'project.delete',
            project: projectId,
            payload: { name: project.name },
        });

        revalidateTag('projects');
        revalidatePath('/projects');

        return { success: true, error: null };
    } catch (error) {
        console.error(`Error deleting project ${projectId}:`, error);
        return { success: false, error: 'Xóa dự án thất bại.' };
    }
}

/**
 * Invites a user to a project by their email.
 * @param {FormData} formData - Must contain projectId, email, and role.
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function inviteMemberToProject(formData) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: 'Bạn chưa đăng nhập.' };

    const validation = InviteMemberSchema.safeParse(Object.fromEntries(formData));
    if (!validation.success) {
        return { success: false, error: 'Dữ liệu đầu vào không hợp lệ.' };
    }
    
    const { projectId, email, role } = validation.data;

    const project = await projectData.findProjectById(projectId);
    if (!project || !canManageProject(project, user.id)) {
        return { success: false, error: 'Bạn không có quyền thực hiện hoặc dự án không tồn tại.' };
    }

    const memberToInvite = await userData.findUserByEmail(email);
    if (!memberToInvite) {
        return { success: false, error: `Không tìm thấy người dùng với email "${email}".` };
    }

    if (project.members.some(m => m.userId === memberToInvite.id)) {
        return { success: false, error: 'Người dùng này đã là thành viên của dự án.' };
    }

    try {
        await projectData.addMemberToProject(projectId, memberToInvite.id, role);

        await logActivity({
            actor: user.id,
            type: 'project.member.add',
            project: projectId,
            payload: { invitedUserId: memberToInvite.id, role },
        });

        revalidateTag(`project-detail-${projectId}`);
        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: 'Mời thành viên thất bại.' };
    }
}

/**
 * Removes a member from a project.
 * @param {string} projectId - The ID of the project.
 * @param {string} userIdToRemove - The ID of the user to remove.
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function removeMemberFromProject(projectId, userIdToRemove) {
    const user = await getRequestUser();
    if (!user) return { success: false, error: 'Bạn chưa đăng nhập.' };

    if (user.id === userIdToRemove) {
        return { success: false, error: "Bạn không thể tự xóa chính mình khỏi dự án." };
    }

    const project = await projectData.findProjectById(projectId);
    if (!project || !canManageProject(project, user.id)) {
        return { success: false, error: 'Bạn không có quyền thực hiện hoặc dự án không tồn tại.' };
    }

    try {
        await projectData.removeMemberFromProject(projectId, userIdToRemove);

        await logActivity({
            actor: user.id,
            type: 'project.member.remove',
            project: projectId,
            payload: { removedUserId: userIdToRemove },
        });

        revalidateTag(`project-detail-${projectId}`);
        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: 'Xóa thành viên thất bại.' };
    }
}
