// components/ui/textarea/index.js
// Mục đích: Textarea component tích hợp với react-hook-form

'use client';

import { forwardRef } from 'react';
import clsx from 'clsx';

/**
 * Textarea Component
 * @param {Object} props
 * @param {string} props.label - Label của textarea
 * @param {string} props.error - Error message
 * @param {boolean} props.required - Bắt buộc nhập
 * @param {string} props.helperText - Text hướng dẫn
 * @param {number} props.rows - Số dòng
 * @param {string} props.className - Custom classes
 */
const Textarea = forwardRef(function Textarea(
    {
        label,
        error,
        required,
        helperText,
        rows = 3,
        className,
        id,
        ...props
    },
    ref
) {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className={clsx('w-full', className)}>
            {label && (
                <label
                    htmlFor={textareaId}
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <textarea
                ref={ref}
                id={textareaId}
                rows={rows}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
                className={clsx(
                    'block w-full rounded-md border px-3 py-2 text-sm',
                    'placeholder:text-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-offset-0',
                    error
                        ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
                    props.disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed'
                )}
                {...props}
            />
            {helperText && !error && (
                <p id={`${textareaId}-helper`} className="mt-1 text-sm text-gray-500">
                    {helperText}
                </p>
            )}
            {error && (
                <p id={`${textareaId}-error`} className="mt-1 text-sm text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
});

Textarea.displayName = 'Textarea';

export default Textarea;
