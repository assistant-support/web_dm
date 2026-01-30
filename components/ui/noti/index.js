'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import air from './index.module.css'; // CSS icon (thành công/thất bại)

export default function NotiOverlay(props) {
    const {
        open = false,
        onClose,
        status,         // Boolean | 'success' | 'error' | 'info'
        mes,
        button,
        width,

        // Compat
        message,
        description,
        actions,
        autoCloseMs = 0,
        theme = 'dark',
        zIndex = 9999,
        onClickOutside,
    } = props;

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // ESC để đóng
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        if (open) window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    // Khoá scroll nền khi mở
    useEffect(() => {
        const prev = document.body.style.overflow;
        if (open) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    // Tự đóng
    useEffect(() => {
        if (!open || !autoCloseMs) return;
        const t = setTimeout(() => onClose?.(), autoCloseMs);
        return () => clearTimeout(t);
    }, [open, autoCloseMs, onClose]);

    // ❗ KHÔNG return sớm trước khi gọi tất cả hooks ở trên.
    if (!mounted || !open) return null;

    // ✅ Không dùng useMemo để tránh thay đổi thứ tự hooks
    let normalized;
    if (typeof status === 'boolean') normalized = status ? 'success' : 'error';
    else if (status === 'success' || status === 'error') normalized = status;
    else normalized = 'info';

    const isSuccess = normalized === 'success';
    const isError = normalized === 'error';

    const titleText = isSuccess ? 'THÀNH CÔNG' : isError ? 'THẤT BẠI' : 'THÔNG BÁO';
    const mainMessage = mes ?? message ?? 'Hoàn tất';
    const cardWidth = width ?? 350;

    const overlayBg = theme === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.5)';
    const statusColor = isSuccess ? 'var(--green)' : isError ? 'var(--red)' : 'var(--brand-600)';

    const handleOverlayClick = (e) => {
        // Chỉ đóng khi click vào overlay background, không phải vào card
        if (e.target === e.currentTarget) {
            onClickOutside?.(e);
            onClose?.();
        }
    };

    return createPortal(
        <div
            style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex }}
            role="dialog"
            aria-modal="true"
            aria-label={titleText}
            onClick={handleOverlayClick}
        >
            <div
                style={{ position: 'fixed', inset: 0, backgroundColor: overlayBg, backdropFilter: 'blur(4px)', zIndex: 9, pointerEvents: 'none' }}
            />

            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'white',
                    padding: 16,
                    width: cardWidth,
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.26)',
                    zIndex: 10,
                    position: 'relative',
                }}
            >
                <h4
                    style={{
                        marginTop: 16,
                        marginBottom: -16,
                        textAlign: 'center',
                        color: statusColor,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                    }}
                >
                    {titleText}
                </h4>

                <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                    {isSuccess ? <IconSuccess /> : isError ? <IconFailure /> : <IconInfo />}
                </div>

                <h5 style={{ padding: '0 16px 8px 16px', textAlign: 'center', marginTop: -12 }}>
                    {mainMessage}
                </h5>

                {description ? (
                    <p style={{ padding: '0 16px 8px 16px', textAlign: 'center', opacity: 0.8 }}>{description}</p>
                ) : null}

                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                    {button
                        ? button
                        : actions?.length > 0
                            ? actions.map((a, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        a.onClick?.(e);
                                    }}
                                    style={{
                                        borderRadius: 6,
                                        padding: '8px 12px',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        border: a.variant === 'primary' ? 'none' : '1px solid rgba(255,255,255,0.2)',
                                        background: a.variant === 'primary' ? 'var(--brand-600)' : 'transparent',
                                        color: a.variant === 'primary' ? '#fff' : 'inherit',
                                        cursor: 'pointer',
                                        pointerEvents: 'auto',
                                    }}
                                >
                                    {a.label}
                                </button>
                            ))
                            : null}
                </div>
            </div>
        </div>,
        document.body
    );
}
/* Icons + animation: giữ nguyên */
export function IconSuccess() {
    return (
        <div className={air['icon-success']}>
            <svg className={air['circle-svg']} viewBox="0 0 64 64">
                <circle
                    cx="32"
                    cy="32"
                    r="25"
                    fill="none"
                    stroke="#28a745"
                    strokeWidth="5"
                    strokeLinecap="round"
                    className={air['circle-path']}
                />
            </svg>
            <div className={`${air['check-mark']} ${air['first']}`} />
            <div className={`${air['check-mark']} ${air['second']}`} />
        </div>
    );
}

export function IconFailure() {
    return (
        <div className={air['icon-failure']}>
            <svg className={air['circle-svg']} viewBox="0 0 64 64">
                <circle
                    cx="32"
                    cy="32"
                    r="25"
                    fill="none"
                    stroke="#dc3545"
                    strokeWidth="5"
                    strokeLinecap="round"
                    className={air['circle-path']}
                />
            </svg>
            <div className={`${air['cross-line']} ${air['first']}`} />
            <div className={`${air['cross-line']} ${air['second']}`} />
        </div>
    );
}

function IconInfo() {
    // đơn giản: dùng dấu chấm "i" bằng CSS để không phụ thuộc icon lib
    return (
        <div
            style={{
                width: 58,
                height: 58,
                borderRadius: '50%',
                border: '5px solid var(--brand-600)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--brand-600)',
                fontWeight: 800,
                fontSize: 24,
            }}
            aria-hidden="true"
        >
            i
        </div>
    );
}
