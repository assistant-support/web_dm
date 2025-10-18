// app/dashboard/page.js

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";

export default async function DashboardPage() {
    const session = await auth();

    // Middleware đã bảo vệ route này, nhưng đây là một lớp bảo vệ bổ sung
    if (!session) {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-3xl w-full bg-white p-8 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <SignOutButton />
                </div>
                <p className="mb-4">Đây là trang được bảo vệ. Chỉ người dùng đã đăng nhập mới thấy được.</p>
                <div className="bg-gray-100 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Thông tin Session</h2>
                    <pre className="text-sm bg-gray-800 text-white p-4 rounded overflow-x-auto">
                        {JSON.stringify(session, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
}