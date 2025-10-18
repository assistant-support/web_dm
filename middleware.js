// middleware.js
// Tác dụng file: Bảo vệ các route cần đăng nhập (App Router).
// - Nếu thiếu session (cookie NextAuth) **và** không có header x-user-id → redirect tới /login (có callbackUrl=URL hiện tại).
// - Dev: nếu DEV_FAKE_USER=1 và chưa có session, sẽ **gắn header giả** để vào nhanh (không redirect).
// - Mặc định bỏ qua tài nguyên tĩnh/_next/api.
//
// Lưu ý cookie NextAuth v5: 'authjs.session-token' (và bản __Secure-*). Giữ tương thích thêm cookie v4.

import { NextResponse } from 'next/server';

function isStaticPath(pathname) {
    return (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/assets') ||
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/api') // không chặn API (route handler) – để chính route xử lý auth nếu cần
    );
}

// Các route cần đăng nhập (có thể mở rộng thêm tuỳ app)
const PROTECTED_MATCHERS = [
    '/dev',
    '/dev/(.*)',
    // ví dụ: '/dashboard', '/projects/(.*)', ...
];

// Kiểm tra đường dẫn có thuộc protected không
function isProtected(pathname) {
    return PROTECTED_MATCHERS.some((m) => {
        if (m.endsWith('/(.*)')) {
            const base = m.replace('/(.*)', '');
            return pathname === base || pathname.startsWith(base + '/');
        }
        return pathname === m;
    });
}

function hasAuthCookie(req) {
    const c = req.cookies;
    return (
        c.get('authjs.session-token') ||
        c.get('__Secure-authjs.session-token') ||
        c.get('next-auth.session-token') ||
        c.get('__Secure-next-auth.session-token')
    );
}

export function middleware(request) {
    const { nextUrl, headers, cookies } = request;
    const { pathname } = nextUrl;

    if (isStaticPath(pathname)) {
        return NextResponse.next();
    }

    // Nếu route không yêu cầu auth → cho qua
    if (!isProtected(pathname)) {
        return NextResponse.next();
    }

    // Nếu đã có header x-user-id (gateway bơm) hoặc có cookie session → cho qua
    const hasHeaderUser = headers.get('x-user-id');
    if (hasHeaderUser || hasAuthCookie({ cookies })) {
        return NextResponse.next();
    }

    // Dev: nếu bật fake user → gắn header và cho qua
    if (process.env.DEV_FAKE_USER === '1') {
        const newHeaders = new Headers(headers);
        newHeaders.set('x-user-id', 'dev_u_001');
        newHeaders.set('x-user-email', 'dev@example.com');
        newHeaders.set('x-user-name', 'Dev User');
        newHeaders.set('x-user-avatar', 'https://lh3.googleusercontent.com/a/default-user');
        return NextResponse.rewrite(nextUrl, { request: { headers: newHeaders } });
    }

    // Chưa đăng nhập: chuyển qua trang /login của app (client bạn sẽ signIn('my-provider'))
    const loginUrl = new URL('/login', process.env.AUTH_URL || nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', nextUrl.toString());
    return NextResponse.redirect(loginUrl);
}

// Matcher tổng thể – khuyến nghị chỉ định prefix để tránh chạy trên mọi request.
export const config = {
    matcher: ['/((?!_next|assets|favicon|api).*)'],
};
