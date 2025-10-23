// app/api/users/[userId]/route.js
// Mục đích: API endpoint để lấy thông tin user display

import { NextResponse } from 'next/server';
import { getUserDisplayInfo } from '@/lib/user-display.js';

export async function GET(request, { params }) {
    try {
        const { userId } = await params;
        
        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        const userInfo = await getUserDisplayInfo(userId);

        return NextResponse.json(userInfo);
    } catch (error) {
        console.error('Error in user API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
