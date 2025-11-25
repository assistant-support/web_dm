// components/layout/header/index.js
import Link from "next/link";
import Image from "next/image";
import { AppSwitcher, UserMenu, ChatBotButton } from "./client";
import { getCurrentUserWithSync } from "@/lib/oauth-client";
import SearchInput from "./SearchInput.client";
import NotificationBell from "@/components/layout/NotificationBell.client";
import { getSessionFromCookies } from "@/lib/session-helper";



export default async function SiteHeader() {
    const session = await getSessionFromCookies();
    let user = null;

    // Lấy user info từ OAuth và sync
    if (session) {
        try {
            const fullUser = await getCurrentUserWithSync(session);
            user = JSON.parse(JSON.stringify(fullUser));
        } catch (error) {
            console.error('Header: Error getting user:', error);
        }
    }
    const datauser = user?.oauth;
    return (
        <div className="px-4 sm:px-6 lg:px-8 z-2">
            <div className="flex h-16 items-center justify-between gap-6">
                {/* Phần Bên Trái */}
                <div className="flex items-center gap-4">
                    <AppSwitcher />
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Image
                            src="https://lh3.googleusercontent.com/d/1PNcTJhUTzndZaHAe4s19sbjZyV6S80d0"
                            height={32}
                            width={32}
                            alt="Digital Marketing Logo"
                            className="rounded-md"
                        />
                        <p className="text-lg font-semibold tracking-wide text-[var(--brand-600)]">
                            Digital Marketing
                        </p>
                    </Link>
                </div>

                {/* Phần Giữa - Search (Prominent) */}
                <div className="flex-1 max-w-2xl mx-8">
                    <SearchInput />
                </div>

                {/* Phần Bên Phải */}
                <div className="flex items-center gap-3">
                    <ChatBotButton />
                    <NotificationBell currentUser={user} />
                    <UserMenu user={user} />
                </div>
            </div>
        </div>
    );
}
