// components/project/ProjectTabs.client.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Clock, Settings, FileText } from 'lucide-react';

export default function ProjectTabs({ projectId, isOwnerOrManager, isAdmin = false }) {
    const pathname = usePathname();

    const tabs = [
        { id: 'overview', label: 'Tổng quan', href: `/projects/${projectId}`, icon: Home },
        { id: 'tasks', label: 'Công việc', href: `/projects/${projectId}/tasks`, icon: Clock },
        { id: 'members', label: 'Thành viên', href: `/projects/${projectId}/members`, icon: Users },
        { id: 'activity', label: 'Hoạt động', href: `/projects/${projectId}/activity`, icon: Clock },
        { id: 'files', label: 'Files', href: `/projects/${projectId}/files`, icon: FileText },
    ];

    // Only show settings tab to owner/manager hoặc admin hệ thống
    if (isOwnerOrManager || isAdmin) {
        tabs.push({ 
            id: 'settings', 
            label: 'Cài đặt', 
            href: `/projects/${projectId}/settings`, 
            icon: Settings 
        });
    }

    const isActive = (href) => {
        if (href === `/projects/${projectId}`) {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    return (
        <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = isActive(tab.href);
                    
                    return (
                        <Link
                            key={tab.id}
                            href={tab.href}
                            className={`
                                group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                                ${active
                                    ? 'border-[var(--brand-600)] text-[var(--brand-600)]'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            <Icon className={`h-5 w-5 ${active ? 'text-[var(--brand-600)]' : 'text-gray-400 group-hover:text-gray-500'}`} />
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
