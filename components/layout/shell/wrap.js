// components/layout/shell/wrap.js
import AppShell from './appshell';
import { getCurrentUserWithSync } from '@/lib/oauth-client';

export default async function ShellGate({ session, children }) {
    if (!session) return children;
    let user = null;
    try {
        user = await getCurrentUserWithSync(session);
        user = JSON.parse(JSON.stringify(user));
        user = user.oauth;
    } catch (error) {
        console.error('ShellGate: Error getting user:', error);
        return children;
    }
    return <AppShell user={user}>{children}</AppShell>;
}
