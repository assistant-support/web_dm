// app/components/layout/Header.js
// Cấu trúc: /app/components/layout/* (Client)
// Mục đích: Header cố định: logo, search placeholder, menu profile.

'use client';

import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { useAuthz } from '@/context/AuthzContext.client.js';
import NotificationBell from './NotificationBell.client';

/** Header đơn giản cho vùng app chính */
export default function Header() {
    const { whoami } = useAuthz();

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
            <div className="mx-auto max-w-screen-2xl px-4 py-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-blue-600" />
                    <span className="font-semibold">ClickUp-like</span>
                </div>

                <div className="flex-1" />

                <div className="hidden md:block">
                    <input
                        className="w-72 rounded-lg border px-3 py-1 text-sm"
                        placeholder="Tìm kiếm (Soon)"
                        readOnly
                    />
                </div>

                <div className="flex items-center gap-3">
                    {/* Notification Bell */}
                    <NotificationBell currentUser={whoami} />
                    
                    {whoami?.avatar ? (
                        <Image
                            src={whoami.avatar}
                            alt={whoami?.name || 'user'}
                            width={28}
                            height={28}
                            className="rounded-full"
                        />
                    ) : (
                        <div className="h-7 w-7 rounded-full bg-slate-300" />
                    )}
                    <div className="text-sm">{whoami?.name || '—'}</div>
                    <button
                        className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
                        onClick={() => signOut()}
                    >
                        Đăng xuất
                    </button>
                </div>
            </div>
        </header>
    );
}
