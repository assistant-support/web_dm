// Tác dụng file: Trang /dev (Server Component) render panel test thông qua client component (dynamic, ssr:false).
// app/dev/page.jsx
import DevPanel from './_client/DevPanel.client';

export default function DevPage() {
    return (
        <main className="mx-auto max-w-5xl px-4 py-8">
            <h1 className="text-2xl font-semibold mb-6">Dev Panel · B1–B5 Smoke Test</h1>
            <p className="text-sm text-gray-500 mb-8">
                Kiểm thử nhanh AppUser / Team / Project (server actions). Middleware DEV_FAKE_USER sẽ gắn header nếu thiếu.
            </p>
            <DevPanel />
        </main>
    );
}
