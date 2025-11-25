// data/project/processors/validators.js
// Tác dụng file: Khai báo Zod schemas cho Project (CRUD + membership) và helper validate() ném AppError chuẩn.

import { z } from 'zod';
import { PROJECT_ROLE, PRIORITY } from '@/model/common/enums.js';
import { AppError } from '@/lib/errors.js';
import AppUser from '@/model/user.model.js';

/** ID project hợp lệ */
export const projectIdSchema = z.string().min(1);
/** ID team hợp lệ */
export const teamIdSchema = z.string().min(1);

/** Schema tạo Project */
export const projectCreateSchema = z.object({
    team: z.string().min(1).optional().or(z.literal('')),
    name: z.string().min(2, 'Tên dự án phải có ít nhất 2 ký tự').max(160, 'Tên dự án không quá 160 ký tự'),
    description: z.string().max(1000, 'Mô tả không quá 1000 ký tự').optional().or(z.literal('')),
    priority: z.nativeEnum(PRIORITY).optional(),
    startDate: z.coerce.date().optional().nullable(),
    dueDate: z.coerce.date().optional().nullable(),

    platforms: z.array(z.string().min(1)).optional(),
    workTypes: z.array(z.string().min(1)).optional(),
    tags: z.array(z.string().min(1)).optional(),
});

/** Schema cập nhật Project */
export const projectUpdateSchema = z.object({
    name: z.string().min(2).max(160).optional(),
    description: z.string().max(1000).optional().nullable(), // Cho phép xóa mô tả
    priority: z.nativeEnum(PRIORITY).optional().nullable(), // Cho phép xóa priority
    startDate: z.coerce.date().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    isActive: z.boolean().optional(), // repo sẽ bỏ qua

    tags: z.array(z.string().min(1)).optional(),
    statuses: z.array(z.string().min(1)).optional(),
    platforms: z.array(z.string().min(1)).optional(),
    workTypes: z.array(z.string().min(1)).optional(),
});

/** Thêm thành viên Project */
export const memberAddSchema = z.object({
    userId: z.string().min(1).transform(async (val) => {
        // Check if userId looks like MongoDB ObjectId (24 hex chars)
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(val);
        
        if (isObjectId) {
            // Try to convert _id to externalUserId
            try {
                const user = await AppUser.findById(val);
                if (user && user.externalUserId) {
                    return user.externalUserId;
                }
            } catch (err) {
                console.error(`[Project memberAddSchema] Failed to lookup user by _id=${val}:`, err.message);
            }
        }
        
        // Return as-is (already externalUserId or conversion failed)
        return val;
    }),
    role: z.nativeEnum(PROJECT_ROLE).default(PROJECT_ROLE.MEMBER),
});

/** Bỏ thành viên Project */
export const memberRemoveSchema = z.object({
    userId: z.string().min(1),
});

/** Đổi role thành viên Project */
export const memberChangeRoleSchema = z.object({
    userId: z.string().min(1),
    role: z.nativeEnum(PROJECT_ROLE),
});

/**
 * Helper validate
 */
export function validate(schema, payload) {
    try {
        return schema.parse(payload);
    } catch (err) {
        const issues =
            err?.errors?.map?.((e) => ({
                path: Array.isArray(e.path) ? e.path.join('.') : String(e.path ?? ''),
                message: e.message,
            })) ?? [];
        throw new AppError('VALIDATION', 'VALIDATION', 400, issues);
    }
}

/**
 * Helper validateAsync - for schemas with async transforms
 */
export async function validateAsync(schema, payload) {
    try {
        return await schema.parseAsync(payload);
    } catch (err) {
        const issues =
            err?.errors?.map?.((e) => ({
                path: Array.isArray(e.path) ? e.path.join('.') : String(e.path ?? ''),
                message: e.message,
            })) ?? [];
        throw new AppError('VALIDATION', 'VALIDATION', 400, issues);
    }
}
