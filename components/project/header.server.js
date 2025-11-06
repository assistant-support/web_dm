// app/components/project/header.server.js
// Cấu trúc: /app/components/project/* (Server Component)
// Mục đích: Header tóm tắt Project (tên, code, mô tả ngắn, members, stats, tabs marker).

import { getUsersDisplayInfo } from '@/lib/user-display';
import Avatar from '@/components/ui/avatar';

/** Chip avatar với tên user */
async function MemberAvatars({ userIds }) {
    const usersInfo = await getUsersDisplayInfo(userIds);
    
    // Hiển thị tối đa 5 avatar + "+N"
    const MAX_AVATARS = 5;
    const displayUsers = userIds.slice(0, MAX_AVATARS);
    const more = Math.max(0, userIds.length - displayUsers.length);
    
    return (
        <div className="flex shrink-0 items-center gap-2">
            {displayUsers.map((userId) => {
                const userInfo = usersInfo.get(userId);
                return (
                    <div key={userId} title={userInfo?.name || userId}>
                        <Avatar 
                            userId={userId}
                            name={userInfo?.name || userId}
                            size="sm"
                        />
                    </div>
                );
            })}
            {more > 0 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border text-xs text-slate-500">
                    +{more}
                </div>
            )}
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
export default async function ProjectHeader({ project, members = [], stats, initialTab = 'list' }) {
    const title = project?.name || 'Project';
    const desc = (project?.description || '').trim();

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
                    <h1 className="truncate text-lg font-semibold">{title}</h1>
                    {desc ? (
                        <p className="mt-1 max-w-3xl text-sm text-slate-600">{desc}</p>
                    ) : (
                        <p className="mt-1 text-sm text-slate-400">Chưa có mô tả</p>
                    )}
                </div>

                <MemberAvatars userIds={members.map(m => m.userId)} />
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
                <Stat label="Mở" value={c.open} />
                <Stat label="Đang làm" value={c.inProgress} />
                <Stat label="Chờ review" value={c.awaitReview} />
                <Stat label="Hoàn thành" value={c.completed} />
                <Stat label="Quá hạn" value={c.overdue} />
            </div>

            {/* Tabs marker (chỉ hiển thị active hiện tại để header đồng bộ với page) */}
            <div className="mt-3 text-xs text-slate-500">
                Tab hiện tại: <span className="font-medium">{initialTab.toUpperCase()}</span>
            </div>
        </header>
    );
}
