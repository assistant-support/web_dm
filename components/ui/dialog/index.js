// components/ui/dialog/index.js
// Mục đích: Dialog/Modal component sử dụng Radix UI

'use client';

import { useState, useEffect } from 'react';
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

/**
 * Prompt Dialog - Dialog nhập liệu thay thế cho prompt()
 * Giữ nguyên logic: nếu cancel thì return, không lưu giá trị
 */
export function PromptDialog({
    open,
    onOpenChange,
    title = 'Nhập thông tin',
    description,
    label,
    placeholder,
    defaultValue = '',
    type = 'text',
    required = false,
    onConfirm,
    onCancel,
    confirmText = 'OK',
    cancelText = 'Cancel',
    min,
    max
}) {
    const [value, setValue] = useState(defaultValue);
    const [error, setError] = useState('');
    const [isConfirming, setIsConfirming] = useState(false); // Flag để tránh gọi onCancel khi đang confirm

    // Reset value khi dialog mở hoặc defaultValue thay đổi
    useEffect(() => {
        if (open) {
            setValue(defaultValue);
            setError('');
            setIsConfirming(false);
        }
    }, [open, defaultValue]);

    const handleConfirm = () => {
        // Validation
        if (required && (value === '' || value === null || value === undefined)) {
            setError('Vui lòng nhập thông tin này');
            return;
        }

        setIsConfirming(true); // Đánh dấu đang confirm để tránh gọi onCancel

        if (type === 'number') {
            const numValue = Number(value);
            if (isNaN(numValue)) {
                setError('Vui lòng nhập số hợp lệ');
                setIsConfirming(false);
                return;
            }
            if (min !== undefined && numValue < min) {
                setError(`Giá trị phải lớn hơn hoặc bằng ${min}`);
                setIsConfirming(false);
                return;
            }
            if (max !== undefined && numValue > max) {
                setError(`Giá trị phải nhỏ hơn hoặc bằng ${max}`);
                setIsConfirming(false);
                return;
            }
            // Đóng dialog trước
            onOpenChange?.(false);
            // Gọi callback sau khi dialog đóng (để callback có thể mở dialog mới)
            // Sử dụng requestAnimationFrame để đảm bảo DOM đã update
            requestAnimationFrame(() => {
                setTimeout(() => {
                    onConfirm?.(numValue);
                }, 50);
            });
        } else {
            const strValue = String(value || '').trim();
            if (required && strValue === '') {
                setError('Vui lòng nhập thông tin này');
                setIsConfirming(false);
                return;
            }
            // Đóng dialog trước
            onOpenChange?.(false);
            // Gọi callback sau khi dialog đóng (để callback có thể mở dialog mới)
            // Sử dụng requestAnimationFrame để đảm bảo DOM đã update
            requestAnimationFrame(() => {
                setTimeout(() => {
                    onConfirm?.(strValue);
                }, 50);
            });
        }
    };

    const handleCancel = () => {
        if (isConfirming) return; // Nếu đang confirm thì không gọi onCancel
        setError('');
        onCancel?.(); // Gọi onCancel callback (tương đương với return trong prompt)
        onOpenChange?.(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleConfirm();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={(open) => {
            if (!open && !isConfirming) {
                handleCancel(); // Khi đóng dialog (click outside hoặc ESC), coi như cancel (trừ khi đang confirm)
            }
        }}>
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
                    <div className="p-4 border-b border-gray-200">
                        <Dialog.Title className="text-base font-semibold text-gray-900">
                            {title}
                        </Dialog.Title>
                        {description && (
                            <Dialog.Description className="mt-1 text-sm text-gray-600">
                                {description}
                            </Dialog.Description>
                        )}
                    </div>

                    {/* Body */}
                    <div className="p-4">
                        {type === 'textarea' ? (
                            <div>
                                {label && (
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {label} {required && <span className="text-red-500">*</span>}
                                    </label>
                                )}
                                <textarea
                                    value={value}
                                    onChange={(e) => {
                                        setValue(e.target.value);
                                        setError('');
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder={placeholder}
                                    rows={4}
                                    className={clsx(
                                        'block w-full rounded-md border px-3 py-2 text-sm',
                                        'placeholder:text-gray-400',
                                        'focus:outline-none focus:ring-2 focus:ring-offset-0',
                                        error
                                            ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
                                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                    )}
                                    autoFocus
                                />
                                {error && (
                                    <p className="mt-1 text-sm text-red-600">{error}</p>
                                )}
                            </div>
                        ) : (
                            <div>
                                {label && (
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {label} {required && <span className="text-red-500">*</span>}
                                    </label>
                                )}
                                <input
                                    type={type}
                                    value={value}
                                    onChange={(e) => {
                                        setValue(e.target.value);
                                        setError('');
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder={placeholder}
                                    min={min}
                                    max={max}
                                    className={clsx(
                                        'block w-full rounded-md border px-3 py-2 text-sm',
                                        'placeholder:text-gray-400',
                                        'focus:outline-none focus:ring-2 focus:ring-offset-0',
                                        error
                                            ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
                                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                    )}
                                    autoFocus
                                />
                                {error && (
                                    <p className="mt-1 text-sm text-red-600">{error}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-lg">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="rounded px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="rounded px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                            {confirmText}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
