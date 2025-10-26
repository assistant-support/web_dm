// data/project/processors/validators.js
// Tác dụng file: Khai báo Zod schemas cho Project (CRUD + membership) và helper validate() ném AppError chuẩn.

import { z } from 'zod';
import { PROJECT_ROLE, PRIORITY } from '@/model/common/enums.js';
import { AppError } from '@/lib/errors.js';

/** ID project hợp lệ */
export const projectIdSchema = z.string().min(1);
/** ID team hợp lệ */
export const teamIdSchema = z.string().min(1);

/** Schema tạo Project */
export const projectCreateSchema = z.object({
    team: z.string().min(1).optional(), // Team là optional - dự án có thể độc lập
    name: z.string().min(2).max(160),
    code: z.string().max(40).optional(),
    description: z.string().max(1000).optional(),
    priority: z.nativeEnum(PRIORITY).optional(),
    startDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    driveParentId: z.string().optional(), // override root nếu cần

    // danh mục/nhãn
    platforms: z.array(z.string()).optional(),
    workTypes: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
});

/** Schema cập nhật Project */
export const projectUpdateSchema = z.object({
    name: z.string().min(2).max(160).optional(),
    code: z.string().max(40).optional(),
    description: z.string().max(1000).optional(),
    priority: z.nativeEnum(PRIORITY).optional(),
    startDate: z.coerce.date().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    isActive: z.boolean().optional(), // repo sẽ bỏ qua; archive dùng hàm riêng

    // cấu hình/nhãn
    tags: z.array(z.string()).optional(),
    statuses: z.array(z.string()).optional(),
    platforms: z.array(z.string()).optional(),
    workTypes: z.array(z.string()).optional(),
});

/** Thêm thành viên Project */
export const memberAddSchema = z.object({
    userId: z.string().min(1),
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
 * Helper validate: parse bằng zod; nếu lỗi -> ném AppError chuẩn.
 * @template T
 * @param {z.ZodSchema<T>} schema
 * @param {unknown} payload
 * @returns {T}
 * @throws {AppError}
 */
export function validate(schema, payload) {
    try {
        console.log('[validator] Validating payload:', JSON.stringify(payload, null, 2));
        const result = schema.parse(payload);
        console.log('[validator] Validation SUCCESS');
        return result;
    } catch (err) {
        console.error('[validator] Validation FAILED:', err);
        const issues =
            err?.errors?.map?.((e) => ({
                path: Array.isArray(e.path) ? e.path.join('.') : String(e.path ?? ''),
                message: e.message,
            })) ?? [];
        console.error('[validator] Issues:', issues);
        throw new AppError('VALIDATION', 'VALIDATION', 400, issues);
    }
}
