// data/team/processors/validators.js
// Tác dụng file: Định nghĩa schema validate (zod) cho Team & Membership và helper validate() ném AppError chuẩn.

import { z } from 'zod';
import { TEAM_ROLE } from '@/model/common/enums.js';
import { AppError } from '@/lib/errors.js';

/** ID team bắt buộc */
export const teamIdSchema = z.string().min(1);

/** Tạo team mới */
export const teamCreateSchema = z.object({
    name: z.string().min(2).max(120),
    description: z.string().max(500).optional(),
});

/** Cập nhật thông tin team */
export const teamUpdateSchema = z.object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional(), // sẽ bị bỏ qua ở repo.updateTeam; archive dùng hàm riêng
});

/** Thêm thành viên */
export const memberAddSchema = z.object({
    userId: z.string().min(1),
    role: z.enum([TEAM_ROLE.MANAGER, TEAM_ROLE.MEMBER]).default(TEAM_ROLE.MEMBER),
});

/** Bỏ thành viên */
export const memberRemoveSchema = z.object({
    userId: z.string().min(1),
});

/** Đổi role thành viên */
export const memberChangeRoleSchema = z.object({
    userId: z.string().min(1),
    role: z.enum([TEAM_ROLE.MANAGER, TEAM_ROLE.MEMBER]),
});

/**
 * Helper validate: parse bằng zod, nếu lỗi ném AppError chuẩn hoá.
 * @template T
 * @param {z.ZodSchema<T>} schema
 * @param {unknown} payload
 * @returns {T}
 * @throws {AppError}
 */
export function validate(schema, payload) {
    try {
        return schema.parse(payload);
    } catch (err) {
        const issues = err?.errors?.map?.((e) => ({
            path: Array.isArray(e.path) ? e.path.join('.') : String(e.path ?? ''),
            message: e.message,
        })) || [];
        // message='VALIDATION', code='VALIDATION', status=400
        throw new AppError('VALIDATION', 'VALIDATION', 400, issues);
    }
}
