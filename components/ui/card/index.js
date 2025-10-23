// components/ui/card/index.js
// Mục đích: Card container component

import clsx from 'clsx';

/**
 * Card Component
 * @param {Object} props
 * @param {string} props.title - Tiêu đề card
 * @param {string} props.description - Mô tả ngắn
 * @param {React.ReactNode} props.children - Nội dung card
 * @param {React.ReactNode} props.footer - Footer content
 * @param {'default'|'bordered'|'elevated'} props.variant - Kiểu card
 * @param {boolean} props.hoverable - Có hover effect không
 * @param {string} props.className - Custom classes
 */
export default function Card({
    title,
    description,
    children,
    footer,
    variant = 'default',
    hoverable = false,
    className,
}) {
    const variantClasses = {
        default: 'bg-white border border-gray-200',
        bordered: 'bg-white border-2 border-gray-300',
        elevated: 'bg-white shadow-lg',
    };

    return (
        <div
            className={clsx(
                'rounded-lg overflow-hidden',
                variantClasses[variant],
                hoverable && 'transition-shadow hover:shadow-md cursor-pointer',
                className
            )}
        >
            {(title || description) && (
                <div className="px-4 py-3 border-b border-gray-200">
                    {title && (
                        <h3 className="text-base font-semibold text-gray-900">
                            {title}
                        </h3>
                    )}
                    {description && (
                        <p className="mt-1 text-sm text-gray-500">
                            {description}
                        </p>
                    )}
                </div>
            )}
            <div className="px-4 py-4">
                {children}
            </div>
            {footer && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    {footer}
                </div>
            )}
        </div>
    );
}

/**
 * CardHeader - Header riêng cho Card
 */
export function CardHeader({ title, action, className }) {
    return (
        <div className={clsx('flex items-center justify-between px-4 py-3 border-b border-gray-200', className)}>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {action && <div>{action}</div>}
        </div>
    );
}

/**
 * CardBody - Body riêng cho Card
 */
export function CardBody({ children, className }) {
    return <div className={clsx('px-4 py-4', className)}>{children}</div>;
}

/**
 * CardFooter - Footer riêng cho Card
 */
export function CardFooter({ children, className }) {
    return (
        <div className={clsx('px-4 py-3 bg-gray-50 border-t border-gray-200', className)}>
            {children}
        </div>
    );
}
