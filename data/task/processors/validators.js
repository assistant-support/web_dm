// /data/task/processors/validators.js
// Cấu trúc: /data/task/processors/*
// Mục đích: Khai báo Zod schemas cho Public Board & Claim (B9/B10) + validate()
// - Chuẩn AppError('VALIDATION', { issues }) để UI hiển thị chính xác.

import { z } from 'zod';
import { AppError } from '@/lib/errors.js';
import { formatZodIssues } from '@/lib/action-utils.js';
import { PRIORITY, CLAIM_MODE } from '@/model/common/enums.js';

// ===== Helpers =====
const zPriority = z.nativeEnum(PRIORITY).optional();
const zClaimMode = z.nativeEnum(CLAIM_MODE);

// ===== Schemas =====

/** Tạo public draft task (không thuộc project) */
export const publicCreateDraftSchema = z.object({
    title: z.string().trim().min(1, 'Thiếu tiêu đề'),
    description: z.string().trim().optional().default(''),
    initialPoints: z.number().min(0).optional().default(0),
    priority: zPriority,
    workType: z.string().trim().optional().nullable(),
    platforms: z.array(z.string().trim()).optional().default([]),
    tags: z.array(z.string().trim()).optional().default([]),
    claimMode: zClaimMode, // bắt buộc
    requiredPoints: z.number().min(0).optional().default(0),
    docsEnabled: z.boolean().optional().default(false),
});

/** Publish public task (từ draft public hoặc từ task dự án) */
export const publicPublishSchema = z.object({
    taskId: z.string().trim().min(1, 'Thiếu taskId'),
});

/** Unpublish public task */
export const publicUnpublishSchema = z.object({
    taskId: z.string().trim().min(1, 'Thiếu taskId'),
});

/** Claim public task */
export const publicClaimSchema = z.object({
    taskId: z.string().trim().min(1, 'Thiếu taskId'),
    note: z.string().trim().optional(),
});

/** Manager quyết định claim PENDING */
export const publicDecideClaimSchema = z.object({
    claimId: z.string().trim().min(1, 'Thiếu claimId'),
    accept: z.boolean(),
    note: z.string().trim().optional(),
});

/**
 * Approve completion + split điểm
 * - Theo yêu cầu B9: nhận workerSplitPoints là ARRAY các phần (userId, points)
 * - payouts nhận 'amount' (sẽ map sang 'points' bên repo để hợp với Task model hiện tại)
 */
export const publicApproveCompletionWithSplitSchema = z.object({
    taskId: z.string().trim().min(1, 'Thiếu taskId'),
    totalPoints: z.number().min(0),
    workerSplitPoints: z
        .array(
            z.object({
                userId: z.string().trim().min(1),
                points: z.number().min(0),
            })
        )
        .nonempty('Cần ít nhất một người nhận điểm'),
    payouts: z
        .array(
            z.object({
                userId: z.string().trim().min(1),
                amount: z.number().min(0),
                ref: z.string().trim().optional(),
            })
        )
        .optional(),
});

/** Danh sách public tasks đang mở (open) + filter/sort/paging */
export const publicListOpenSchema = z.object({
    filters: z
        .object({
            priority: z.array(z.nativeEnum(PRIORITY)).optional(),
            workType: z.string().trim().nullable().optional(),
            platforms: z.array(z.string().trim()).optional(),
            tags: z.array(z.string().trim()).optional(),
        })
        .optional(),
    sort: z.enum(['newest', 'points_desc', 'points_asc']).optional().default('newest'),
    limit: z.number().int().min(1).max(50).optional().default(20),
    cursor: z.string().trim().optional(), // ISO createdAt hoặc "ISO|_id"
});

// ===== validate() =====

/** Validate payload theo schema; ném AppError('VALIDATION', { issues }) nếu sai */
export function validate(schema, payload) {
    const res = schema.safeParse(payload);
    if (!res.success) {
        throw new AppError('VALIDATION', { issues: formatZodIssues(res.error.issues) });
    }
    return res.data;
}
