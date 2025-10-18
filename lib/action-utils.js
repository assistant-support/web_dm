// lib/action-utils.js
// Tác dụng file: Tiện ích chuẩn hoá cho Server Actions (Next 15) + assert/requireAuth/revalidate helpers.
// Lưu ý sử dụng: Mỗi action nên là `export async function actionName(...) { 'use server'; return runAction(...) }` để an toàn HMR.

import { revalidateTag } from 'next/cache';
import { ok, err, AppError, toErr } from '@/lib/errors.js';
import { getCurrentUser } from '@/lib/request-user.js';

/**
 * Ném AppError khi điều kiện sai.
 * @param {any} cond
 * @param {string} message
 * @param {string} [code='BAD_REQUEST']
 * @param {number} [status=400]
 */
export function assert(cond, message, code = 'BAD_REQUEST', status = 400) {
    if (!cond) throw new AppError(message || 'BAD_REQUEST', code, status);
}

/**
 * Yêu cầu đăng nhập (externalUserId).
 * @param {{externalUserId?:string}|null} user
 * @returns {{externalUserId:string}}
 */
export function requireAuth(user) {
    if (!user || !user.externalUserId) {
        throw new AppError('UNAUTHORIZED', 'UNAUTHORIZED', 401);
    }
    return user;
}

/**
 * Gọi revalidateTag tuần tự, nuốt lỗi để không vỡ luồng.
 * @param {string[]} tags
 */
export async function revalidateMany(tags = []) {
    for (const t of tags) {
        if (!t) continue;
        try {
            await revalidateTag(t);
        } catch (e) {
            console.warn('[revalidateMany] skip tag:', t, e?.message || e);
        }
    }
}

/**
 * Chuẩn hoá zod issues -> [{field,message}]
 * @param {Array<{path?:any[], message:string}>} issues
 */
export function formatZodIssues(issues) {
    if (!Array.isArray(issues)) return [];
    return issues.map((i) => ({
        field: Array.isArray(i.path) ? i.path.join('.') : '',
        message: i.message,
    }));
}

/**
 * Chạy logic action với chuẩn hoá ok/err + inject user + side-effects.
 * LƯU Ý: Đây KHÔNG PHẢI server action. Hãy gọi NÓ BÊN TRONG một async function có 'use server'.
 *
 * @template T
 * @param {(ctx:{user:any}, ...args:any[])=>Promise<T>|T} fn
 * @param {{ requireAuth?: boolean, logActivity?: Function, revalidate?: string[] }} [opts]
 * @param  {...any} args
 * @returns {Promise<{ok:true, data:T}|{ok:false, message:string, code?:string, status?:number, issues?:any[]}>}
 */
export async function runAction(
    fn,
    { requireAuth: mustAuth = true, logActivity, revalidate = [] } = {},
    ...args
) {
    try {
        const user = await getCurrentUser();
        if (mustAuth) requireAuth(user);

        const result = await fn({ user }, ...args);

        if (Array.isArray(revalidate) && revalidate.length) {
            await revalidateMany(revalidate);
        }
        if (typeof logActivity === 'function') {
            try {
                await logActivity();
            } catch (e) {
                console.warn('[runAction:logActivity] warn:', e?.message || e);
            }
        }

        if (result && typeof result === 'object' && 'ok' in result) return result;
        return ok(result);
    } catch (e) {
        if (e instanceof AppError) {
            return err(e.message, { code: e.code, status: e.status, issues: e.issues });
        }
        return toErr?.(e) ?? err(e?.message || 'ERROR');
    }
}

// KHÔNG export withAction để tránh nhầm dùng, giảm rủi ro HMR/$$id.
