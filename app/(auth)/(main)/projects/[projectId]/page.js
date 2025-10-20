// app/(main)/projects/[projectId]/page.js
// Cấu trúc: /app/(main)/projects/[projectId]/* (Server Component - SSR)
// Mục đích: Trang dự án SSR — nạp project + members + tasks (khung List/Kanban/Calendar), guard quyền server-side.

import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db.js';
import { getCurrentUser } from '@/lib/request-user.js';
import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';
import { canViewProject } from '@/lib/permissions.js';
import { asPlainProject, asPlainTask } from '@/lib/serialize.js';
import ProjectHeader from '@/components/project/header.server.js';
import { TASK_STATUS } from '@/model/common/enums.js';
import { formatTask, formatDate } from '@/data/_shared/formatters.js';

// Luôn SSR dữ liệu mới
export const dynamic = 'force-dynamic';

/**
 * Tính thống kê sơ bộ từ danh sách task đã load.
 * - open: DRAFT | PENDING_APPROVAL | WAITING_ASSIGNEE_CONFIRM
 * - inProgress: IN_PROGRESS
 * - awaitReview: COMPLETED_AWAIT_REVIEW
 * - completed: COMPLETED
 * - overdue: plannedDueAt < now && status != COMPLETED
 */
function computeStatsFromTasks(items = []) {
    const now = new Date();
    const OPEN_SET = new Set([
        TASK_STATUS.DRAFT,
        TASK_STATUS.PENDING_APPROVAL,
        TASK_STATUS.WAITING_ASSIGNEE_CONFIRM,
    ]);
    let open = 0;
    let inProgress = 0;
    let awaitReview = 0;
    let completed = 0;
    let overdue = 0;

    for (const t of items) {
        if (OPEN_SET.has(t.status)) open += 1;
        if (t.status === TASK_STATUS.IN_PROGRESS) inProgress += 1;
        if (t.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW) awaitReview += 1;
        if (t.status === TASK_STATUS.COMPLETED) completed += 1;
        const due = t?.plannedDueAt ? new Date(t.plannedDueAt) : null;
        if (due && due < now && t.status !== TASK_STATUS.COMPLETED) overdue += 1;
    }
    return { taskCounts: { open, inProgress, awaitReview, completed, overdue } };
}

/** SSR Loader chính cho trang project */
export default async function ProjectPage({ params }) {
    const projectId = String(params?.projectId || '').trim();
    if (!projectId) return notFound();

    await connectDB();

    // Lấy user hiện tại
    const me = await getCurrentUser();
    const uid = me?.externalUserId || null;

    // Nạp project (lean để nhẹ)
    const projectDoc = await Project.findById(projectId)
        .select({ name: 1, code: 1, description: 1, members: 1, team: 1, createdAt: 1, updatedAt: 1 })
        .lean();

    if (!projectDoc) return notFound();

    // ✅ Bắt buộc await permissions
    const canView = await canViewProject(projectDoc, uid);
    if (!canView) return notFound();

    // Chuẩn bị danh sách task cho tab List (sơ bộ các trạng thái "đang mở")
    const LIST_STATUSES = [
        TASK_STATUS.DRAFT,
        TASK_STATUS.PENDING_APPROVAL,
        TASK_STATUS.WAITING_ASSIGNEE_CONFIRM,
        TASK_STATUS.IN_PROGRESS,
        TASK_STATUS.ON_HOLD,
        TASK_STATUS.COMPLETED_AWAIT_REVIEW,
    ];

    const rawTasks = await Task.find({
        project: projectDoc._id,
        status: { $in: LIST_STATUSES },
        deletedAt: null,
    })
        .select({
            title: 1,
            assignee: 1,
            priority: 1,
            status: 1,
            plannedDueAt: 1,
            createdAt: 1,
            updatedAt: 1,
            commentsCount: 1,
            attachmentsCount: 1,
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

    // Serialize về plain để an toàn cho Client Components kế tiếp
    const itemsPlain = rawTasks.map(asPlainTask);

    // Tính stats sơ bộ từ list
    const stats = computeStatsFromTasks(itemsPlain);

    // Project plain cho header
    const projectPlain = asPlainProject(projectDoc);
    const members = projectPlain?.members || [];

    return (
        <div className="flex flex-col">
            {/* Header (Server Component) */}
            <ProjectHeader
                project={projectPlain}
                members={members}
                stats={stats}
                initialTab="list"
            />

            {/* Tabs điều hướng cục bộ (placeholder) */}
            <div className="mt-4 border-b">
                <nav className="-mb-px flex gap-4 px-2">
                    <span className="border-b-2 border-blue-600 px-3 py-2 text-sm font-medium text-blue-700">
                        List
                    </span>
                    <span className="px-3 py-2 text-sm text-slate-500">Kanban</span>
                    <span className="px-3 py-2 text-sm text-slate-500">Calendar</span>
                </nav>
            </div>

            {/* Tab List (mặc định) */}
            <section className="p-3">
                {!itemsPlain.length ? (
                    <div className="rounded-lg border p-6 text-center text-slate-500">
                        Chưa có task nào
                    </div>
                ) : (
                    <ul className="divide-y rounded-lg border">
                        {itemsPlain.map((t) => {
                            const fv = formatTask(t);
                            const dueTxt = t?.plannedDueAt ? formatDate(t.plannedDueAt) : '—';
                            return (
                                <li key={t._id} className="grid grid-cols-12 items-center gap-2 px-3 py-3">
                                    <div className="col-span-6 truncate">
                                        <div className="font-medium">{t.title}</div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            #{t._id} · {fv.statusLabel}{' '}
                                            <span
                                                className="ml-1 inline-block rounded px-1.5 py-0.5 text-[10px]"
                                                style={{ backgroundColor: `${fv.priorityColor}1A`, color: fv.priorityColor }}
                                            >
                                                {fv.priorityLabel}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-span-2 text-sm">{t.assignee || '—'}</div>
                                    <div className="col-span-2 text-sm">{dueTxt}</div>
                                    <div className="col-span-2 text-right text-xs text-slate-500">
                                        💬 {t.commentsCount ?? 0} · 📎 {t.attachmentsCount ?? 0}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Nút tải thêm — placeholder */}
                <div className="mt-3 text-center">
                    <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-md border px-3 py-1.5 text-sm text-slate-400"
                        title="Paging sẽ có ở bước sau"
                    >
                        Tải thêm
                    </button>
                </div>
            </section>

            {/* Kanban/Calendar placeholders */}
            <section className="hidden p-3">
                Kanban — coming soon
            </section>
            <section className="hidden p-3">
                Calendar — coming soon
            </section>
        </div>
    );
}
