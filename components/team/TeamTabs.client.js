// components/team/TeamTabs.client.js
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Users, Clock, BarChart3, Settings } from 'lucide-react';

export default function TeamTabs({ teamId, isManager }) {
    const pathname = usePathname();
    
    const tabs = [
        {
            name: 'Tổng quan',
            href: `/teams/${teamId}`,
            icon: Home,
            current: pathname === `/teams/${teamId}`,
        },
        {
            name: 'Thành viên',
            href: `/teams/${teamId}/members`,
            icon: Users,
            current: pathname === `/teams/${teamId}/members`,
        },
        {
            name: 'Hoạt động',
            href: `/teams/${teamId}/activity`,
            icon: Clock,
            current: pathname === `/teams/${teamId}/activity`,
        },
    ];

    // Only show settings for managers
    if (isManager) {
        tabs.push({
            name: 'Cài đặt',
            href: `/teams/${teamId}/settings`,
            icon: Settings,
            current: pathname === `/teams/${teamId}/settings`,
        });
    }

    return (
        <div className="border-b border-gray-200 bg-white">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={`
                                group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                                ${
                                    tab.current
                                        ? 'border-[var(--brand-600)] text-[var(--brand-600)]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                            aria-current={tab.current ? 'page' : undefined}
                        >
                            <Icon
                                className={`
                                    h-5 w-5
                                    ${
                                        tab.current
                                            ? 'text-[var(--brand-600)]'
                                            : 'text-gray-400 group-hover:text-gray-500'
                                    }
                                `}
                                aria-hidden="true"
                            />
                            {tab.name}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
