// components/ui/Button.jsx
'use client';

import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export default function Button({
    children,
    variant = 'primary', // 'primary' | 'secondary' | 'link' | 'ghost'
    size = 'md',         // 'md' | 'sm'
    icon: Icon,          // Prop to receive an Icon component
    className,           // Prop for additional custom classes
    isLoading = false,   // Destructure isLoading prop with a default value
    disabled,            // Capture disabled prop separately
    ...props             // Remaining props like onClick, type, etc.
}) {
    // Base CSS classes, always applied
    const baseStyles = 'cursor-pointer inline-flex items-center justify-center font-semibold border transition-all duration-300 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed relative';

    // CSS classes for each variant (color scheme)
    const variantStyles = {
        primary: 'bg-[var(--brand-600)] text-white border-transparent hover:bg-[var(--brand-700)] focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-500)] shadow-sm',

        secondary: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-500)] shadow-sm',

        link: 'text-[var(--brand-600)] hover:text-[var(--brand-700)] border-transparent shadow-none !font-medium focus:underline hover:underline',

        // GHOST VARIANT (Mới thêm)
        // - bg-transparent: Nền trong suốt mặc định
        // - hover:bg-gray-100: Nền xám nhẹ khi hover
        // - border-transparent: Không viền
        // - KHÔNG set màu chữ (text-...) khi hover để bạn có thể override bằng className bên ngoài
        ghost: 'bg-transparent text-gray-700 border-transparent hover:bg-gray-100 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 shadow-none',
    };

    // CSS classes for each size
    const sizeStyles = {
        md: 'px-4 py-2.5 text-sm rounded-md',
        sm: 'px-3 py-2 text-sm rounded-md',
    };

    // Combine disabled state from props and isLoading
    const isDisabled = isLoading || disabled;

    // Determine spinner color based on variant
    const spinnerColorClass = (variant === 'primary')
        ? 'text-white'
        : 'text-[var(--brand-600)]';

    return (
        <button
            className={clsx(
                baseStyles,
                variantStyles[variant] || variantStyles.primary, // Fallback variant
                sizeStyles[size] || sizeStyles.md,               // Fallback size
                className,                   // className truyền vào sẽ được ưu tiên (ghi đè style cũ nếu conflict)
                isLoading && 'cursor-wait'   // Add wait cursor when loading
            )}
            disabled={isDisabled}
            {...props}
        >
            {/* Loading Spinner - shown only when isLoading is true */}
            {isLoading && (
                <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className={clsx("h-4 w-4 animate-spin", spinnerColorClass)} />
                </span>
            )}

            {/* Original Content - hidden when loading via opacity to keep button width consistent */}
            <span className={clsx('flex items-center justify-center', isLoading && 'opacity-0')}>
                {/* Render Icon only if provided AND not loading */}
                {Icon && !isLoading && (
                    <Icon
                        className={clsx(
                            "h-4 w-4",
                            children ? "mr-2" : "" // Add margin only if there's text
                        )}
                        aria-hidden="true"
                    />
                )}
                {children}
            </span>
        </button>
    );
}