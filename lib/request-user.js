// lib/request-user.js
// Tác dụng file: Chuẩn hoá "user hiện tại" cho server actions.
// - Ưu tiên: Proxy headers (x-user-*) → NextAuth session.auth() → DEV_FAKE_USER → nulls.
// - Next 15+: trong Server Actions, `headers()` cần **await** trước khi sử dụng.
// - Tối ưu: Cache user info trong request scope và runtime cache để tránh query DB lặp lại.

'use server';

import { headers } from 'next/headers';
import { auth as nextAuth } from '@/auth.js';
import { cache } from 'react';
import { getRuntimeCache, setRuntimeCache } from './runtime-cache.js';

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
 * Lấy role từ database với cache (30 giây)
 * @param {string} userId - User ID
 * @param {string} email - User email (fallback)
 * @returns {Promise<string>} User role
 */
async function getUserRoleFromDB(userId, email) {
    // Kiểm tra runtime cache trước
    const cacheKey = `user-role:${userId || email}`;
    const cachedRole = getRuntimeCache(cacheKey);
    if (cachedRole) {
        return cachedRole;
    }

    try {
        const { connectDB } = await import('./db');
        const User = (await import('../model/user.model')).default;
        await connectDB();
        
        // Tìm user trong database để lấy role chính xác
        const dbUser = await User.findOne({
            $or: [
                { oauthSub: userId },
                { externalUserId: userId },
                { email: email }
            ]
        }).select('role').lean();
        
        const role = dbUser?.role || 'member';
        
        // Cache role trong 30 giây
        setRuntimeCache(cacheKey, role, 30_000);
        
        return role;
    } catch (dbError) {
        console.warn('[getUserRoleFromDB] Không thể query DB:', dbError.message);
        return 'member'; // Default role
    }
}

/**
 * Lấy thông tin người dùng hiện tại cho server (actions/route).
 * Sử dụng React cache() để deduplicate trong cùng request.
 * Luôn trả object { externalUserId, email, name, avatar, role } và KHÔNG throw.
 */
const getCurrentUserCached = cache(async () => {
    // 1) Proxy headers (Auth 2.0 qua gateway / middleware tự gắn)
    const h = await headers(); // <<-- quan trọng: cần await trong Server Action
    const externalUserId = getHeaderSafe(h, 'x-user-id');
    const email = getHeaderSafe(h, 'x-user-email');
    const name = getHeaderSafe(h, 'x-user-name');
    const avatar = getHeaderSafe(h, 'x-user-avatar');
    const role = getHeaderSafe(h, 'x-user-role');

    if (externalUserId || email || name || avatar) {
        return { 
            externalUserId: externalUserId ?? null, 
            email, 
            name, 
            avatar,
            role: role || 'member' 
        };
    }

    // 2) NextAuth session (OAuth/OpenID)
    try {
        const session = await nextAuth?.();
        const u = session?.user;
        
        if (u) {
            const id = u.id || u.sub || u.email || null;
            
            // Lấy role từ database với cache
            const userRole = await getUserRoleFromDB(id, u.email);
            
            const userInfo = {
                externalUserId: id,
                email: u.email ?? null,
                name: u.name ?? null,
                avatar: u.image ?? null,
                role: userRole,
            };
            
            return userInfo;
        }
    } catch (error) {
        console.warn('[getCurrentUser] Lỗi khi lấy từ NextAuth:', error.message);
    }
    return { externalUserId: null, email: null, name: null, avatar: null, role: 'member' };
});

/**
 * Public API - Wrapper để có thể thêm logic sau này
 */
export async function getCurrentUser() {
    return await getCurrentUserCached();
}

// Alias export for backward compatibility
export const getRequestUser = getCurrentUser;
