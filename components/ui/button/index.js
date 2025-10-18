// components/ui/Button.jsx

import React from 'react';
import { clsx } from 'clsx';

export default function Button({
    children,
    variant = 'primary', // 'primary' | 'secondary' | 'link'
    size = 'md',         // 'md' | 'sm'
    icon: Icon,          // Prop để nhận một component Icon
    className,           // Prop để nhận thêm các class tùy chỉnh
    ...props             // Các props còn lại như onClick, type, disabled
}) {
    // Định nghĩa các lớp CSS cơ bản, luôn được áp dụng
    const baseStyles = 'cursor-pointer inline-flex items-center justify-center font-semibold border transition-all duration-300 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed';

    // Định nghĩa các lớp CSS cho từng variant (màu sắc)
    const variantStyles = {
        primary: 'bg-brand text-white border-transparent hover:bg-brand-dark hover:shadow-brand',
        secondary: 'bg-muted-100 text-body border-muted hover:bg-muted-200 focus:ring-brand',
        link: 'text-brand hover:text-brand-dark border-transparent !font-medium',
    };

    // Định nghĩa các lớp CSS cho từng size (kích thước)
    const sizeStyles = {
        md: 'px-4 py-2.5 text-base rounded-md',
        sm: 'px-3 py-2 text-sm rounded-sm',
    };

    return (
        <button className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)} {...props}  >
            {Icon && <Icon className="mr-2 h-5 w-5" aria-hidden="true" />}
            {children}
        </button>
    );
}