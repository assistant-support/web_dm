// /data/workflow/actions/server.js
// Cấu trúc: /data/workflow/actions/*
// Mục đích: Server Actions CRUD Workflow + attach task. Revalidate & quyền đầy đủ.
// Chuẩn: 'use server' + await connectDB() + runAction(..., { requireAuth:true })
// Quyền: create/update/attach/activate/deactivate -> manager project; getByProject -> member

'use server';

import { connectDB } from '@/lib/db.js';
import { runAction, assert, revalidateMany } from '@/lib/action-utils.js';
import * as tags from '@/data/_shared/tags.js';
import Project from '@/model/project.model.js';
import Workflow from '@/model/workflow.model.js';
import { canManageProject, canViewProject } from '@/lib/permissions.js';
import {
    workflowCreateSchema,
    workflowUpdateSchema,
    attachTaskSchema,
    activateSchema,
    deactivateSchema,
    getByProjectSchema,
    validate,
} from '@/data/workflow/processors/validators.js';
import {
    createWorkflow,
    updateWorkflow,
    attachTask as repoAttachTask,
    activateWorkflow,
    deactivateWorkflow,
    getByProject,
} from '@/data/workflow/processors/repo.js';
import { logActivity } from '@/lib/activity.js';

/** Helper: tag workflow an toàn (fallback nếu tags.workflow chưa được định nghĩa) */
function wfTag(id) {
    return typeof tags.workflow === 'function' ? tags.workflow(id) : `workflow:${String(id)}`;
}

/** Action: tạo workflow mới */
export async function create(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const data = validate(workflowCreateSchema, payload);

            const project = await Project.findById(data.projectId).lean();
            assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);
            assert(
                await canManageProject(project, uid),
                'Bạn không có quyền quản lý workflow của project này',
                'FORBIDDEN',
                403
            );

            const wf = await createWorkflow({
                projectId: data.projectId,
                name: data.name,
                description: data.description,
                nodes: data.nodes,
                edges: data.edges,
                active: !!data.active,
            });

            await revalidateMany([tags.project(wf.project), wfTag(wf.id)].filter(Boolean));
            await logActivity({
                actor: uid,
                project: wf.project,
                type: 'workflow.created',
                payload: { workflowId: wf.id, name: wf.name },
            });

            return wf;
        },
        { requireAuth: true }
    );
}

/** Action: cập nhật workflow */
export async function update(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { workflowId, patch } = validate(workflowUpdateSchema, payload);

            const wfDoc = await Workflow.findById(workflowId).lean();
            assert(wfDoc, 'Workflow không tồn tại', 'NOT_FOUND', 404);

            const project = await Project.findById(wfDoc.project).lean();
            assert(
                await canManageProject(project, uid),
                'Bạn không có quyền quản lý workflow của project này',
                'FORBIDDEN',
                403
            );

            const wf = await updateWorkflow({ workflowId, patch });

            await revalidateMany([tags.project(wf.project), wfTag(wf.id)].filter(Boolean));
            await logActivity({
                actor: uid,
                project: wf.project,
                type: 'workflow.updated',
                payload: { workflowId: wf.id },
            });

            return wf;
        },
        { requireAuth: true }
    );
}

/** Action: attach task vào 1 node */
export async function attachTask(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { workflowId, nodeKey, taskId } = validate(attachTaskSchema, payload);

            const wfDoc = await Workflow.findById(workflowId).lean();
            assert(wfDoc, 'Workflow không tồn tại', 'NOT_FOUND', 404);

            const project = await Project.findById(wfDoc.project).lean();
            assert(
                await canManageProject(project, uid),
                'Bạn không có quyền quản lý workflow của project này',
                'FORBIDDEN',
                403
            );

            const wf = await repoAttachTask({ workflowId, nodeKey, taskId });

            await revalidateMany([tags.project(wf.project), wfTag(wf.id)].filter(Boolean));
            await logActivity({
                actor: uid,
                project: wf.project,
                type: 'workflow.node.attached',
                payload: { workflowId: wf.id, nodeKey, taskId },
            });

            return wf;
        },
        { requireAuth: true }
    );
}

/** Action: activate workflow */
export async function activate(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { workflowId } = validate(activateSchema, payload);

            const wfDoc = await Workflow.findById(workflowId).lean();
            assert(wfDoc, 'Workflow không tồn tại', 'NOT_FOUND', 404);

            const project = await Project.findById(wfDoc.project).lean();
            assert(
                await canManageProject(project, uid),
                'Bạn không có quyền quản lý workflow của project này',
                'FORBIDDEN',
                403
            );

            const wf = await activateWorkflow(workflowId);

            await revalidateMany([tags.project(wf.project), wfTag(wf.id)].filter(Boolean));
            await logActivity({
                actor: uid,
                project: wf.project,
                type: 'workflow.activated',
                payload: { workflowId: wf.id },
            });

            return wf;
        },
        { requireAuth: true }
    );
}

/** Action: deactivate workflow */
export async function deactivate(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { workflowId } = validate(deactivateSchema, payload);

            const wfDoc = await Workflow.findById(workflowId).lean();
            assert(wfDoc, 'Workflow không tồn tại', 'NOT_FOUND', 404);

            const project = await Project.findById(wfDoc.project).lean();
            assert(
                await canManageProject(project, uid),
                'Bạn không có quyền quản lý workflow của project này',
                'FORBIDDEN',
                403
            );

            const wf = await deactivateWorkflow(workflowId);

            await revalidateMany([tags.project(wf.project), wfTag(wf.id)].filter(Boolean));
            await logActivity({
                actor: uid,
                project: wf.project,
                type: 'workflow.deactivated',
                payload: { workflowId: wf.id },
            });

            return wf;
        },
        { requireAuth: true }
    );
}

/** Action: lấy theo project (member) */
export async function getByProjectAction(payload) {
    await connectDB();
    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;
            const { projectId } = validate(getByProjectSchema, payload);

            const project = await Project.findById(projectId).lean();
            assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);
            assert(
                await canViewProject(project, uid),
                'Bạn không có quyền xem workflow của project này',
                'FORBIDDEN',
                403
            );

            const items = await getByProject(projectId);

            await revalidateMany([tags.project(projectId)].filter(Boolean));
            return items;
        },
        { requireAuth: true }
    );
}
