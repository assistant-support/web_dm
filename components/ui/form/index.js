// components/ui/form/index.js
// Mục đích: Form wrapper component cho react-hook-form

'use client';

import { forwardRef } from 'react';
import clsx from 'clsx';

/**
 * Form Component - Wrapper cho react-hook-form
 * @param {Object} props
 * @param {Function} props.onSubmit - Submit handler
 * @param {React.ReactNode} props.children - Form fields
 * @param {string} props.className - Custom classes
 * @param {Array<string>} props.errors - Global form errors (optional)
 */
const Form = forwardRef(function Form(
    {
        onSubmit,
        children,
        className,
        errors = [],
        ...props
    },
    ref
) {
    return (
        <form
            ref={ref}
            onSubmit={onSubmit}
            className={clsx('space-y-4', className)}
            {...props}
        >
            {errors.length > 0 && (
                <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg
                                className="h-5 w-5 text-red-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                                Có {errors.length} lỗi trong form:
                            </h3>
                            <div className="mt-2 text-sm text-red-700">
                                <ul className="list-disc space-y-1 pl-5">
                                    {errors.map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {children}
        </form>
    );
});

Form.displayName = 'Form';

export default Form;

/**
 * FormField - Wrapper cho một field với label và error
 */
export function FormField({ label, required, error, helperText, children, className }) {
    return (
        <div className={clsx('w-full', className)}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            {children}
            {helperText && !error && (
                <p className="mt-1 text-sm text-gray-500">{helperText}</p>
            )}
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}

/**
 * FormActions - Container cho các action buttons
 */
export function FormActions({ children, align = 'right', className }) {
    const alignClasses = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
    };

    return (
        <div className={clsx('flex items-center gap-3 pt-4', alignClasses[align], className)}>
            {children}
        </div>
    );
}
