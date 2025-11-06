// components/ui/FormActions.js
// Form action buttons (Submit + Cancel)

'use client';

import { Loader2 } from 'lucide-react';

/**
 * FormActions Component
 * Hiển thị nút Submit và Cancel cho form
 * 
 * @param {Object} props
 * @param {string} [props.submitLabel='Submit'] - Text cho nút submit
 * @param {string} [props.cancelLabel='Cancel'] - Text cho nút cancel
 * @param {boolean} [props.isSubmitting=false] - Trạng thái đang submit
 * @param {Function} [props.onCancel] - Callback khi click cancel
 * @param {boolean} [props.showCancel=true] - Hiển thị nút cancel
 */
export default function FormActions({
    submitLabel = 'Submit',
    cancelLabel = 'Cancel',
    isSubmitting = false,
    onCancel,
    showCancel = true,
}) {
    return (
        <div className="flex items-center justify-end gap-3 pt-4">
            {showCancel && onCancel && (
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {cancelLabel}
                </button>
            )}
            <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-700)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2 transition-all duration-200"
            >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Đang xử lý...' : submitLabel}
            </button>
        </div>
    );
}
