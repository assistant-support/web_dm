// app/(auth)/dev/flows/b7/page.jsx
// Tác dụng file: Page wrapper (Server Component) cho Flow B7 Dev Runner (auth thật).
import FlowB7 from '../../_client/FlowB7.client';

export default function B7FlowPage() {
    return (
        <main className="max-w-5xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">B7 Task Lifecycle — Dev Flow Runner (Auth thật)</h1>
            <p className="text-sm text-gray-600">
                Đăng nhập bằng tài khoản NextAuth của bạn. Để kiểm thử vai trò Assignee, hãy gán một <b>externalUserId</b> thật
                và đăng nhập bằng tài khoản đó ở trình duyệt/Tab khác khi thực hiện các bước dành cho Assignee.
            </p>
            <FlowB7 />
        </main>
    );
}
