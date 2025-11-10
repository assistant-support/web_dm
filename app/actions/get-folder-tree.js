'use server';

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db.js';
import { runAction, assert } from '@/lib/action-utils.js';
import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';
import { canViewProject } from '@/lib/permissions.js';

const DISPLAY_FIELDS = Object.freeze({
    _id: 1,
    name: 1,
});

const TASK_FIELDS = Object.freeze({
    _id: 1,
    title: 1,
    parentTask: 1,
    scope: 1,
});

function normalizeId(id) {
    if (!id) return null;
    return typeof id === 'string' ? id : String(id);
}

function normalizeTask(doc) {
    return {
        id: normalizeId(doc._id),
        title: doc.title || 'Không tên',
        parentTaskId: normalizeId(doc.parentTask),
        scope: doc.scope || null,
    };
}

function buildTree(tasks = []) {
    const nodeMap = new Map();
    const roots = [];

    tasks.forEach((task) => {
        nodeMap.set(task.id, {
            id: task.id,
            title: task.title,
            scope: task.scope,
            children: [],
        });
    });

    tasks.forEach((task) => {
        const parentId = task.parentTaskId;
        const node = nodeMap.get(task.id);
        if (!node) return;
        if (parentId && nodeMap.has(parentId)) {
            nodeMap.get(parentId).children.push(node);
        } else {
            roots.push(node);
        }
    });

    const sortRecursive = (nodes) => {
        nodes.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));
        nodes.forEach((child) => {
            if (Array.isArray(child.children) && child.children.length) {
                sortRecursive(child.children);
            }
        });
    };

    sortRecursive(roots);
    return roots;
}

export async function getFolderTreeAction(projectId) {
    if (!projectId) {
        throw new Error('Thiếu projectId khi lấy cây thư mục.');
    }

    await connectDB();
    const normalizedProjectId = normalizeId(projectId);

    return runAction(
        async ({ user }) => {
            const uid = user.externalUserId;

            const project = await Project.findById(normalizedProjectId)
                .select(DISPLAY_FIELDS)
                .lean();

            assert(project, 'Project không tồn tại', 'NOT_FOUND', 404);
            assert(await canViewProject(project, uid), 'Bạn không có quyền xem project này', 'FORBIDDEN', 403);

            const tasks = await Task.find({
                project: new mongoose.Types.ObjectId(project._id),
                deletedAt: null,
            })
                .select(TASK_FIELDS)
                .lean();

            const normalizedTasks = tasks.map(normalizeTask);
            const tree = buildTree(normalizedTasks);

            return {
                project: {
                    id: normalizeId(project._id),
                    name: project.name || 'Không tên',
                    tasks: tree,
                },
            };
        },
        { requireAuth: true }
    );
}
