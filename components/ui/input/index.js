// components/ui/form-elements.js
// Thư viện các component biểu mẫu có thể tái sử dụng

'use client';

import { forwardRef, useId } from 'react';
import clsx from 'clsx';

// --- Helper Icon (Sử dụng nội bộ) ---
const ChevronDownIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="m6 9 6 6 6-6" />
    </svg>
);

const CheckIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);


// --- 1. INPUT COMPONENT (Đã hoàn thiện) ---
/**
 * Input Component
 * @param {string} props.variant - 'default' | 'on-color' | 'search'
 */
export const Input = forwardRef(function Input(
    { label, error, required, helperText, className, id, type = 'text', variant = 'default', leftIcon, rightIcon, ...props },
    ref
) {
    const internalId = useId();
    const inputId = id || internalId;

    const variantClasses = {
        default: 'border border-gray-200 bg-white text-foreground hover:border-muted-200 focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/30',
        'on-color': 'bg-white/10 border border-white/30 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-white/70 focus:ring-2 focus:ring-white/30',
        search: 'rounded-lg shadow-sm border border-gray-200 bg-white text-foreground hover:shadow-md focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/20',
    };

    return (
        <div className={clsx('w-full', className)}>
            {label && (
                <label htmlFor={inputId} className={clsx('block text-sm font-medium mb-1', variant === 'on-color' ? 'text-white/90' : 'text-gray-700')}>
                    {label} {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                {leftIcon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{leftIcon}</div>}
                <input
                    ref={ref}
                    id={inputId}
                    type={type}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
                    className={clsx(
                        'block w-full rounded-md text-sm transition-all duration-200 focus:outline-none',
                        'placeholder:text-muted-400',
                        leftIcon ? 'pl-10' : 'pl-3',
                        rightIcon ? 'pr-10' : 'pr-3',
                        variant === 'search' ? 'py-2.5' : 'py-2',
                        error ? 'border-red-300 text-red-900 placeholder:text-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/50' : variantClasses[variant],
                        props.disabled && 'bg-muted-50 text-muted-500 cursor-not-allowed border-muted-200'
                    )}
                    {...props}
                />
                {rightIcon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{rightIcon}</div>}
            </div>
            {helperText && !error && <p id={`${inputId}-helper`} className={clsx('mt-1 text-sm', variant === 'on-color' ? 'text-white/70' : 'text-gray-500')}>{helperText}</p>}
            {error && <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
});
Input.displayName = 'Input';


// --- 2. TEXTAREA COMPONENT ---
/**
 * Textarea Component
 */
export const Textarea = forwardRef(function Textarea(
    { label, error, required, helperText, className, id, ...props },
    ref
) {
    const internalId = useId();
    const textareaId = id || internalId;

    const baseClasses = 'border-muted-100 bg-white text-foreground hover:border-muted-200 focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/30';

    return (
        <div className={clsx('w-full', className)}>
            {label && (
                <label htmlFor={textareaId} className="block text-sm font-medium mb-1 text-gray-700">
                    {label} {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <textarea
                ref={ref}
                id={textareaId}
                rows={4}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
                className={clsx(
                    'block w-full border border-gray-200 rounded-md text-sm transition-all duration-200 focus:outline-none',
                    'placeholder:text-muted-400 p-3', // Padding phù hợp cho textarea
                    error ? 'border-red-300 text-red-900 placeholder:text-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/50' : baseClasses,
                    props.disabled && 'bg-muted-50 text-muted-500 cursor-not-allowed border-muted-200'
                )}
                {...props}
            />
            {helperText && !error && <p id={`${textareaId}-helper`} className="mt-1 text-sm text-gray-500">{helperText}</p>}
            {error && <p id={`${textareaId}-error`} className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
});
Textarea.displayName = 'Textarea';


// --- 3. SELECT COMPONENT ---
/**
 * Select/Dropdown Component
 */
export const Select = forwardRef(function Select(
    { label, error, required, helperText, className, id, children, ...props },
    ref
) {
    const internalId = useId();
    const selectId = id || internalId;

    const baseClasses = 'border-muted-100 bg-white text-foreground hover:border-muted-200 focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/30';

    return (
        <div className={clsx('w-full', className)}>
            {label && (
                <label htmlFor={selectId} className="block text-sm font-medium mb-1 text-gray-700">
                    {label} {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <select
                    ref={ref}
                    id={selectId}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
                    className={clsx(
                        'block w-full border border-gray-200 appearance-none rounded-md py-2 pl-3 pr-10 text-sm transition-all duration-200 focus:outline-none',
                        error ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-500/50' : baseClasses,
                        props.disabled && 'bg-muted-50 text-muted-500 cursor-not-allowed border-muted-200'
                    )}
                    {...props}
                >
                    {children}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                </div>
            </div>
            {helperText && !error && <p id={`${selectId}-helper`} className="mt-1 text-sm text-gray-500">{helperText}</p>}
            {error && <p id={`${selectId}-error`} className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
});
Select.displayName = 'Select';


// --- 4. CHECKBOX COMPONENT ---
/**
 * Checkbox Component
 */
export const Checkbox = forwardRef(function Checkbox(
    { label, error, helperText, className, id, ...props },
    ref
) {
    const internalId = useId();
    const checkboxId = id || internalId;

    return (
        <div className={clsx('w-full', className)}>
            <div className="flex items-start">
                <div className="flex h-6 items-center">
                    <input
                        ref={ref}
                        id={checkboxId}
                        type="checkbox"
                        aria-describedby={error ? `${checkboxId}-error` : helperText ? `${checkboxId}-helper` : undefined}
                        className={clsx(
                            "peer h-4 w-4 rounded border-gray-300 text-[var(--brand-600)] transition-colors duration-200",
                            "focus:ring-2 focus:ring-[var(--brand-600)]/50 focus:ring-offset-2",
                            "disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                        {...props}
                    />
                </div>
                {label && (
                    <div className="ml-3 text-sm">
                        <label htmlFor={checkboxId} className="font-medium text-gray-700 select-none">
                            {label}
                        </label>
                        {helperText && !error && <p id={`${checkboxId}-helper`} className="text-gray-500">{helperText}</p>}
                    </div>
                )}
            </div>
            {error && <p id={`${checkboxId}-error`} className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
});
Checkbox.displayName = 'Checkbox';


// --- 5. RADIO GROUP COMPONENT ---
/**
 * Radio Group Component
 * Bao gồm RadioGroup (container) và RadioGroup.Item (lựa chọn)
 */
const RadioGroupItem = forwardRef(function RadioGroupItem(
    { label, className, id, ...props },
    ref
) {
    const internalId = useId();
    const radioId = id || internalId;

    return (
        <div className={clsx('flex items-center', className)}>
            <input
                ref={ref}
                id={radioId}
                type="radio"
                className={clsx(
                    "h-4 w-4 border-gray-300 text-[var(--brand-600)] transition-colors duration-200",
                    "focus:ring-2 focus:ring-[var(--brand-600)]/50 focus:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                )}
                {...props}
            />
            <label htmlFor={radioId} className="ml-3 block text-sm font-medium text-gray-700 select-none">
                {label}
            </label>
        </div>
    );
});
RadioGroupItem.displayName = 'RadioGroup.Item';

export const RadioGroup = ({ label, required, error, helperText, className, children }) => {
    const internalId = useId();
    const groupId = `radiogroup-${internalId}`;

    return (
        <div className={clsx('w-full', className)} role="radiogroup" aria-labelledby={`${groupId}-label`}>
            {label && (
                <label id={`${groupId}-label`} className="block text-sm font-medium mb-2 text-gray-700">
                    {label} {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="space-y-2">
                {children}
            </div>
            {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
};
RadioGroup.displayName = 'RadioGroup';

// Gán Item vào component cha để dễ import: import { RadioGroup } from '...' và dùng <RadioGroup.Item ... />
RadioGroup.Item = RadioGroupItem;
