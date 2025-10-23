'use client';

import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { LayoutGrid } from 'lucide-react';
import Dropdown from '@/components/ui/dropdown'; // ✅ Import component Dropdown mới
import { driveImage, truncateText } from '@/functions';
// --- Component cho Menu Ứng Dụng (Bên Trái) ---

const apps = [
    { name: 'Digital Marketing', href: '#', icon: 'https://lh3.googleusercontent.com/d/1PNcTJhUTzndZaHAe4s19sbjZyV6S80d0' },
    { name: 'Checkin', href: '#', icon: '/logo.jpg' },
];

export function AppSwitcher() {
    return (
        <Dropdown>
            <Dropdown.Trigger>
                <button
                    className="p-2 rounded-lg text-[var(--brand-600)] hover:bg-gray-100 transition-colors cursor-pointer"
                    aria-label="App switcher"
                >
                    <LayoutGrid className="w-6 h-6" />
                </button>
            </Dropdown.Trigger>

            <Dropdown.Content position="bottom-left" width="w-80" className="p-4">
                <h3 className="font-semibold text-gray-800">Các ứng dụng</h3>
                <p className="text-sm text-gray-500 mb-4">Khám phá các dịch vụ của chúng tôi.</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                    {apps.map(app => (
                        <Link href={app.href} key={app.name} className="p-2 rounded-md hover:bg-gray-100">
                            <div className="w-16 h-16 bg-gray-200 rounded-md mx-auto mb-1 flex items-center justify-center">
                                <Image src={app.icon} alt="Logo" width={48} height={48} className='rounded-md' />
                            </div>
                            <span className="text-xs text-gray-700">{app.name}</span>
                        </Link>
                    ))}
                </div>
            </Dropdown.Content>
        </Dropdown>
    );
}

// --- Component cho Menu Người Dùng (Bên Phải) ---
export function UserMenu({ user }) {
    if (!user) {
        return <Link href="/login" className="px-3 py-2 text-sm font-semibold rounded-md hover:bg-white/20">Đăng nhập</Link>;
    }

    const getInitials = (name) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '';
    }
    const avatarUrl = driveImage(user.avt) || null;
    const displayName = user.name || `${user.lastName || ''} ${user.firstName || ''}`.trim() || 'User';

    return (
        <Dropdown>
            <Dropdown.Trigger>
                <button className="cursor-pointer flex items-center gap-2 rounded-full hover:bg-gray-100 p-1 transition-colors">
                    {avatarUrl ? (
                        <Image
                            src={avatarUrl}
                            alt="User Avatar"
                            width={40}
                            height={40}
                            className="rounded-full ring-2 ring-[var(--brand-600)]/20"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-[var(--brand-600)] flex items-center justify-center text-sm font-bold text-white">
                            {getInitials(displayName)}
                        </div>
                    )}
                </button>
            </Dropdown.Trigger>

            <Dropdown.Content position="bottom-right" width="w-84">
                <div className="p-4 flex items-center gap-3">
                    {avatarUrl ? (
                        <Image
                            src={avatarUrl}
                            alt="User Avatar"
                            width={48}
                            height={48}
                            className="rounded-full"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-700">
                            {getInitials(displayName)}
                        </div>
                    )}
                    <div>
                        <p className="text-base text-gray-800 font-medium">{displayName}</p>
                        <p className="text-sm text-gray-500">{truncateText(user.email, { maxLength: 25 })}</p>
                    </div>
                </div>
                <div className="p-2 border-t border-gray-200">
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md cursor-pointer"
                    >
                        Đăng xuất
                    </button>
                </div>
            </Dropdown.Content>
        </Dropdown>
    );
}