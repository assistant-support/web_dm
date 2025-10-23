// app/(auth)/(main)/teams/[teamId]/error.js
// Mục đích: Error boundary cho team detail page

'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function TeamDetailError({
    error,
    reset,
}) {
    useEffect(() => {
        console.error('Team detail error:', error);
    }, [error]);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
                <div className="flex justify-center">
                    <div className="rounded-full bg-red-100 p-3">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        Có lỗi xảy ra
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Không thể tải thông tin team. Vui lòng thử lại.
                    </p>
                </div>
                <button
                    onClick={reset}
                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Thử lại
                </button>
            </div>
        </div>
    );
}
