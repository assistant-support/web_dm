// /data/comment/processors/validators.js
// Cấu trúc: /data/comment/processors/*
// Mục đích: Khai báo Zod schemas cho Comments (task-only) và helper validate()
// - Chuẩn AppError('VALIDATION', { issues }) để UI hiển thị chính xác.

import { z } from 'zod';
import { AppError } from '@/lib/errors.js';
import { formatZodIssues } from '@/lib/action-utils.js';

/** Schema: tạo comment task-only */
export const commentCreateSchema = z.object({
    taskId: z.string().trim().min(1, 'Thiếu taskId'),
    body: z.string().trim().min(1, 'Nội dung trống').max(10_000, 'Nội dung quá dài'),
});

/** Schema: phân trang comment theo task (desc), beforeId dựa trên createdAt */
export const commentListByTaskSchema = z.object({
    taskId: z.string().trim().min(1, 'Thiếu taskId'),
    limit: z.number().int().min(1).max(100).optional().default(30),
    beforeId: z.string().trim().optional(),
});

/** Schema: xoá (hard-delete) comment */
export const commentDeleteSchema = z.object({
    commentId: z.string().trim().min(1, 'Thiếu commentId'),
});

/** Validate payload theo schema; ném AppError('VALIDATION', { issues }) nếu sai */
export function validate(schema, payload) {
    const res = schema.safeParse(payload);
    if (!res.success) {
        throw new AppError('VALIDATION', { issues: formatZodIssues(res.error.issues) });
    }
    return res.data;
}
