// components/AuthProvider.js
"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Component này chỉ có một nhiệm vụ:
 * Cung cấp context của session cho toàn bộ ứng dụng con (children).
 * Bất kỳ component client nào nằm bên trong nó đều có thể dùng hook `useSession`.
 */
export default function AuthProvider({ children }) {
    return <SessionProvider>{children}</SessionProvider>;
}