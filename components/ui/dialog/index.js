// components/ui/dialog/index.js
// Mục đích: Dialog/Modal component sử dụng Radix UI

'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import clsx from 'clsx';

/**
 * Dialog Component
 * @param {Object} props
 * @param {boolean} props.open - Dialog mở hay đóng
 * @param {(open: boolean) => void} props.onOpenChange - Callback khi thay đổi trạng thái
 * @param {string} props.title - Tiêu đề dialog
 * @param {string} props.description - Mô tả (optional)
 * @param {React.ReactNode} props.children - Nội dung dialog
 * @param {React.ReactNode} props.footer - Footer actions (optional)
 * @param {'sm'|'md'|'lg'|'xl'|'2xl'|'full'} props.size - Kích thước dialog
 * @param {string} props.className - Custom classes cho content
 */
export default function DialogComponent({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    size = 'md',
    className
}) {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '5xl': 'max-w-6xl',
        full: 'max-w-full mx-4'
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay onClick={onOpenChange} className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
                <Dialog.Content
                    className={clsx(
                        'fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%]',
                        'bg-white rounded-lg shadow-lg',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                        'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
                        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
                        sizeClasses[size],
                        className
                    )}
                    onPointerDownOutside={(e) => e.preventDefault()}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-gray-200 p-6 py-4">
                        <div>
                            {title && (
                                <Dialog.Title className="text-lg font-semibold text-gray-900">
                                    {title}
                                </Dialog.Title>
                            )}
                            {description && (
                                <Dialog.Description className="mt-1 text-sm text-gray-500">
                                    {description}
                                </Dialog.Description>
                            )}
                        </div>
                        <Dialog.Close className="cursor-pointer rounded-md opacity-70 ring-offset-white transition-opacity hover:opacity-100 hover:bg-gray-100 p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            <X className="h-5 w-5" />
                            <span className="sr-only">Close</span>
                        </Dialog.Close>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {children}
                    </div>

                    {/* Footer */}
                    {footer && (
                        <div className="flex items-center justify-end gap-2 border-t border-gray-200 p-6 py-4">
                            {footer}
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

/**
 * Confirm Dialog - Dialog xác nhận hành động
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title = 'Xác nhận',
    description,
    onConfirm,
    onCancel,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    variant = 'primary', // 'primary' | 'danger'
    loading = false
}) {
    const handleConfirm = () => {
        onConfirm?.();
    };

    const handleCancel = () => {
        onCancel?.();
        onOpenChange?.(false);
    };

    const confirmButtonClass = variant === 'danger'
        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
        : 'bg-[var(--brand-600)] hover:bg-[var(--brand-700)] focus:ring-[var(--brand-500)] text-white';

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
                <Dialog.Content
                    className={clsx(
                        'fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%]',
                        'bg-white rounded-lg shadow-lg',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
                    )}
                    onPointerDownOutside={(e) => e.preventDefault()}
                >
                    {/* Header */}
                    <div className="p-6 pb-4">
                        <Dialog.Title className="text-lg font-semibold text-gray-900">
                            {title}
                        </Dialog.Title>
                        {description && (
                            <Dialog.Description className="mt-2 text-sm text-gray-600 leading-relaxed">
                                {description}
                            </Dialog.Description>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={loading}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] focus:ring-offset-2 disabled:opacity-50 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={loading}
                            className={clsx(
                                'rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors shadow-sm',
                                confirmButtonClass
                            )}
                        >
                            {loading ? 'Đang xử lý...' : confirmText}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
