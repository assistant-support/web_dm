/*
 * Đường dẫn: @/components/layout/header/client.js
 * Mô tả: Component quản lý menu chuyển đổi ứng dụng và menu người dùng, bao gồm hiển thị thông tin tài khoản, tích hợp Zalo UID và chatbot.
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { signOut } from 'next-auth/react';
import { LayoutGrid, AlertCircle } from 'lucide-react';
import Dropdown from '@/components/ui/dropdown';
import { driveImage, truncateText } from '@/functions';
import { checkUserUid } from '@/data/appUser/uid-actions';
import ChatBotLauncher from '@/components/demo/ChatBotLauncher.client';

const UidSetupDialog = dynamic(() => import('@/components/uid/UidSetupDialog.client'), {
    ssr: false,
    loading: () => null,
});

const apps = [
    { name: 'Digital Marketing', href: '#', icon: 'https://lh3.googleusercontent.com/d/1PNcTJhUTzndZaHAe4s19sbjZyV6S80d0' },
    { name: 'Checkin', href: 'https://checkin.s4h.edu.vn', icon: 'https://lh3.googleusercontent.com/d/1_fJwUYjDMT939e7v0JqExeHluwl58FnW' },
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

export function UserMenu({ user }) {
    const [showUidDialog, setShowUidDialog] = useState(false);
    const [uidState, setUidState] = useState({
        hasUid: !!user?.uid,
        isChecking: true,
        zaloname: user?.zaloname || '',
        zaloavt: user?.zaloavt || '',
        uid: user?.uid || ''
    });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!user || !mounted) return;

        checkUserUid()
            .then(result => {
                if (result.ok) {
                    setUidState(prev => ({
                        ...prev,
                        hasUid: result.hasUid,
                        isChecking: false,
                        uid: result.uid || prev.uid,
                        zaloname: result.zaloname || prev.zaloname,
                        zaloavt: result.zaloavt || prev.zaloavt
                    }));
                }
            })
            .catch(() => {
                setUidState(prev => ({ ...prev, isChecking: false }));
            });
    }, [user, mounted]);

    const handleUidUpdateSuccess = (updatedInfo) => {
        setUidState({
            hasUid: true,
            isChecking: false,
            uid: updatedInfo.uid,
            zaloname: updatedInfo.zaloname,
            zaloavt: updatedInfo.zaloavt
        });
        setShowUidDialog(false);
    };

    if (!user) {
        return <Link href="/login" className="px-3 py-2 text-sm font-semibold rounded-md hover:bg-white/20">Đăng nhập</Link>;
    }

    const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '';
    const displayName = user.name || `${user.lastName || ''} ${user.firstName || ''}`.trim() || 'User';
    const avatarUrl = driveImage(user.avatar) || uidState.zaloavt;
    const shouldShowWarning = mounted && !uidState.isChecking && !uidState.hasUid;
    const shouldShowZaloInfo = mounted && !uidState.isChecking && uidState.hasUid;

    return (
        <>
            <Dropdown>
                <Dropdown.Trigger>
                    <button className="cursor-pointer flex items-center gap-2 rounded-full hover:bg-gray-100 p-1 transition-colors relative">
                        <div className="relative">
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
                            {shouldShowWarning && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">!</span>
                                </div>
                            )}
                        </div>
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

                    {shouldShowZaloInfo && (
                        <div className="mx-2 mb-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-3 mb-2">
                                {uidState.zaloavt ? (
                                    <Image
                                        src={uidState.zaloavt}
                                        alt="Avatar Zalo"
                                        width={40}
                                        height={40}
                                        className="h-10 w-10 rounded-full border-2 border-green-300 object-cover"
                                        sizes="40px"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-green-300 flex items-center justify-center">
                                        <span className="text-sm font-bold text-green-700">
                                            {uidState.zaloname?.charAt(0) || 'Z'}
                                        </span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-green-900 truncate">
                                        {uidState.zaloname || 'Người dùng Zalo'}
                                    </p>
                                    <p className="text-xs text-green-700 truncate">
                                        UID: {uidState.uid?.slice(0, 12)}...
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUidDialog(true)}
                                className="w-full text-xs text-green-700 border border-green-300 rounded-md p-2 hover:bg-green-100 font-medium text-center cursor-pointer"
                            >
                                Cập nhật lại
                            </button>
                        </div>
                    )}

                    {shouldShowWarning && (
                        <div className="mx-2 mb-2">
                            <button
                                onClick={() => setShowUidDialog(true)}
                                className="w-full flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-left"
                            >
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-900">
                                        Cần cập nhật thông tin
                                    </p>
                                </div>
                            </button>
                        </div>
                    )}

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

            {showUidDialog && (
                <UidSetupDialog
                    open={showUidDialog}
                    onClose={() => setShowUidDialog(false)}
                    onSuccess={handleUidUpdateSuccess}
                />
            )}
        </>
    );
}

export function ChatBotButton() {
    return <ChatBotLauncher />;
}