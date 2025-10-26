// auth.js
// Tác dụng file: Cấu hình NextAuth (bản của bạn) — thêm map user.id vào session để getCurrentUser() đọc được.
// NOTE: Nếu file của bạn đã có đủ session.user.id thì KHÔNG cần thay. Dưới đây là phiên bản có bổ sung `session.user.id`.

import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        {
            id: 'my-provider',
            name: 'My Auth Service',
            type: 'oauth',
            authorization: {
                url: process.env.MY_PROVIDER_URL 
                    ? `${process.env.MY_PROVIDER_URL}/api/oauth/authorize`
                    : 'http://localhost:3000/api/oauth/authorize',
                params: { scope: 'openid profile email' },
            },
            token: process.env.MY_PROVIDER_URL 
                ? `${process.env.MY_PROVIDER_URL}/api/oauth/token`
                : 'http://localhost:3000/api/oauth/token',
            userinfo: process.env.MY_PROVIDER_URL 
                ? `${process.env.MY_PROVIDER_URL}/api/oauth/userinfo`
                : 'http://localhost:3000/api/oauth/userinfo',
            clientId: process.env.MY_PROVIDER_CLIENT_ID,
            clientSecret: process.env.MY_PROVIDER_CLIENT_SECRET,
            idToken: true,
            client: { id_token_signed_response_alg: 'HS256' },
            issuer: process.env.MY_PROVIDER_URL || 'http://localhost:3000',
            profile(profile) {
                // Ensure email is always present
                return { 
                    id: profile.sub, 
                    avt: profile.avt, 
                    name: profile.name, 
                    email: profile.email || 'unknown@example.com', 
                    role: profile.role 
                };
            },
        },
    ],
    pages: {
        signIn: '/login',
        error: '/auth/error',
    },
    callbacks: {
        async jwt({ token, account, user, profile }) {
            // Lần đầu đăng nhập: lưu user info từ profile/user vào token
            if (account && (user || profile)) {
                const userInfo = profile || user;
                token.sub = userInfo.sub || userInfo.id || token.sub;
                token.email = userInfo.email || token.email; // Lưu email vào token
                token.name = userInfo.name || token.name;
                token.avt = userInfo.avt || userInfo.image || token.avt;
                token.role = userInfo.role || token.role;
                token.accessToken = account.access_token;
                token.idToken = account.id_token;
                token.refreshToken = account.refresh_token; // LƯU REFRESH TOKEN
                token.expiresAt =
                    (account.expires_at && account.expires_at * 1000) ||
                    Date.now() + 15 * 60 * 1000;
            }
            
            // Check token expiration và tự động refresh
            if (token.expiresAt && Date.now() < token.expiresAt - 60_000) {
                return token;
            }
            
            // Token sắp hết hạn hoặc đã hết hạn - thử refresh
            if (token.refreshToken) {
                try {
                    const refreshedTokens = await refreshAccessToken(token.refreshToken);
                    
                    return {
                        ...token,
                        accessToken: refreshedTokens.access_token,
                        idToken: refreshedTokens.id_token,
                        expiresAt: Date.now() + (refreshedTokens.expires_in * 1000),
                        refreshToken: refreshedTokens.refresh_token || token.refreshToken, // Dùng refresh token mới nếu có
                    };
                } catch (error) {
                    console.error('[AUTH] Refresh token failed:', error);
                    // Nếu refresh thất bại, xóa tokens và yêu cầu đăng nhập lại
                    return {
                        ...token,
                        accessToken: undefined,
                        idToken: undefined,
                        refreshToken: undefined,
                        error: 'RefreshAccessTokenError',
                    };
                }
            }
            
            // Không có refresh token - xóa access tokens
            delete token.accessToken;
            delete token.expiresAt;
            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken;
            session.idToken = token.idToken;
            session.user = session.user || {};
            session.user.id = token.sub || session.user.id || null;
            session.user.email = token.email || session.user.email || ''; // Ensure email exists
            session.user.name = token.name || session.user.name || '';
            session.user.avt = token.avt || session.user.avt || null;
            session.user.role = token.role || session.user.role || 'member';
            
            // Thêm error vào session nếu có
            if (token.error) {
                session.error = token.error;
            }
            
            return session;
        },
    },
});

/**
 * Hàm refresh access token sử dụng refresh token
 */
async function refreshAccessToken(refreshToken) {
    const tokenUrl = process.env.MY_PROVIDER_URL 
        ? `${process.env.MY_PROVIDER_URL}/api/oauth/token`
        : 'http://localhost:3000/api/oauth/token';
    
    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.MY_PROVIDER_CLIENT_ID,
        client_secret: process.env.MY_PROVIDER_CLIENT_SECRET,
    });

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    const tokens = await response.json();

    if (!response.ok) {
        console.error('[AUTH] Refresh token error:', tokens);
        throw new Error(tokens.error || 'Failed to refresh token');
    }

    return tokens;
}
