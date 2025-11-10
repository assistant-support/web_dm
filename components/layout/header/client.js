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

const UidSetupDialog = dynamic(() => import('@/components/uid/UidSetupDialog.client'), {
    ssr: false,
    loading: () => null,
});

// --- Component cho Menu Ứng Dụng (Bên Trái) ---

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

// --- Component cho Menu Người Dùng (Bên Phải) ---
export function UserMenu({ user }) {
    const [showUidDialog, setShowUidDialog] = useState(false);
    const [hasUid, setHasUid] = useState(true); // Giả định có UID, sẽ kiểm tra sau
    const [checkingUid, setCheckingUid] = useState(true);
    const [zaloInfo, setZaloInfo] = useState(null); // { zaloname, zaloavt, uid }
    const [mounted, setMounted] = useState(false);

    // Chỉ render sau khi client-side mounted để tránh hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    // Kiểm tra UID khi component mount
    useEffect(() => {
        if (user && mounted) {
            checkUserUid()
                .then(result => {
                    if (result.ok) {
                        setHasUid(result.hasUid);
                        if (result.hasUid) {
                            setZaloInfo({
                                uid: result.uid,
                                zaloname: result.zaloname,
                                zaloavt: result.zaloavt
                            });
                        }
                    }
                })
                .catch(err => {
                    console.error('Error checking UID:', err);
                })
                .finally(() => {
                    setCheckingUid(false);
                });
        }
    }, [user, mounted]);

    // Handler khi cập nhật UID thành công
    const handleUidUpdateSuccess = (updatedInfo) => {
        setHasUid(true);
        setZaloInfo(updatedInfo); // Cập nhật thông tin mới
        setShowUidDialog(false);
    };

    if (!user) {
        return <Link href="/login" className="px-3 py-2 text-sm font-semibold rounded-md hover:bg-white/20">Đăng nhập</Link>;
    }

    const getInitials = (name) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '';
    }
    const avatarUrl = driveImage(user.avt) || null;
    const displayName = user.name || `${user.lastName || ''} ${user.firstName || ''}`.trim() || 'User';

    return (
        <>
            <Dropdown>
                <Dropdown.Trigger>
                    <button className="cursor-pointer flex items-center gap-2 rounded-full hover:bg-gray-100 p-1 transition-colors relative">
                        {avatarUrl ? (
                            <div className="relative">
                                <Image
                                    src={avatarUrl}
                                    alt="User Avatar"
                                    width={40}
                                    height={40}
                                    className="rounded-full ring-2 ring-[var(--brand-600)]/20"
                                />
                                {/* Chỉ hiển thị badge khi đã mounted để tránh hydration mismatch */}
                                {mounted && !checkingUid && !hasUid && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">!</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-[var(--brand-600)] flex items-center justify-center text-sm font-bold text-white">
                                    {getInitials(displayName)}
                                </div>
                                {/* Chỉ hiển thị badge khi đã mounted để tránh hydration mismatch */}
                                {mounted && !checkingUid && !hasUid && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">!</span>
                                    </div>
                                )}
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

                    {/* Hiển thị thông tin Zalo nếu đã có UID - chỉ sau khi mounted */}
                    {mounted && !checkingUid && hasUid && zaloInfo && (
                        <div className="mx-2 mb-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-3 mb-2">
                                {zaloInfo.zaloavt ? (
                                    <Image
                                        src={zaloInfo.zaloavt}
                                        alt="Avatar Zalo"
                                        width={40}
                                        height={40}
                                        className="h-10 w-10 rounded-full border-2 border-green-300 object-cover"
                                        sizes="40px"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-green-300 flex items-center justify-center">
                                        <span className="text-sm font-bold text-green-700">
                                            {zaloInfo.zaloname?.charAt(0) || 'Z'}
                                        </span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-green-900 truncate">
                                        {zaloInfo.zaloname || 'Người dùng Zalo'}
                                    </p>
                                    <p className="text-xs text-green-700 truncate">
                                        UID: {zaloInfo.uid?.slice(0, 12)}...
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

                    {/* Hiển thị cảnh báo nếu chưa có UID - chỉ sau khi mounted */}
                    {mounted && !checkingUid && !hasUid && (
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