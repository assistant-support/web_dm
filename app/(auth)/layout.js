// app/(auth)/layout.js
// Layout cho vùng được bảo vệ (authenticated) 
// Sử dụng Header và Shell đồng nhất với web_myaccount

import SiteHeader from '@/components/layout/header';
import ShellGate from '@/components/layout/shell/wrap';
import { auth } from "@/auth";
import { AuthzProvider } from '@/context/AuthzContext.client.js';
import { connectDB } from '@/lib/db.js';
import { getCurrentUserWithSync } from '@/lib/oauth-client';
import Team from '@/model/team.model.js';
import Project from '@/model/project.model.js';

/**
 * Lấy danh sách team user là member (lite)
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

export default async function AuthLayout({ children }) {
    const session = await auth();
    await connectDB();

    // Lấy user info từ OAuth
    let whoami = null;
    let uid = null;

    if (session) {
        try {
            const user = await getCurrentUserWithSync(session);
            whoami = {
                id: user?.oauthSub || user?._id?.toString() || null,
                name: user?.name || null,
                email: user?.email || null,
                avatar: user?.avatar || null,
            };
            uid = whoami.id;
        } catch (error) {
            console.error('AuthLayout: Error getting user:', error);
        }
    }

    // Lấy teams và projects
    const [{ teams, teamRoles }, { projects, projectRoles }] = uid
        ? await Promise.all([fetchMyTeamsLite(uid), fetchMyProjectsLite(uid)])
        : [{ teams: [], teamRoles: {} }, { projects: [], projectRoles: {} }];

    const authzValue = { whoami, teams, projects, teamRoles, projectRoles };

    return (
        <AuthzProvider value={authzValue}>
            <div className="flex flex-col h-screen w-screen overflow-hidden">
                <SiteHeader />
                <main className="flex-1 flex overflow-hidden">
                    <ShellGate session={session}>
                        {children}
                    </ShellGate>
                </main>
            </div>
        </AuthzProvider>
    );
}
