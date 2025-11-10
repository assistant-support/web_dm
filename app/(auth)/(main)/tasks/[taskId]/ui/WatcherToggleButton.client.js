'use client';

import { useState, useTransition } from 'react';
import { toggleWatcherAction } from '@/app/actions/toggle-watcher';

export default function WatcherToggleButton({ taskId, initialWatching = false }) {
    const [watching, setWatching] = useState(initialWatching);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleToggle = () => {
        if (!taskId) return;

        const previous = watching;
        const nextState = !previous;

        setWatching(nextState);
        setError('');

        startTransition(async () => {
            try {
                await toggleWatcherAction(taskId, nextState);
            } catch (err) {
                console.error('Failed to toggle watcher state:', err);
                setWatching(previous);
                setError('Không thể cập nhật trạng thái theo dõi. Vui lòng thử lại.');
            }
        });
    };

    return (
        <div className="flex flex-col gap-1">
            <button
                type="button"
                onClick={handleToggle}
                className="inline-flex items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
            >
                {isPending ? 'Đang cập nhật...' : watching ? 'Bỏ theo dõi' : 'Theo dõi'}
            </button>
            {error && (
                <span className="text-xs text-red-600" role="status" aria-live="polite">
                    {error}
                </span>
            )}
        </div>
    );
}
