// data/task/processors/validators.js
// Tác dụng file: Định nghĩa Zod schema cho Task (scope=project) + helper validate()
// - Validate payload cho tạo/sửa meta, checklist, subtask, cập nhật “cửa sổ kế hoạch”.

import { z } from 'zod';
import { PRIORITY, TASK_STATUS } from '@/model/common/enums.js';
import { AppError } from '@/lib/errors.js';

// ===== Basic ids =====
export const taskIdSchema = z.string().min(1, 'taskId is required');
export const projectIdSchema = z.string().min(1, 'projectId is required');

// ===== Create (scope=project) =====
export const taskCreateSchema = z.object({
    project: z.string().min(1),
    parentTask: z.string().min(1).optional(),
    title: z.string().min(2).max(300),
    description: z.string().max(5000).optional(),
    priority: z.nativeEnum(PRIORITY).optional(),
    status: z.nativeEnum(TASK_STATUS).optional(), // nếu không truyền, Task model sẽ default draft
    plannedStartAt: z.coerce.date().optional(),
    plannedDueAt: z.coerce.date().optional(),
    assignee: z.string().optional(), // externalUserId
    tags: z.array(z.string()).optional(),
    workType: z.string().optional(),
    platforms: z.array(z.string()).optional(),
    approvalRequired: z.boolean().optional(),
});

// ===== Update meta cho phép sửa =====
export const taskUpdateMetaSchema = z.object({
    title: z.string().min(2).max(300).optional(),
    description: z.string().max(5000).optional(),
    priority: z.nativeEnum(PRIORITY).optional(),
    tags: z.array(z.string()).optional(),
    workType: z.string().nullable().optional(),
    platforms: z.array(z.string()).optional(),
});

// ===== Checklist =====
export const toggleChecklistSchema = z.object({
    taskId: z.string().min(1),
    cid: z.string().min(1),
    content: z.string().max(1000).optional(),
    done: z.boolean().optional(),
});

// ===== Subtask =====
export const addSubtaskSchema = z.object({
    parentTask: z.string().min(1),
    title: z.string().min(2).max(300),
    priority: z.nativeEnum(PRIORITY).optional(),
    assignee: z.string().optional(),
});

// ===== Plan window =====
export const setPlanWindowSchema = z
    .object({
        taskId: z.string().min(1),
        start: z.coerce.date().nullable().optional(),
        due: z.coerce.date().nullable().optional(),
    })
    .refine(
        (v) => {
            const s = v.start ?? null;
            const d = v.due ?? null;
            if (s && d) return s.getTime() <= d.getTime();
            return true;
        },
        { message: 'start must be <= due' }
    );

// ===== Helper validate (ném AppError với issues) =====
/**
 * @param {z.ZodSchema} schema
 * @param {any} payload
 * @returns any parsed value
 * @throws AppError('VALIDATION')
 */
export function validate(schema, payload) {
    try {
        return schema.parse(payload);
    } catch (err) {
        const issues =
            err?.errors?.map((e) => ({
                path: Array.isArray(e.path) ? e.path.join('.') : '',
                message: e.message,
            })) || [];
        throw new AppError('VALIDATION', 'VALIDATION', 400, issues);
    }
}
