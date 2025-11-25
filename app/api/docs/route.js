import { NextResponse } from 'next/server';
import { getSystemDocModel } from '@/model/systemDoc.model.js';
import { getCurrentUser } from '@/lib/request-user.js';

/**
 * Helper to determine whether current user can edit docs
 */
function canEditRole(role) {
    if (!role) return false;
    const r = role.toString().toUpperCase();
    return ['ADMIN', 'PM', 'PROJECT_MANAGER', 'MANAGER'].includes(r);
}

export async function GET(request) {
    try {
        const SystemDoc = await getSystemDocModel();
        const docs = await SystemDoc.find({}).sort({ order: 1, updatedAt: -1 }).lean();
        return NextResponse.json({ success: true, docs });
    } catch (err) {
        console.error('GET /api/docs error', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await getCurrentUser();
        if (!canEditRole(user?.role)) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const SystemDoc = await getSystemDocModel();

        // Allow bulk array save or single object
        const items = Array.isArray(body) ? body : [body];

        const results = [];
        for (const it of items) {
            const docPayload = {
                tabName: it.tabName || it.title || 'Untitled',
                content: it.content || '',
                order: typeof it.order === 'number' ? it.order : 0,
                updatedBy: user?.externalUserId || null,
            };

            if (it._id) {
                const updated = await SystemDoc.findByIdAndUpdate(it._id, { $set: docPayload }, { new: true }).lean();
                results.push(updated);
            } else if (it.id) {
                // try to find by client-generated id stored in tabName metadata? fallback to create new
                const created = await SystemDoc.create(docPayload);
                results.push(created);
            } else {
                const created = await SystemDoc.create(docPayload);
                results.push(created);
            }
        }

        // Return full list after updates
        const docs = await SystemDoc.find({}).sort({ order: 1, updatedAt: -1 }).lean();
        return NextResponse.json({ success: true, docs });
    } catch (err) {
        console.error('POST /api/docs error', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const user = await getCurrentUser();
        if (!canEditRole(user?.role)) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
        }

        const SystemDoc = await getSystemDocModel();
        await SystemDoc.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/docs error', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
