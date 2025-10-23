// components/ui/select/index.js
// Mục đích: Select dropdown component

'use client';

import { forwardRef } from 'react';
import clsx from 'clsx';

/**
 * Select Component
 * @param {Object} props
 * @param {string} props.label - Label của select
 * @param {string} props.error - Error message
 * @param {boolean} props.required - Bắt buộc chọn
 * @param {string} props.helperText - Text hướng dẫn
 * @param {Array<{value: string, label: string}>} props.options - Danh sách options
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.className - Custom classes
 */
const Select = forwardRef(function Select(
    {
        label,
        error,
        required,
        helperText,
        options = [],
        placeholder,
        className,
        id,
        ...props
    },
    ref
) {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className={clsx('w-full', className)}>
            {label && (
                <label
                    htmlFor={selectId}
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <select
                ref={ref}
                id={selectId}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
                className={clsx(
                    'block w-full rounded-md border px-3 py-2 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-offset-0',
                    error
                        ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
                    props.disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed'
                )}
                {...props}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {helperText && !error && (
                <p id={`${selectId}-helper`} className="mt-1 text-sm text-gray-500">
                    {helperText}
                </p>
            )}
            {error && (
                <p id={`${selectId}-error`} className="mt-1 text-sm text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
});

Select.displayName = 'Select';

export default Select;
