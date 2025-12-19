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
            assert(project, 'Dự án không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);
            assert(
                await canManageProject(project, user),
                'Bạn không có quyền quản lý quy trình làm việc của dự án này.',
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
            assert(wfDoc, 'Quy trình làm việc không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);

            const project = await Project.findById(wfDoc.project).lean();
            assert(
                await canManageProject(project, user),
                'Bạn không có quyền quản lý quy trình làm việc của dự án này.',
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
            assert(wfDoc, 'Quy trình làm việc không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);

            const project = await Project.findById(wfDoc.project).lean();
            assert(
                await canManageProject(project, user),
                'Bạn không có quyền quản lý quy trình làm việc của dự án này.',
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
            assert(wfDoc, 'Quy trình làm việc không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);

            const project = await Project.findById(wfDoc.project).lean();
            assert(
                await canManageProject(project, user),
                'Bạn không có quyền quản lý quy trình làm việc của dự án này.',
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
            assert(wfDoc, 'Quy trình làm việc không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);

            const project = await Project.findById(wfDoc.project).lean();
            assert(
                await canManageProject(project, user),
                'Bạn không có quyền quản lý quy trình làm việc của dự án này.',
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
            assert(project, 'Dự án không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);
            assert(
                await canViewProject(project, user),
                'Bạn không có quyền xem quy trình làm việc của dự án này.',
                'FORBIDDEN',
                403
            );

            const items = await getByProject(projectId);

            await revalidateMany([tags.project(projectId)].filter(Boolean));
            // Serialize để tránh lỗi MongoDB ObjectId
            return JSON.parse(JSON.stringify(items));
        },
        { requireAuth: true }
    );
}

/**
 * ACTION: Tạo workflow cho parent task
 * Chỉ Project Manager hoặc người tạo task mới được tạo workflow
 */
export async function createTaskWorkflow(parentTaskId, { name, nodes, edges }) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        const Task = (await import('@/model/task.model.js')).default;
        
        // Fetch task và populate project với members để kiểm tra quyền
        const task = await Task.findById(parentTaskId)
            .populate({
                path: 'project',
                select: '_id name members',
            })
            .lean();
        assert(task, 'Công việc không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);
        
        const project = task.project;
        assert(project, 'Dự án của công việc không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);
        
        // Kiểm tra quyền: Phải là Project Manager hoặc người tạo task
        const canCreate = canManageProject(project, user) || String(task.createdBy) === String(uid);
        assert(
            canCreate,
            'Chỉ quản lý dự án hoặc người tạo công việc mới có quyền tạo quy trình làm việc.',
            'FORBIDDEN',
            403
        );
        
        // Check if workflow already exists
        if (task.workflowId) {
            const existing = await Workflow.findById(task.workflowId);
            if (existing) {
                existing.name = name || existing.name;
                existing.nodes = nodes;
                existing.edges = edges;
                existing.version = (existing.version || 1) + 1;
                await existing.save();
                
                await logActivity({
                    actor: uid,
                    project: task.project,
                    task: task._id,
                    type: 'workflow.updated',
                    payload: { workflowId: String(existing._id) },
                });
                
                await revalidateMany([tags.task(parentTaskId), wfTag(existing._id)]);
                return JSON.parse(JSON.stringify(existing.toObject()));
            }
        }
        
        const workflow = await Workflow.create({
            parentTask: parentTaskId,
            project: task.project,
            name: name || 'Workflow',
            nodes,
            edges,
            version: 1,
            isActive: true,
        });
        
        task.workflowId = workflow._id;
        await task.save();
        
        await logActivity({
            actor: uid,
            project: task.project,
            task: task._id,
            type: 'workflow.created',
            payload: { workflowId: String(workflow._id) },
        });
        
        await revalidateMany([tags.task(parentTaskId), wfTag(workflow._id)]);
        return JSON.parse(JSON.stringify(workflow.toObject()));
    }, { requireAuth: true });
}

/**
 * ACTION: Get workflow của task
 */
export async function getTaskWorkflow(taskId) {
    await connectDB();
    return runAction(async () => {
        const Task = (await import('@/model/task.model.js')).default;
        const task = await Task.findById(taskId).lean();
        assert(task, 'Công việc không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);
        
        if (!task.workflowId) return null;
        
        const workflow = await Workflow.findById(task.workflowId).lean();
        if (!workflow) return null;
        
        return JSON.parse(JSON.stringify(workflow));
    }, { requireAuth: true });
}

/**
 * Helper: Update workflow node status
 * Được gọi từ approval actions
 */
export async function updateWorkflowNodeStatus(workflowId, nodeKey, status) {
    await connectDB();
    
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) return null;
    
    const node = workflow.nodes.find(n => n.key === nodeKey);
    if (!node) return workflow;
    
    node.status = status;
    if (status === 'completed') {
        node.completedAt = new Date();
    }
    
    await workflow.save();
    return workflow;
}

/**
 * ACTION: Update node status manually
 */
export async function updateNodeStatus(workflowId, nodeKey, status) {
    await connectDB();
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        const Task = (await import('@/model/task.model.js')).default;
        
        const workflow = await Workflow.findById(workflowId);
        assert(workflow, 'Quy trình làm việc không tồn tại hoặc đã bị xóa.', 'NOT_FOUND', 404);
        
        if (workflow.parentTask) {
            const task = await Task.findById(workflow.parentTask);
            // Allow assignee OR admin
            const isAssignee = task?.assignee === uid;
            const isAdmin = user.role === 'admin';
            assert(isAssignee || isAdmin, 'Bạn không có quyền cập nhật quy trình làm việc này.', 'FORBIDDEN', 403);
        }
        
        const updated = await updateWorkflowNodeStatus(workflowId, nodeKey, status);
        
        await logActivity({
            actor: uid,
            project: workflow.project,
            task: workflow.parentTask,
            type: 'workflow.node.updated',
            payload: { workflowId, nodeKey, status },
        });
        
        await revalidateMany([tags.task(workflow.parentTask), wfTag(workflowId)].filter(Boolean));
        return JSON.parse(JSON.stringify(updated.toObject()));
    }, { requireAuth: true });
}
