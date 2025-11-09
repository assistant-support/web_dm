// app/components/layout/SideNav.js
// Cấu trúc: /app/components/layout/* (Client)
// Mục đích: SideNav hiển thị menu theo quyền. Ẩn mục quản trị nếu không đủ role.

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useCan from '@/hooks/useCan.js';
import { useAuthz } from '@/context/AuthzContext.client.js';

/** Link với highlight khi trùng route hiện tại */
function NavLink({ href, children }) {
    const pathname = usePathname();
    const active = pathname === href || pathname?.startsWith(String(href));
    return (
        <Link
            href={href}
            className={`block rounded-md px-3 py-2 text-sm ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
        >
            {children}
        </Link>
    );
}

/** Nhóm menu có tiêu đề */
function Group({ title, children }) {
    return (
        <div className="mb-6">
            <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {title}
            </div>
            <div className="space-y-1">{children}</div>
        </div>
    );
}

/** SideNav chính */
export default function SideNav() {
    const { teams, projects } = useAuthz();
    const can = useCan();

    return (
        <aside className="h-full w-64 shrink-0 border-r bg-white p-3">
            <Group title="Tổng quan">
                <NavLink href="/">Nhiệm vụ</NavLink>
                <NavLink href="/files">Quản lý File</NavLink>
                <NavLink href="/reports">Báo cáo</NavLink>
                <NavLink href="/settings">Cài đặt</NavLink>
            </Group>

            <Group title="Teams">
                <NavLink href="/teams">All Teams</NavLink>
                {(teams || []).map((t) => (
                    <NavLink key={t.id} href={`/teams/${t.id}`}>
                        {/* FIX (UI): hiển thị rõ Owner/Manager */}
                        {t.name}{' '}
                        {t.role === 'OWNER' ? '· Owner' : t.role === 'MANAGER' ? '· Manager' : ''}
                    </NavLink>
                ))}
                {!teams?.length && (
                    <div className="px-3 py-2 text-sm text-slate-500">Bạn chưa thuộc team nào</div>
                )}
            </Group>

            <Group title="Projects">
                {(projects || []).map((p) => (
                    <div key={p.id} className="space-y-1">
                        <NavLink href={`/projects/${p.id}`}>{p.name}</NavLink>

                        {/* Nhóm quản lý chỉ hiển thị với MANAGER+ */}
                        {can.manageProject(p.id) && (
                            <div className="ml-3 space-y-1">
                                <NavLink href={`/projects/${p.id}/settings`}>Cấu hình Project</NavLink>
                                <NavLink href={`/projects/${p.id}/workflow`}>Workflow</NavLink>
                            </div>
                        )}
                    </div>
                ))}
                {!projects?.length && (
                    <div className="px-3 py-2 text-sm text-slate-500">Chưa có project tham gia</div>
                )}
            </Group>
        </aside>
    );
}
