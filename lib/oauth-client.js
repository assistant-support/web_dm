// lib/oauth-client.js
import { unstable_cache } from 'next/cache';

/**
 * OAuth 2.0 Client Helper
 * Giúp lấy thông tin user từ Authorization Server (web 3000)
 */

/**
 * Lấy thông tin user từ Authorization Server (không cache)
 * @param {string} token - Access token từ session
 * @returns {Promise<Object>} User info
 */
async function fetchUserInfoFromServer(token) {
    if (!token) {
        throw new Error('Token không được cung cấp');
    }

    try {
        const response = await fetch('https://myaccount.s4h.edu.vn/api/oauth/userinfo', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error_description || `HTTP ${response.status}`);
        }

        const userInfo = await response.json();
        return userInfo;
    } catch (error) {
        console.error('❌ Lỗi khi lấy user info:', error);
        throw error;
    }
}

/**
 * Lấy thông tin user từ Authorization Server với cache 1 phút
 * @param {string} token - Access token từ session
 * @param {string} userId - User ID để làm cache key
 * @returns {Promise<Object>} User info (cached)
 */
export async function fetchUserInfo(token, userId) {
    if (!token || !userId) {
        throw new Error('Token và userId không được cung cấp');
    }
    const getCachedUserInfo = unstable_cache(
        async (accessToken) => fetchUserInfoFromServer(accessToken),
        [`user-info-${userId}`],
        {
            revalidate: 60,
            tags: [`user-${userId}`], // Tag để có thể invalidate
        }
    );

    return getCachedUserInfo(token);
}

/**
 * Kiểm tra và làm mới token nếu cần
 * @param {Object} session - NextAuth session
 * @returns {Promise<Object>} Updated session
 */
export async function refreshTokenIfNeeded(session) {
    // Kiểm tra xem token có sắp hết hạn không (còn < 5 phút)
    if (session.expiresAt && Date.now() < session.expiresAt - 5 * 60 * 1000) {
        return session; // Token vẫn còn hạn
    }
    return session;
}

/**
 * Sync user info từ Authorization Server vào local DB
 * @param {Object} userInfo - User info từ /userinfo endpoint hoặc session
 * @param {string} userInfo.sub - User ID từ OAuth
 * @param {string} userInfo.email - Email
 * @param {string} userInfo.name - Full name
 * @returns {Promise<Object>} Local user record
 */
export async function syncUserToLocalDB(userInfo) {
    const { connectDB } = await import('./db');
    const User = (await import('../model/user.model')).default;
    await connectDB();
    const userId = userInfo.sub
    let user = await User.findOne({
        $or: [
            { oauthSub: userId },
            { externalUserId: userId }
        ]
    });

    if (!user) {
        const nameParts = (userInfo.name || '').trim().split(' ');
        user = await User.create({
            externalUserId: userId,
            oauthSub: userId,
            email: userInfo.email,
            name: userInfo.name,
            avatar: userInfo.avt,
            role: 'member',
            isActive: true,
        });
    } else {
        // Cập nhật thông tin nếu có thay đổi
        const nameParts = (userInfo.name || '').trim().split(' ');
        const firstName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : '';
        const lastName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';

        const needsUpdate =
            user.email !== userInfo.email ||
            user.name !== userInfo.name ||
            (userInfo.picture && user.avatar !== userInfo.picture);

        if (needsUpdate) {
            user.email = userInfo.email;
            user.name = userInfo.name || userInfo.email;
            user.firstName = userInfo.given_name || firstName;
            user.lastName = userInfo.family_name || lastName;
            // Luôn update avatar từ OAuth nếu có
            if (userInfo.picture) {
                user.avatar = userInfo.picture;
            }
            await user.save();
        }

        // Đảm bảo cả 2 field đều có giá trị
        if (!user.oauthSub) {
            user.oauthSub = userId;
            await user.save();
        }
        if (!user.externalUserId) {
            user.externalUserId = userId;
            await user.save();
        }
    }

    return user;
}

/**
 * Get current user từ session và fetch data từ Authorization Server
 * @param {Object} session - NextAuth session
 * @param {Object} session.user - User object {id, name, email}
 * @param {string} session.accessToken - Access token từ OAuth
 * @returns {Promise<Object>} Complete user object
 */
export async function getCurrentUserWithSync(session) {
    if (!session?.user) {
        return null;
    }

    try {
        const userInfo = {
            sub: session.user.id,
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
        };

        // Fetch thông tin đầy đủ từ Authorization Server (cached 1 phút)
        if (session.accessToken) {
            try {
                const serverUserInfo = await fetchUserInfo(session.accessToken, session.user.id);
                Object.assign(userInfo, serverUserInfo);
            } catch (error) {
            }
        } else {
        }

        // Sync vào local database
        const localUser = await syncUserToLocalDB(userInfo);
        // Trả về combined object
        return {
            ...localUser.toObject(),
            oauth: userInfo, // Thông tin gốc từ OAuth
        };
    } catch (error) {
        console.error('❌ Lỗi getCurrentUserWithSync:', error);

        // Fallback: Trả về user từ local DB nếu có
        if (session.user?.id) {
            try {
                const { connectDB } = await import('./db');
                const User = (await import('../model/user.model')).default;
                await connectDB();

                // Tìm user bằng oauthSub hoặc externalUserId
                const user = await User.findOne({
                    $or: [
                        { oauthSub: session.user.id },
                        { externalUserId: session.user.id }
                    ]
                });

                if (user) {
                    return {
                        ...user.toObject(),
                        oauth: session.user,
                    };
                }
            } catch (dbError) {
                console.error('❌ Lỗi khi fallback DB:', dbError);
            }
        }

        // Last resort: Trả về session user
        return session.user ? {
            _id: session.user.id,
            oauthSub: session.user.id,
            email: session.user.email,
            name: session.user.name,
            oauth: session.user,
        } : null;
    }
}
