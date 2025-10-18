// components/SignOutButton.js
"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
    return (
        <button
            // Sau khi đăng xuất, chuyển hướng về trang chủ của client
            onClick={() => signOut({ callbackUrl: "/" })}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
            Đăng xuất
        </button>
    );
}