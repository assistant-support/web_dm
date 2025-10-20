// /data/workflow/processors/validators.js
// Cấu trúc: /data/workflow/processors/*
// Mục đích: Định nghĩa Zod schemas cho Workflow + hàm validate chuẩn hoá lỗi.
// Lưu ý: Throw AppError('VALIDATION', { issues }) để UI hiển thị lỗi đúng chuẩn.

import { z } from 'zod';
import { AppError } from '@/lib/errors.js';
import { formatZodIssues } from '@/lib/action-utils.js';

// ====== Shared fields ======
const id = z.string().min(1, 'id không hợp lệ');
const nodeKey = z.string().min(1, 'node.key không hợp lệ');

const nodeSchema = z.object({
    key: nodeKey,
    title: z.string().min(1, 'title bắt buộc'),
    type: z.enum(['task', 'gate'], { required_error: 'type bắt buộc' }),
    taskId: z.string().min(1).nullable().optional(),
    status: z.enum(['locked', 'unlocked', 'completed']).optional(),
    meta: z.record(z.any()).optional(),
});

const edgeSchema = z.object({
    from: nodeKey,
    to: nodeKey,
    rule: z.enum(['BLOCKER', 'SOFT'], { required_error: 'rule bắt buộc' }),
});

// ====== Schemas ======
export const workflowCreateSchema = z.object({
    projectId: id,
    name: z.string().min(1, 'name bắt buộc'),
    description: z.string().optional(),
    nodes: z.array(nodeSchema).min(1, 'Cần ít nhất 1 node'),
    edges: z.array(edgeSchema).optional().default([]),
    active: z.boolean().optional().default(false),
});

export const workflowUpdateSchema = z.object({
    workflowId: id,
    patch: z
        .object({
            name: z.string().min(1).optional(),
            description: z.string().optional(),
            nodes: z.array(nodeSchema).optional(),
            edges: z.array(edgeSchema).optional(),
            active: z.boolean().optional(),
        })
        .refine((p) => Object.keys(p).length > 0, 'patch trống'),
});

export const attachTaskSchema = z.object({
    workflowId: id,
    nodeKey,
    taskId: id,
});

export const activateSchema = z.object({ workflowId: id });
export const deactivateSchema = z.object({ workflowId: id });
export const getByProjectSchema = z.object({ projectId: id });

/**
 * validate(schema, payload)
 * - safe-parse & ném AppError('VALIDATION', { issues }) nếu sai
 */
export function validate(schema, payload) {
    const res = schema.safeParse(payload);
    if (!res.success) {
        throw new AppError('VALIDATION', { issues: formatZodIssues(res.error.issues) });
    }
    return res.data;
}
