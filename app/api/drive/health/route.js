// app/api/drive/health/route.js
import { NextResponse } from 'next/server';
import { getFileMeta } from '@/lib/drive';

export async function GET() {
    try {
        const meta = await getFileMeta(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
        return NextResponse.json({ ok: true, root: meta });
    } catch (e) {
        return NextResponse.json({ ok: false, message: e.message }, { status: 500 });
    }
}
