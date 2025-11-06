// lib/request-user.js
// Tác dụng file: Chuẩn hoá “user hiện tại” cho server actions.
// - Ưu tiên: Proxy headers (x-user-*) → NextAuth session.auth() → DEV_FAKE_USER → nulls.
// - Next 15+: trong Server Actions, `headers()` cần **await** trước khi sử dụng.

'use server';

import { headers } from 'next/headers';
import { auth as nextAuth } from '@/auth.js';

/** Đọc 1 header (case-insensitive) từ ReadonlyHeaders đã được await. */
function getHeaderSafe(h, name) {
    try {
        const v = h?.get?.(name);
        return v == null ? null : v;
    } catch {
        return null;
    }
}

/**
 * Lấy thông tin người dùng hiện tại cho server (actions/route).
 * Luôn trả object { externalUserId, email, name, avatar } và KHÔNG throw.
 */
export async function getCurrentUser() {
    // 1) Proxy headers (Auth 2.0 qua gateway / middleware tự gắn)
    const h = await headers(); // <<-- quan trọng: cần await trong Server Action
    const externalUserId = getHeaderSafe(h, 'x-user-id');
    const email = getHeaderSafe(h, 'x-user-email');
    const name = getHeaderSafe(h, 'x-user-name');
    const avatar = getHeaderSafe(h, 'x-user-avatar');

    if (externalUserId || email || name || avatar) {
        return { externalUserId: externalUserId ?? null, email, name, avatar };
    }

    // 2) NextAuth session (OAuth/OpenID)
    try {
        const session = await nextAuth?.();
        const u = session?.user;
        if (u) {
            const id = u.id || u.sub || u.email || null;
            return {
                externalUserId: id,
                email: u.email ?? null,
                name: u.name ?? null,
                avatar: u.image ?? null,
            };
        }
    } catch {
        // Nuốt lỗi để không chặn luồng nếu NextAuth chưa cấu hình
    }
    return { externalUserId: null, email: null, name: null, avatar: null };
}

// Alias export for backward compatibility
export const getRequestUser = getCurrentUser;
