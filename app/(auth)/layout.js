// app/(main)/layout.js
// Cấu trúc: /app/(main)/* (Server Components)
// Mục đích: Layout SSR cho vùng app chính — nạp whoami + teams/projects (lite),
//            bọc AuthzProvider để client dùng useCan() ẩn/hiện menu theo quyền.

import { ReactNode } from 'react';
import { connectDB } from '@/lib/db.js';
import { getCurrentUser } from '@/lib/request-user.js';
import Team from '@/model/team.model.js';
import Project from '@/model/project.model.js';
import Header from '@/components/layout/Header.js';
import SideNav from '@/components/layout/SideNav.js';
import { AuthzProvider } from '@/context/AuthzContext.client.js';

/** Đọc whoami từ layer server (headers/next-auth) và chuẩn hoá */
async function fetchWhoAmI() {
    const u = await getCurrentUser();
    return {
        id: u?.externalUserId ?? null,
        name: u?.name ?? null,
        email: u?.email ?? null,
        avatar: u?.avatar ?? null,
    };
}

/**
 * Lấy danh sách team user là member (lite)
 * @param {string} uid
 * @returns {Promise<{teams: Array<{id:string,name:string,role:'MANAGER'|'MEMBER'}>, teamRoles: Record<string,string>}>}
 */
async function fetchMyTeamsLite(uid) {
    const teams = await Team.find({ 'members.userId': uid })
        .select({ name: 1, members: { $elemMatch: { userId: uid } } })
        .lean();

    const items = (teams || []).map((t) => ({
        id: String(t._id),
        name: t.name,
        role: String(t.members?.[0]?.role || 'MEMBER'),
    }));

    const teamRoles = Object.fromEntries(items.map((t) => [t.id, t.role]));
    return { teams: items, teamRoles };
}

/**
 * Lấy danh sách project user là member (lite)
 * @param {string} uid
 * @returns {Promise<{projects: Array<{id:string,name:string,role:'OWNER'|'MANAGER'|'MEMBER'}>, projectRoles: Record<string,string>}>}
 */
async function fetchMyProjectsLite(uid) {
    const projects = await Project.find({ 'members.userId': uid })
        .select({ name: 1, members: { $elemMatch: { userId: uid } } })
        .lean();

    const items = (projects || []).map((p) => ({
        id: String(p._id),
        name: p.name,
        role: String(p.members?.[0]?.role || 'MEMBER'),
    }));

    const projectRoles = Object.fromEntries(items.map((p) => [p.id, p.role]));
    return { projects: items, projectRoles };
}

/**
 * Root layout cho vùng (main): Header + SideNav + content
 * @param {{ children: ReactNode }}
 */
export default async function MainLayout({ children }) {
    await connectDB();
    const whoami = await fetchWhoAmI();

    // Nếu chưa đăng nhập, middleware của bạn đã chặn từ trước — ở đây vẫn fallback an toàn
    const uid = whoami?.id;
    const [{ teams, teamRoles }, { projects, projectRoles }] = uid
        ? await Promise.all([fetchMyTeamsLite(uid), fetchMyProjectsLite(uid)])
        : [{ teams: [], teamRoles: {} }, { projects: [], projectRoles: {} }];

    const authzValue = { whoami, teams, projects, teamRoles, projectRoles };

    return (
        <AuthzProvider value={authzValue}>
            <div className="min-h-screen bg-slate-50">
                <Header />
                <div className="mx-auto max-w-screen-2xl grid grid-cols-[16rem_1fr] gap-0 px-4 py-4">
                    <SideNav />
                    <main className="min-h-[70vh] rounded-xl border bg-white p-4">{children}</main>
                </div>
            </div>
        </AuthzProvider>
    );
}
