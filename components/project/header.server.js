// app/components/project/header.server.js
// Cấu trúc: /app/components/project/* (Server Component)
// Mục đích: Header tóm tắt Project (tên, code, mô tả ngắn, members, stats, tabs marker).

/** Chip avatar đơn giản từ externalUserId (không có profile service ở bước này) */
function MiniAvatar({ id }) {
    const txt = String(id || '')
        .trim()
        .slice(0, 2)
        .toUpperCase();
    return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
            {txt || '??'}
        </div>
    );
}

/** Nhóm số liệu nhỏ */
function Stat({ label, value }) {
    return (
        <div className="rounded-lg border px-3 py-2">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="text-lg font-semibold">{value}</div>
        </div>
    );
}

/**
 * Header Project (Server Component)
 * @param {{
 *   project: { _id:string, name:string, code?:string|null, description?:string },
 *   members: Array<{ userId:string, role:string }>,
 *   stats: { taskCounts: { open:number, inProgress:number, awaitReview:number, completed:number, overdue:number } },
 *   initialTab?: 'list'|'kanban'|'calendar'
 * }} props
 */
export default function ProjectHeader({ project, members = [], stats, initialTab = 'list' }) {
    const title = project?.name || 'Project';
    const code = project?.code || null;
    const desc = (project?.description || '').trim();

    // Hiển thị tối đa 5 avatar + “+N”
    const MAX_AVATARS = 5;
    const avatars = members.slice(0, MAX_AVATARS);
    const more = Math.max(0, members.length - avatars.length);

    const c = stats?.taskCounts || {
        open: 0,
        inProgress: 0,
        awaitReview: 0,
        completed: 0,
        overdue: 0,
    };

    return (
        <header className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="truncate text-lg font-semibold">{title}</h1>
                        {code ? (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{code}</span>
                        ) : null}
                    </div>
                    {desc ? (
                        <p className="mt-1 max-w-3xl text-sm text-slate-600">{desc}</p>
                    ) : (
                        <p className="mt-1 text-sm text-slate-400">Chưa có mô tả</p>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {avatars.map((m) => (
                        <MiniAvatar key={m.userId} id={m.userId} />
                    ))}
                    {more > 0 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border text-xs text-slate-500">
                            +{more}
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
                <Stat label="Open" value={c.open} />
                <Stat label="In Progress" value={c.inProgress} />
                <Stat label="Await Review" value={c.awaitReview} />
                <Stat label="Completed" value={c.completed} />
                <Stat label="Overdue" value={c.overdue} />
            </div>

            {/* Tabs marker (chỉ hiển thị active hiện tại để header đồng bộ với page) */}
            <div className="mt-3 text-xs text-slate-500">
                Tab hiện tại: <span className="font-medium">{initialTab.toUpperCase()}</span>
            </div>
        </header>
    );
}
