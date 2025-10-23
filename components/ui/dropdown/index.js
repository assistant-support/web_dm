// components/ui/Dropdown.js (Giả sử đây là tên file)

'use client';

import React, { useState, useRef, useContext, createContext, useEffect } from 'react';
import styles from './index.module.css';

// --- 1. Tạo Context để chia sẻ state giữa các component con ---
// THÊM "export" VÀO ĐÂY
export const DropdownContext = createContext();

// --- Hook tùy chỉnh để xử lý click ra ngoài (lấy từ code cũ của bạn) ---
function useClickOutside(ref, handler) {
    useEffect(() => {
        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) {
                return;
            }
            handler(event);
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}

// --- 2. Component Cha: Quản lý State và Context ---
function Dropdown({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    useClickOutside(wrapperRef, () => setIsOpen(false));

    return (
        <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
            <div ref={wrapperRef} className="relative">
                {children}
            </div>
        </DropdownContext.Provider>
    );
}

// --- 3. Component Con: Trigger (Phần tử kích hoạt) ---
function Trigger({ children }) {
    const { isOpen, setIsOpen } = useContext(DropdownContext);

    // Dùng React.cloneElement để thêm onClick vào phần tử con
    // mà không cần phải bọc nó trong một thẻ div/button khác.
    return React.cloneElement(children, {
        onClick: (e) => {
            e.preventDefault();
            setIsOpen(!isOpen);
        },
        'aria-haspopup': 'true',
        'aria-expanded': isOpen,
    });
}

// --- 4. Component Con: Content (Nội dung Popup) ---
function Content({ children, position = 'bottom-left', width = 'w-auto', className = '' }) {
    const { isOpen } = useContext(DropdownContext);

    // Định nghĩa các lớp CSS cho vị trí
    const positionClasses = {
        'bottom-left': 'absolute top-full mt-2 left-0',
        'bottom-right': 'absolute top-full mt-2 right-0',
    };

    if (!isOpen) {
        return null; // Không render gì cả nếu đang đóng
    }

    return (
        <div
            className={`
                ${positionClasses[position]}
                ${width}
                rounded-lg bg-white shadow-lg ring-1 ring-black/5
                ${styles.menu} ${isOpen ? styles.menuOpen : ''}
                ${className}
            `}
            role="menu"
        >
            {children}
        </div>
    );
}

// Gán các component con vào component cha
Dropdown.Trigger = Trigger;
Dropdown.Content = Content;

export default Dropdown;