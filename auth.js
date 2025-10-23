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
                url: 'http://localhost:3000/api/oauth/authorize',
                params: { scope: 'openid profile email' },
            },
            token: 'http://localhost:3000/api/oauth/token',
            userinfo: 'http://localhost:3000/api/oauth/userinfo',
            clientId: process.env.MY_PROVIDER_CLIENT_ID,
            clientSecret: process.env.MY_PROVIDER_CLIENT_SECRET,
            idToken: true,
            client: { id_token_signed_response_alg: 'HS256' },
            issuer: 'http://localhost:3000',
            profile(profile) {
                return { id: profile.sub, avt: profile.avt, name: profile.name, email: profile.email, role: profile.role };
            },
        },
    ],
    pages: {
        signIn: '/login',
        error: '/auth/error',
    },
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token;
                token.idToken = account.id_token;
                token.expiresAt =
                    (account.expires_at && account.expires_at * 1000) ||
                    Date.now() + 15 * 60 * 1000;
            }
            if (token.expiresAt && Date.now() < token.expiresAt - 60_000) {
                return token;
            }
            delete token.accessToken;
            delete token.expiresAt;
            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken;
            session.idToken = token.idToken;
            session.user = session.user || {};
            session.user.id = session.user.id || token.sub || null;
            session.user.avt = session.user.avt || token.avt || null;
            session.user.role = session.user.role || token.role || 'ROLE_USER';
            return session;
        },
    },
});
