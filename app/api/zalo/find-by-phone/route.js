import { NextResponse } from 'next/server';

/**
 * API tìm UID Zalo từ số điện thoại
 * POST /api/zalo/find-by-phone
 * Body: { phone: string }
 * 
 * NOTE: Đây là mock API. Trong production, bạn cần tích hợp với Zalo API thực tế.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { phone } = body;

        if (!phone) {
            return NextResponse.json(
                { error: 'Phone number is required' },
                { status: 400 }
            );
        }

        // Mock data - Trong production, gọi Zalo API thực tế
        // Ví dụ: const zaloResponse = await fetch('https://openapi.zalo.me/v2.0/user/info', ...)
        
        // Giả lập tìm UID
        const mockUidMapping = {
            '0912345678': { uid: '1234567890123456789', name: 'Nguyễn Văn A' },
            '0987654321': { uid: '9876543210987654321', name: 'Trần Thị B' },
            '0909090909': { uid: '1111111111111111111', name: 'Lê Văn C' },
        };

        const cleanPhone = phone.replace(/[\s\-]/g, '');
        const result = mockUidMapping[cleanPhone];

        if (!result) {
            return NextResponse.json(
                { 
                    error: 'UID not found',
                    message: 'Không tìm thấy tài khoản Zalo với số điện thoại này. Vui lòng kiểm tra lại số điện thoại hoặc đảm bảo số điện thoại đã đăng ký Zalo.'
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            uid: result.uid,
            name: result.name,
            phone: cleanPhone,
            source: 'zalo'
        });

    } catch (error) {
        console.error('Find UID by phone error:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error',
                message: error.message 
            },
            { status: 500 }
        );
    }
}
