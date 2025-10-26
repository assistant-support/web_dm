// components/layout/shell/appshell.js
'use client';

import { useState } from 'react';
import Sidebar from './sidebar';
import { Menu } from 'lucide-react';
import AnimatedBackground from '@/components/background/animatedBg.ui';

export default function AppShell({ user, children }) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="flex h-full w-full loginHero">
            <AnimatedBackground />
            <Sidebar
                user={user}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />
            <div className="flex flex-1 flex-col min-h-0 w-full overflow-hidden">
                <header className="flex h-16 items-center border-b bg-white px-4 md:hidden flex-none">
                    <button
                        type="button"
                        className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
                        aria-label="Open navigation"
                        onClick={() => setMobileOpen(true)}
                    >
                        <Menu size={24} />
                    </button>
                </header>
                <main className="flex-1 min-h-0 overflow-hidden p-4 flex">
                    {children}
                </main>
            </div>
        </div>
    );
}
