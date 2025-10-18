'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import styles from './index.module.css';

export default function LoadingOverlay({
    open = false,
    message = 'Đang tải...',
    theme = 'dark',
    onClickOutside,
    zIndex = 9999
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true) }, []);
    useEffect(() => {
        const p = document.body.style.overflow;
        if (open) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = p };
    }, [open]);
    if (!mounted || !open) return null;

    const t = theme === 'light'
        ? { overlay: 'bg-white/80 backdrop-blur-lg', card: 'bg-white text-gray-800', muted: 'text-gray-600' }
        : { overlay: 'bg-gray-950/80 backdrop-blur-lg', card: 'bg-white/5 text-gray-200', muted: 'text-gray-400' };

    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${styles.animateOverlayFadeIn} ${t.overlay}`}
            role="dialog"
            aria-modal="true"
            aria-label={message}
            style={{ zIndex, padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' }}
            onMouseDown={e => { if (e.target === e.currentTarget && onClickOutside) onClickOutside(e) }}
        >
            <div className={`${styles.overlayCard} flex flex-col items-center gap-4 rounded-2xl p-6 shadow-2xl border border-white/20 ${styles.animateCardPop} ${t.card}`}>
                <div className={`${styles.ringBox} relative flex items-center justify-center`}>
                    <svg viewBox="0 0 64 64" className={styles.animateRingSlowRotate} aria-hidden="true">
                        <defs>
                            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2e73e6" /><stop offset="50%" stopColor="#7fb2ff" /><stop offset="75%" stopColor="#EC4899" /><stop offset="100%" stopColor="#06B6D4" />
                            </linearGradient>
                        </defs>
                        <circle cx="32" cy="32" r="28" stroke="url(#g)" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="88 160" className={`${styles.animateProgress} origin-center`} />
                    </svg>
                    <div className={`${styles.centerIcon} absolute flex items-center justify-center`}>
                        <Image src="https://lh3.googleusercontent.com/d/1PNcTJhUTzndZaHAe4s19sbjZyV6S80d0" alt="Logo" width={48} height={48} priority />
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-(--brand-500) text-base font-semibold">{message}<span className={styles.animateEllipsis} aria-hidden="true" /></div>
                    <div className={`mt-1 text-sm ${t.muted}`}>Vui lòng chờ - thao tác đang được xử lý !</div>
                </div>
            </div>
        </div>,
        document.body
    );
}
