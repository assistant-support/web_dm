/**
 * API endpoint: Search preview (dropdown)
 * GET /api/search/preview?q=keyword
 * Returns: { projects: {...}, tasks: {...}, teams: {...} }
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/request-user';
import { normalizeText } from '@/lib/text-normalize';
import { searchProjects, searchTasks, searchTeams, getAllowedProjectIds } from '@/lib/search-helpers';

export const runtime = 'nodejs';

export async function GET(request) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.externalUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') || '';
        
        if (!q.trim()) {
            return NextResponse.json({
                projects: { items: [], hasMore: false },
                tasks: { items: [], hasMore: false },
                teams: { items: [], hasMore: false }
            });
        }

        const keyword = normalizeText(q);
        const userId = user.externalUserId;
        const isAdmin = user.role === 'admin';

        // Debug logging
        console.log('[Search Preview]', {
            keyword,
            userId,
            isAdmin,
            originalQuery: q
        });

        // Search in priority order: Project → Task → Team
        // Only search next if previous didn't fill quota
        const results = {
            projects: { items: [], hasMore: false },
            tasks: { items: [], hasMore: false },
            teams: { items: [], hasMore: false }
        };

        const TARGET_TOTAL = 9; // Total items to show in dropdown
        let currentTotal = 0;

        // 1. Search Projects (limit 3)
        if (currentTotal < TARGET_TOTAL) {
            const projectLimit = Math.min(3, TARGET_TOTAL - currentTotal);
            const projectResult = await searchProjects(keyword, userId, isAdmin, { limit: projectLimit });
            results.projects = projectResult;
            currentTotal += projectResult.items.length;
        }

        // 2. Search Tasks (limit 3) - only if needed
        if (currentTotal < TARGET_TOTAL) {
            const allowedProjectIds = await getAllowedProjectIds(userId, isAdmin);
            const taskLimit = Math.min(3, TARGET_TOTAL - currentTotal);
            const taskResult = await searchTasks(keyword, userId, isAdmin, { 
                limit: taskLimit,
                allowedProjectIds 
            });
            results.tasks = taskResult;
            currentTotal += taskResult.items.length;
        }

        // 3. Search Teams (limit 3) - only if needed
        if (currentTotal < TARGET_TOTAL) {
            const teamLimit = Math.min(3, TARGET_TOTAL - currentTotal);
            const teamResult = await searchTeams(keyword, userId, isAdmin, { limit: teamLimit });
            results.teams = teamResult;
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error('Search preview error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

