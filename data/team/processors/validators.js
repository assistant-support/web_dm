// data/team/processors/validators.js
// Tác dụng file: Định nghĩa schema validate (zod) cho Team & Membership và helper validate() ném AppError chuẩn.

import { z } from 'zod';
import { TEAM_ROLE } from '@/model/common/enums.js';
import { AppError } from '@/lib/errors.js';
import AppUser from '@/model/user.model.js';

/** ID team bắt buộc */
export const teamIdSchema = z.string().min(1);

/** Tạo team mới */
export const teamCreateSchema = z.object({
    name: z.string()
        .min(1, 'Tên team là bắt buộc')
        .transform(s => s.trim())
        .pipe(z.string().min(2, 'Tên team phải có ít nhất 2 ký tự').max(120, 'Tên team không được vượt quá 120 ký tự')),
    description: z.string().max(500, 'Mô tả không được vượt quá 500 ký tự').optional(),
});

/** Cập nhật thông tin team */
export const teamUpdateSchema = z.object({
    name: z.string()
        .min(1, 'Tên team là bắt buộc')
        .transform(s => s.trim())
        .pipe(z.string().min(2, 'Tên team phải có ít nhất 2 ký tự').max(120, 'Tên team không được vượt quá 120 ký tự'))
        .optional(),
    description: z.string().max(500, 'Mô tả không được vượt quá 500 ký tự').optional(),
    isActive: z.boolean().optional(), // sẽ bị bỏ qua ở repo.updateTeam; archive dùng hàm riêng
});

/** Thêm thành viên */
export const memberAddSchema = z.object({
    userId: z.string().min(1).transform(async (val) => {
        // Check if userId looks like MongoDB ObjectId (24 hex chars)
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(val);
        
        if (isObjectId) {
            // Try to convert _id to externalUserId
            try {
                const user = await AppUser.findById(val);
                if (user && user.externalUserId) {
                    console.log(`[memberAddSchema] Converting userId from _id (${val}) to externalUserId (${user.externalUserId})`);
                    return user.externalUserId;
                }
            } catch (err) {
                console.error(`[memberAddSchema] Failed to lookup user by _id=${val}:`, err.message);
            }
        }
        
        // Return as-is (already externalUserId or conversion failed)
        return val;
    }),
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

/**
 * Helper validateAsync: parse async bằng zod (cho transform async), nếu lỗi ném AppError.
 * @template T
 * @param {z.ZodSchema<T>} schema
 * @param {unknown} payload
 * @returns {Promise<T>}
 * @throws {AppError}
 */
export async function validateAsync(schema, payload) {
    try {
        return await schema.parseAsync(payload);
    } catch (err) {
        const issues = err?.errors?.map?.((e) => ({
            path: Array.isArray(e.path) ? e.path.join('.') : String(e.path ?? ''),
            message: e.message,
        })) || [];
        throw new AppError('VALIDATION', 'VALIDATION', 400, issues);
    }
}
