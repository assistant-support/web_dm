import { NextResponse } from 'next/server';
import { approveTaskCreation, approveTaskCompletion } from '@/data/task/actions/approval.server.js';

export async function POST(request, { params }) {
    try {
        const { taskId } = await params;
        const body = await request.json();
        const { action, type, reason, initialPoints, finalPoints } = body;

        if (action === 'approve') {
            if (type === 'start') {
                const result = await approveTaskCreation(taskId, {
                    approve: true,
                    note: reason || '',
                    initialPoints: Number(initialPoints) || 0
                });
                return NextResponse.json(result);
            } else if (type === 'complete') {
                const result = await approveTaskCompletion(taskId, {
                    approve: true,
                    finalPoints: Number(finalPoints) || 0,
                    note: reason || ''
                });
                return NextResponse.json(result);
            }
        } else if (action === 'reject') {
            if (type === 'start') {
                const result = await approveTaskCreation(taskId, {
                    approve: false,
                    note: reason || 'Từ chối',
                    initialPoints: 0
                });
                return NextResponse.json(result);
            } else if (type === 'complete') {
                const result = await approveTaskCompletion(taskId, {
                    approve: false,
                    finalPoints: 0,
                    note: reason || 'Yêu cầu làm lại'
                });
                return NextResponse.json(result);
            }
        }

        return NextResponse.json(
            { message: 'Invalid action or type' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error in approve API:', error);
        return NextResponse.json(
            { message: error.message || 'Có lỗi xảy ra' },
            { status: error.status || 500 }
        );
    }
}
