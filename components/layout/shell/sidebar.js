// components/layout/shell/sidebar.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    FolderKanban,
    Users,
    BarChart3,
    Settings,
    BookOpen,
    X
} from 'lucide-react';
// Navigation items cho web Digital Marketing
const navItems = [
    { href: '/', label: 'Công việc', icon: Home },
    { href: '/projects', label: 'Dự án', icon: FolderKanban },
    { href: '/teams', label: 'Nhóm', icon: Users },
    { href: '/files', label: 'Tài nguyên', icon: BarChart3 },
    { href: '/guide', label: 'Hướng dẫn', icon: BookOpen },
    // { href: '/settings', label: 'Cài đặt', icon: Settings },
];

export default function Sidebar({ user, mobileOpen, setMobileOpen }) {
    const pathname = usePathname();

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const sidebarContent = (
        <div className="flex h-full flex-col p-4">
            {/* Nút đóng cho mobile */}
            <div className="mb-4 flex items-center justify-end md:hidden">
                <button
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                    aria-label="Close menu"
                >
                    <X size={24} />
                </button>
            </div>
            {/* Danh sách điều hướng */}
            <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => mobileOpen && setMobileOpen(false)}
                            className={`
                                relative flex items-center gap-3 rounded-lg px-4 py-3 text-base
                                font-medium transition-colors
                                ${isActive
                                    ? 'bg-white text-gray-900 border border-gray-200'
                                    : 'text-gray-600 hover:bg-white/50'
                                }
                            `}
                        >
                            {/* Thanh chỉ báo active */}
                            <div className={`
                                absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-600
                                transition-transform duration-300 ease-out
                                ${isActive ? 'scale-y-100' : 'scale-y-0'}
                            `} />

                            <Icon
                                size={20}
                                className={`transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500'
                                    }`}
                            />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Spacer để đẩy footer xuống */}
            <div className="flex-1" />

            {/* Footer info */}
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                <p className="text-xs text-gray-500 text-center">
                    Digital Marketing v2.1
                </p>
            </div>
        </div>
    );

    return (
        <>
            {/* Sidebar cho desktop */}
            <aside className="hidden md:flex md:w-64 md:flex-col">
                {sidebarContent}
            </aside>

            {/* Sidebar cho mobile */}
            {mobileOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40 bg-gray-900/50 md:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                    {/* Sidebar panel */}
                    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white md:hidden">
                        {sidebarContent}
                    </aside>
                </>
            )}
        </>
    );
}
