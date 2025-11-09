'use client';

import { useEffect, useRef } from 'react';

const IDLE_TIMEOUT = 2000;

function scheduleIdle(callback) {
    if (typeof window === 'undefined') return -1;
    if ('requestIdleCallback' in window) {
        return window.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT });
    }
    const timeoutId = window.setTimeout(() => {
        callback({ didTimeout: true, timeRemaining: () => 0 });
    }, IDLE_TIMEOUT);
    return timeoutId;
}

function cancelIdle(id) {
    if (typeof window === 'undefined' || id === -1) return;
    if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(id);
    } else {
        window.clearTimeout(id);
    }
}

export default function FilePrefetcher({ file, priority = false }) {
    const previewRef = useRef(null);
    const thumbnailRef = useRef(null);

    useEffect(() => {
        if (!file || file.kind !== 'image') {
            return () => {};
        }

        const startPrefetch = () => {
            if (typeof window === 'undefined' || !window.Image) {
                return;
            }
            const previewUrl = file.access?.previewUrl;
            const thumbnailUrl = file.access?.thumbnailUrl;

            if (previewUrl && !previewRef.current) {
                previewRef.current = new window.Image();
                previewRef.current.src = previewUrl;
            }

            if (thumbnailUrl && !thumbnailRef.current) {
                thumbnailRef.current = new window.Image();
                thumbnailRef.current.src = thumbnailUrl;
            }
        };

        if (priority) {
            startPrefetch();
            return () => {
                if (previewRef.current) {
                    previewRef.current.src = '';
                    previewRef.current = null;
                }
                if (thumbnailRef.current) {
                    thumbnailRef.current.src = '';
                    thumbnailRef.current = null;
                }
            };
        }

        const idleId = scheduleIdle(startPrefetch);

        return () => {
            cancelIdle(idleId);
            if (previewRef.current) {
                previewRef.current.src = '';
                previewRef.current = null;
            }
            if (thumbnailRef.current) {
                thumbnailRef.current.src = '';
                thumbnailRef.current = null;
            }
        };
    }, [file, priority]);

    return null;
}
