// app/(main)/dashboard/page.js
// Cấu trúc: /app/(main)/dashboard/* (Server Component)
// Mục đích: Trang dashboard SSR mẫu — chào user + thống kê nhẹ (placeholder).

import { connectDB } from '@/lib/db.js';
import { getCurrentUser } from '@/lib/request-user.js';
import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';

/** Đếm nhanh số project & task đang mở (placeholder an toàn) */
async function quickStats(uid) {
    // FIX: countDocuments() không hỗ trợ .lean() → bỏ .lean() để tránh lỗi runtime
    const [projectCount, openTaskCount] = await Promise.all([
        Project.countDocuments({ 'members.userId': uid }),
        Task.countDocuments({
            deletedAt: null,
            assignee: uid,
            status: { $nin: ['completed', 'cancelled', 'rejected', 'completed_await_review'] },
        }),
    ]);
    return { projectCount, openTaskCount };
}

export default async function DashboardPage() {
    await connectDB();
    const u = await getCurrentUser();
    const name = u?.name || 'bạn';
    const uid = u?.externalUserId || '—';

    const { projectCount, openTaskCount } =
        uid !== '—' ? await quickStats(uid) : { projectCount: 0, openTaskCount: 0 };

    // 3 project gần đây (chỉ tên/id) — demo
    const recent = await Project.find({ 'members.userId': uid })
        .select({ name: 1, updatedAt: 1 })
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold">Chào {name} 👋</h1>
                <p className="text-slate-600 text-sm">
                    UID: <span className="font-mono">{uid}</span>
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border p-4">
                    <div className="text-sm text-slate-500">Projects tham gia</div>
                    <div className="text-2xl font-semibold">{projectCount}</div>
                </div>
                <div className="rounded-xl border p-4">
                    <div className="text-sm text-slate-500">Task đang mở</div>
                    <div className="text-2xl font-semibold">{openTaskCount}</div>
                </div>
                <div className="rounded-xl border p-4">
                    <div className="text-sm text-slate-500">Bảng công khai</div>
                    <div className="text-2xl font-semibold">Soon</div>
                </div>
            </div>

            <div className="rounded-xl border p-4">
                <div className="mb-3 text-sm font-semibold">Projects gần đây</div>
                <ul className="space-y-2">
                    {(recent || []).map((p) => (
                        <li key={String(p._id)} className="flex items-center justify-between">
                            <div className="truncate">{p.name}</div>
                            <div className="text-xs text-slate-500">
                                {new Date(p.updatedAt).toLocaleString('vi-VN')}
                            </div>
                        </li>
                    ))}
                    {!recent?.length && <li className="text-sm text-slate-500">Chưa có project nào</li>}
                </ul>
            </div>
        </div>
    );
}
