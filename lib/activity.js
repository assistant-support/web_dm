/**
 * @file lib/activity.js
 * @description Provides a fire-and-forget function to log user activities without blocking the main execution thread.
 */

'use server';

import { connectDB } from '@/lib/db.js';
import ActivityLog from '@/model/activityLog.model.js';

/**
 * Logs an activity to the database without throwing errors.
 * If logging fails, it logs a warning to the console.
 * @param {object} params - The activity log parameters.
 * @param {string} [params.actor] - The ID of the user performing the action.
 * @param {string} [params.project] - The ID of the related project.
 * @param {string} [params.team] - The ID of the related team.
 * @param {string} [params.task] - The ID of the related task.
 * @param {string} params.type - The type of activity (e.g., 'project.create').
 * @param {object} [params.payload] - Additional data related to the activity.
 * @returns {Promise<void>}
 */
export async function logActivity({ actor, project, team, task, type, payload }) {
    try {
        await connectDB();
        await ActivityLog.create({
            actor: actor ?? null,
            project: project ?? null,
            team: team ?? null,
            task: task ?? null,
            type,
            payload: payload || {},
        });
    } catch (e) {
        console.warn('[ActivityLog] Failed to log activity:', e?.message || e);
    }
}
