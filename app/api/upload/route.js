import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/request-user.js';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'docs');

async function ensureDir() {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (err) {
        // ignore
    }
}

export async function POST(req) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.externalUserId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file');
        if (!file) {
            return NextResponse.json({ success: false, error: 'Missing file' }, { status: 400 });
        }

        // Validate file type (allow images)
        const contentType = file.type || '';
        if (!contentType.startsWith('image/')) {
            return NextResponse.json({ success: false, error: 'Only images allowed' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await ensureDir();

        const timestamp = Date.now();
        const safeName = (file.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename = `${timestamp}-${safeName}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        await fs.writeFile(filepath, buffer);

        // Return public URL
        const url = `/uploads/docs/${filename}`;
        return NextResponse.json({ success: true, url });
    } catch (err) {
        console.error('POST /api/upload error', err);
        return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
    }
}
