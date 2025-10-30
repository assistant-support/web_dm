// components/ui/Button.jsx
'use client'; // Assuming this might be used in Client Components

import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react'; // Import the loader icon

export default function Button({
    children,
    variant = 'primary', // 'primary' | 'secondary' | 'link'
    size = 'md',        // 'md' | 'sm'
    icon: Icon,         // Prop to receive an Icon component
    className,          // Prop for additional custom classes
    isLoading = false,  // Destructure isLoading prop with a default value
    disabled,           // Capture disabled prop separately
    ...props            // Remaining props like onClick, type, etc.
}) {
    // Base CSS classes, always applied
    const baseStyles = 'cursor-pointer inline-flex items-center justify-center font-semibold border transition-all duration-300 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed relative'; // Added relative for spinner positioning

    // CSS classes for each variant (color scheme)
    const variantStyles = {
        // Assuming these color variables are defined in your CSS
        primary: 'bg-[var(--brand-600)] text-white border-transparent hover:bg-[var(--brand-700)] focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-500)]', // Added focus rings
        secondary: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-500)]', // Adjusted secondary style
        link: 'text-[var(--brand-600)] hover:text-[var(--brand-700)] border-transparent !font-medium focus:underline', // Adjusted link style
    };

    // CSS classes for each size
    const sizeStyles = {
        md: 'px-4 py-2.5 text-sm rounded-md', // Adjusted text size to sm for md button
        sm: 'px-3 py-2 text-sm rounded-md', // Adjusted sm rounded
    };

    // Combine disabled state from props and isLoading
    const isDisabled = isLoading || disabled;

    return (
        <button
            className={clsx(
                baseStyles,
                variantStyles[variant] || variantStyles.primary, // Fallback variant
                sizeStyles[size] || sizeStyles.md, // Fallback size
                className,
                isLoading && 'cursor-wait' // Add wait cursor when loading
            )}
            disabled={isDisabled} // Use combined disabled state
            {...props} // Spread the rest of the props (excluding isLoading, disabled, etc.)
        >
            {/* Loading Spinner - shown only when isLoading is true */}
            {isLoading && (
                <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className={clsx(
                        "h-4 w-4 animate-spin",
                        variant === 'primary' ? 'text-white' : 'text-[var(--brand-600)]' // Adjust spinner color based on variant if needed
                    )} />
                </span>
            )}

            {/* Original Content - hidden when loading */}
            <span className={clsx('flex items-center justify-center', isLoading && 'opacity-0')}>
                {/* Render Icon only if provided AND not loading */}
                {Icon && !isLoading && (
                    <Icon
                        className={clsx(
                            "h-4 w-4", // Consistent icon size
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