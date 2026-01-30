// cấu trúc thư mục hiện tại: /hooks/loading.hook.js
// Tác dụng file: Hook client `useAsyncNotifier` giúp chạy async có overlay Loading + Notification.
// - Cung cấp component `Overlays` để mount 1 lần trong layout.
// - Hàm `run(asyncFn, { notify })` để thực thi và tự hiển thị thông báo thành công/thất bại.

'use client';

import { useCallback, useState } from 'react';
import LoadingOverlay from '@/components/ui/loading';
import NotiOverlay from '@/components/ui/noti';

/** Chuẩn hoá object lỗi trả về cho UI overlay */
function normalizeError(err) {
    if (!err) return { ok: false, message: 'Đã xảy ra lỗi không xác định.', code: 'UNKNOWN' };
    if (typeof err === 'string') return { ok: false, message: err, code: 'ERROR' };
    if (err.ok === false) return err;
    return { ok: false, message: err.message || 'Đã xảy ra lỗi.', code: err.code || 'ERROR', status: err.status };
}

/**
 * useAsyncNotifier(options?)
 * @param {Object} options - Tùy chọn giao diện/ứng xử overlay
 * @returns {{ run:Function, Overlays:Function, openNoti:Function, closeNoti:Function }}
 */
export function useAsyncNotifier(options = {}) {
    const {
        theme = 'dark',
        zIndex = 10000,
        defaultLoadingMessage = 'Đang xử lý...',
        defaultAutoCloseMsSuccess = 0,
        defaultAutoCloseMsError = 0,
        defaultShowCloseButton = true,
        closeOnOutside = true,
        enableNoti = true,     // cho phép tắt noti toàn cục
        enableLoading = true,  // cho phép tắt overlay loading
    } = options;

    // Loading state
    const [loading, setLoading] = useState({ open: false, message: defaultLoadingMessage });

    // Noti state
    const [noti, setNoti] = useState({
        open: false,
        status: 'info', // 'success' | 'error' | 'info'
        message: '',
        description: '',
        autoCloseMs: 0,
        actions: null,
    });

    /** Đóng notification */
    const closeNoti = useCallback(() => {
        // Log ra terminal (server console) khi nhấn nút Đóng popup / đóng noti
        try {
            // Trong môi trường browser, log này sẽ xuất hiện ở console của trình duyệt.
            // Khi chạy Next.js dev, log client cũng thường hiển thị trong terminal phát triển.
            // Thông điệp theo yêu cầu:
            console.log(' Tắt nút Đóng popup');
        } catch {
            // Bỏ qua nếu môi trường không hỗ trợ console
        }

        setNoti((s) => ({ ...s, open: false }));
    }, []);

    /** Mở notification (tuân thủ enableNoti) */
    const openNoti = useCallback(
        (payload = {}) => {
            if (!enableNoti) return;
            const isSuccess = payload.status === 'success';
            setNoti({
                open: true,
                status: payload.status || 'info',
                message: payload.message || '',
                description: payload.description || '',
                autoCloseMs:
                    typeof payload.autoCloseMs === 'number'
                        ? payload.autoCloseMs
                        : isSuccess
                            ? defaultAutoCloseMsSuccess
                            : defaultAutoCloseMsError,
                actions: payload.actions || null,
            });
        },
        [enableNoti, defaultAutoCloseMsSuccess, defaultAutoCloseMsError]
    );

    /**
     * Overlays component: mount 1 lần ở layout/page gốc.
     */
    const Overlays = useCallback(() => {
        return (
            <>
                {enableLoading && (
                    <LoadingOverlay open={loading.open} message={loading.message} zIndex={zIndex} />
                )}
                {enableNoti && (
                    <NotiOverlay
                        open={noti.open}
                        status={noti.status}
                        message={noti.message}
                        description={noti.description}
                        autoCloseMs={noti.autoCloseMs}
                        onClose={closeNoti}
                        onClickOutside={closeOnOutside ? closeNoti : undefined}
                        zIndex={zIndex}
                        actions={
                            noti.actions ??
                            (defaultShowCloseButton ? [{ label: 'Đóng', onClick: closeNoti, variant: 'primary' }] : [])
                        }
                        theme={theme}
                    />
                )}
            </>
        );
    }, [
        enableLoading,
        enableNoti,
        loading.open,
        loading.message,
        zIndex,
        noti.open,
        noti.status,
        noti.message,
        noti.description,
        noti.autoCloseMs,
        noti.actions,
        closeOnOutside,
        closeNoti,
        defaultShowCloseButton,
        theme,
    ]);

    /**
     * run(asyncFn, opts?)
     * - Thực thi hàm async kèm overlay loading & noti theo tùy chọn.
     * - notify: 'all' | 'success' | 'error' | 'none'
     */
    const run = async (
        asyncFn,
        {
            loadingMessage = defaultLoadingMessage,
            successMessage,
            errorMessage,
            notify = 'all',
            autoCloseMs,
            actions,
            onSuccess,
            onError,
        } = {}
    ) => {
        if (enableLoading) setLoading({ open: true, message: loadingMessage });

        const wantSuccessNoti = enableNoti && (notify === 'all' || notify === 'success');
        const wantErrorNoti = enableNoti && (notify === 'all' || notify === 'error');

        try {
            const res = await asyncFn();
            const result = res && typeof res === 'object' && 'ok' in res ? res : { ok: true, data: res };

            if (result.ok) {
                if (wantSuccessNoti) {
                    openNoti({
                        status: 'success',
                        message: successMessage || result.message || 'Thành công',
                        description: result.code ? `Mã: ${result.code}` : '',
                        autoCloseMs,
                        actions,
                    });
                }
                onSuccess?.(result);
            } else {
                if (wantErrorNoti) {
                    const desc = result.issues?.length
                        ? result.issues.map((i) => {
                            const field = i.field || i.path;
                            return field ? `${field}: ${i.message}` : i.message;
                        }).join(' • ')
                        : result.code
                            ? `Mã: ${result.code}`
                            : '';
                    openNoti({
                        status: 'error',
                        message: errorMessage || result.message || 'Thao tác thất bại',
                        description: desc,
                        autoCloseMs: 0,
                        actions,
                    });
                }
                onError?.(result);
            }

            return result;
        } catch (e) {
            const err = normalizeError(e);
            if (wantErrorNoti) {
                openNoti({
                    status: 'error',
                    message: errorMessage || err.message || 'Thao tác thất bại',
                    description: err.code ? `Mã: ${err.code}` : '',
                    autoCloseMs: 0,
                    actions,
                });
            }
            onError?.(err);
            return err;
        } finally {
            if (enableLoading) setLoading((s) => ({ ...s, open: false }));
        }
    };

    return { run, Overlays, openNoti, closeNoti };
}
