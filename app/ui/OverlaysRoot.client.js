// cấu trúc thư mục hiện tại: /app/ui/OverlaysRoot.client.js
// Tác dụng file: Client component mount hook `useAsyncNotifier` để hiển thị overlay toàn cục.

'use client';

import { useAsyncNotifier } from '@/hooks/loading.hook';

export default function OverlaysRoot() {
    const { Overlays } = useAsyncNotifier({
        theme: 'dark',
        zIndex: 9999,
        enableNoti: true,
        enableLoading: true,
    });

    return <Overlays />;
}
