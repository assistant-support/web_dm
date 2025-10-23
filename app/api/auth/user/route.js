// app/api/auth/user/route.js
/**
 * API endpoint để lấy thông tin user hiện tại
 * Kết hợp thông tin từ OAuth và local DB
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCurrentUserWithSync } from '@/lib/oauth-client';

export async function GET(request) {
    try {
        // Lấy session từ NextAuth
        const session = await auth();
        
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Chưa đăng nhập' },
                { status: 401 }
            );
        }

        // Lấy và sync user info
        const user = await getCurrentUserWithSync(session);

        if (!user) {
            return NextResponse.json(
                { error: 'User not found', message: 'Không tìm thấy thông tin người dùng' },
                { status: 404 }
            );
        }

        // Trả về thông tin user
        return NextResponse.json({
            success: true,
            user: {
                id: user._id,
                oauthSub: user.oauthSub,
                email: user.email,
                name: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                role: user.role,
                isActive: user.isActive,
            },
            session: {
                expiresAt: session.expiresAt,
                hasAccessToken: !!session.accessToken,
            },
            oauth: user.oauth, // Thông tin từ Authorization Server
        });
    } catch (error) {
        console.error('❌ API /auth/user error:', error);
        return NextResponse.json(
            { 
                error: 'Internal Server Error',
                message: error.message || 'Lỗi khi lấy thông tin người dùng'
            },
            { status: 500 }
        );
    }
}
