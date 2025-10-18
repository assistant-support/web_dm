// data/task/processors/repo.js
// Tác dụng file: Repository cho Task (scope=project) – thao tác Mongoose thuần (không check quyền).
// - CRUD tạo task/subtask, cập nhật meta, checklist, plan window.
// - [B6-Fix] Chuẩn hoá getById() trả về doc bằng .exec().

import Task from '@/model/task.model.js';
import Project from '@/model/project.model.js'; // (import sẵn nếu muốn verify project tồn tại ở các bước khác)
import { TASK_SCOPE, TASK_STATUS } from '@/model/common/enums.js';
import { normalizeMeta, toggleChecklist as toggleList, sanitizeTitle } from './compute.js';

/** Lấy task theo id. [B6-Fix] Chuẩn hoá .exec() */
export async function getById(taskId, { lean = true } = {}) {
    const q = Task.findById(taskId);
    return lean ? q.lean().exec() : q.exec();
}

/** Tạo Task nội bộ dự án (scope='project'). */
export async function createTask(payload, creatorUserId) {
    const doc = await Task.create({
        scope: TASK_SCOPE.PROJECT,
        project: payload.project,
        parentTask: payload.parentTask || null,
        title: sanitizeTitle(payload.title),
        description: payload.description || '',
        createdBy: creatorUserId,
        assignee: payload.assignee || undefined,
        priority: payload.priority,
        status: payload.status || TASK_STATUS.DRAFT,
        plannedStartAt: payload.plannedStartAt,
        plannedDueAt: payload.plannedDueAt,
        tags: payload.tags || [],
        workType: payload.workType || undefined,
        platforms: payload.platforms || [],
        approval: {
            required: !!payload.approvalRequired,
        },
    });
    return doc.toObject();
}

/** Cập nhật meta cho phép sửa. */
export async function updateMeta(taskId, patch) {
    const doc = await Task.findById(taskId);
    if (!doc) return null;

    const data = normalizeMeta(patch);
    for (const [k, v] of Object.entries(data)) {
        doc[k] = v;
    }
    await doc.save();
    return doc.toObject();
}

/** Toggle/cập nhật checklist item. */
export async function toggleChecklist(taskId, payload) {
    const doc = await Task.findById(taskId);
    if (!doc) return null;
    const current = Array.isArray(doc.checklist) ? doc.checklist : [];
    doc.checklist = toggleList(current, payload);
    await doc.save();
    return doc.toObject();
}

/** Thêm subtask (cùng project với parent). */
export async function addSubtask(parentTaskId, { title, priority, assignee }, creatorUserId) {
    const parent = await Task.findById(parentTaskId).lean().exec();
    if (!parent) return null;

    const sub = await Task.create({
        scope: TASK_SCOPE.PROJECT,
        project: parent.project,
        parentTask: parentTaskId,
        title: sanitizeTitle(title),
        description: '',
        createdBy: creatorUserId,
        assignee: assignee || undefined,
        priority: priority || parent.priority,
        status: TASK_STATUS.DRAFT,
        tags: [],
        approval: { required: false },
    });

    return sub.toObject();
}

/** Cập nhật “cửa sổ kế hoạch” (start/due). */
export async function setPlanWindow(taskId, { start, due }) {
    const doc = await Task.findById(taskId);
    if (!doc) return null;
    doc.plannedStartAt = start ?? null;
    doc.plannedDueAt = due ?? null;
    await doc.save();
    return doc.toObject();
}
