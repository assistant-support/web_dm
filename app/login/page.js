// app/login/page.js
import { Suspense } from 'react';
import LoginCard from './client';

export default function LoginPage() {
    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[--brand-50] via-[--brand-100] to-[--brand-200] p-4">
            <Suspense fallback={<div className="font-medium text-body">Đang tải...</div>}>
                <LoginCard />
            </Suspense>
        </main>
    );
}