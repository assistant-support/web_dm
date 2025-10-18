"use client";

import { signIn, signOut } from "next-auth/react";

// Component cho nút Đăng nhập
export function SignInButton() {
    return (
        <button
            onClick={() => signIn("my-provider")} // "my-provider" phải khớp với `id` trong auth.js
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
            Đăng nhập bằng Dịch vụ của tôi
        </button>
    );
}

// Component cho nút Đăng xuất
export function SignOutButton() {
    return (
        <button
            onClick={() => signOut()}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
            Đăng xuất
        </button>
    );
}