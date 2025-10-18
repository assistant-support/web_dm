// Trong file: app/auth/error/page.jsx

'use client';

import { useSearchParams } from 'next/navigation';

// Hàm để lấy thông điệp lỗi thân thiện hơn
const getErrorMessage = (error) => {
    switch (error) {
        case 'OAuthCallbackError':
        case 'AccessDenied':
            return 'Bạn đã từ chối cấp quyền truy cập. Vui lòng thử lại và chấp nhận các điều khoản.';
        default:
            return 'Đã xảy ra lỗi không mong muốn. Vui lòng thử đăng nhập lại.';
    }
};

export default function AuthErrorPage() {
    const searchParams = useSearchParams();
    const errorType = searchParams.get('error');
    const errorMessage = getErrorMessage(errorType);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#1a202c',
            color: 'white',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            padding: '20px'
        }}>
            <div style={{
                padding: '40px',
                backgroundColor: '#2d3748',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
                <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Đăng nhập không thành công</h1>
                <p style={{ color: '#e2e8f0', marginBottom: '24px' }}>
                    {errorMessage}
                </p>
                <a href="/login" style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    backgroundColor: '#4299e1',
                    color: 'white',
                    borderRadius: '5px',
                    textDecoration: 'none'
                }}>
                    Thử lại
                </a>
            </div>
        </div>
    );
}