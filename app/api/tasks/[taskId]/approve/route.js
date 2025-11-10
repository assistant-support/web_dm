import { NextResponse } from 'next/server';
import { submitTaskApproval } from '@/actions/task-approval.actions';

/**
 * Legacy API route kept for backward compatibility.
 * Prefer calling the submitTaskApproval server action directly.
 */
export async function POST(request, { params }) {
    try {
        const { taskId } = await params;
        const body = await request.json();
        const { action, type, reason, initialPoints, finalPoints } = body;

        const approve = action === 'approve';
        const points = type === 'start' ? initialPoints : finalPoints;

        const result = await submitTaskApproval({
            taskId,
            type,
            approve,
            points,
            note: reason || '',
        });

        return NextResponse.json(result, {
            status: result.success ? 200 : 400,
        });
    } catch (error) {
        console.error('Error in approve API:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Có lỗi xảy ra' },
            { status: error.status || 500 },
        );
    }
}
