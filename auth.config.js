// auth.config.js
import { NextResponse } from "next/server";

export const authConfig = {
    providers: [],

    pages: {
        signIn: "/login",
        error: "/auth/error",
    },

    callbacks: {
        authorized({ auth, request }) {
            const { nextUrl } = request;
            const isLoggedIn = !!auth?.user;
            const path = nextUrl.pathname;

            // Cho qua các đường dẫn không nên chặn
            if (
                path.startsWith("/api") ||            // KHÔNG chặn API
                path.startsWith("/_next/") ||
                path === "/favicon.ico" ||
                path === "/robots.txt" ||
                path === "/sitemap.xml" ||
                path === "/manifest.webmanifest" ||
                path === "/login" ||                  // tránh loop
                path.startsWith("/auth/")             // tránh loop
            ) {
                return true;
            }

            if (isLoggedIn) return true;

            // Chưa đăng nhập -> redirect sang /login (sẽ tự signIn -> 3000)
            const loginUrl = new URL("/login", nextUrl);
            loginUrl.searchParams.set("callbackUrl", nextUrl.href);
            return NextResponse.redirect(loginUrl);
        },
    },
};
