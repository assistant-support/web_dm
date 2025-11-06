// app/not-found.js
import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full text-center">
                <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                    Không tìm thấy trang
                </h2>
                <p className="text-gray-600 mb-8">
                    Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center px-6 py-3 bg-[var(--brand-600)] text-white rounded-lg hover:bg-[var(--brand-700)] transition-colors"
                >
                    Về trang chủ
                </Link>
            </div>
        </div>
    );
}
