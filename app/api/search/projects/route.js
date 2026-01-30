/**
 * API endpoint: Search all projects
 * GET /api/search/projects?q=keyword&cursor=...
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/request-user';
import { normalizeText } from '@/lib/text-normalize';
import { searchProjects } from '@/lib/search-helpers';

export const runtime = 'nodejs';

export async function GET(request) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.externalUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') || '';
        const cursor = searchParams.get('cursor') || null;
        
        if (!q.trim()) {
            return NextResponse.json({ items: [], hasMore: false, nextCursor: null });
        }

        const keyword = normalizeText(q);
        const userId = user.externalUserId;
        const isAdmin = user.role === 'admin';

        const result = await searchProjects(keyword, userId, isAdmin, {
            limit: 20,
            cursor
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Search projects error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

