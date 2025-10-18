// app/(auth)/layout.jsx
// Tác dụng file: Layout cho nhóm trang yêu cầu đăng nhập (dựa vào middleware đã kiểm tra trước).
// - Server Component, không tự redirect (middleware đã xử lý).
// - Cung cấp SessionProvider client để các component con dùng useSession() nếu cần.

import AuthSessionProvider from '@/components/AuthProvider';

export default function ProtectedLayout({ children }) {
    return (
        <div>
            <AuthSessionProvider>{children}</AuthSessionProvider>
        </div>
    );
}
