/**
 * @file actions/task.actions.js
 * @description Server Actions for task-related business logic.
 * Encapsulates validation, permission checks, data manipulation, logging, and cache revalidation for tasks.
 */

'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getRequestUser } from '@/lib/request-user';
import { logActivity } from '@/lib/activity';
import { canEditTask, canViewProject } from '@/lib/permissions';
import * as taskData from '@/data/task.data';
import * as projectData from '@/data/project.data';

// Zod schema for creating a task
const CreateTaskSchema = z.object({
    title: z.string().min(1, 'Title is required.'),
    projectId: z.string().min(1, 'Project ID is required.'),
    description: z.string().optional(),
    status: z.string().optional(),
});

// Zod schema for updating a task status (used in drag-and-drop)
const UpdateTaskStatusSchema = z.object({
    status: z.string(),
    order: z.number().min(0),
});

// Zod schema for updating task plan dates (used in calendar view)
const UpdateTaskPlanSchema = z.object({
    plannedStartAt: z.string().optional(),
    plannedDueAt: z.string().optional(),
});


/**
 * Creates a new task within a project.
 * @param {FormData} formData - The form data containing task details.
 * @returns {Promise<{success: boolean, data: object|null, error: string|object|null}>} Result object.
 */
export async function createTask(formData) {
    const user = await getRequestUser();
    if (!user) {
        return { success: false, data: null, error: 'Unauthorized' };
    }

    const rawFormData = Object.fromEntries(formData.entries());
    const validation = CreateTaskSchema.safeParse(rawFormData);

    if (!validation.success) {
        return { success: false, data: null, error: validation.error.flatten().fieldErrors };
    }

    const { projectId, title, description, status } = validation.data;

    try {
        const project = await projectData.findProjectById(projectId);
        if (!project || !canViewProject(project, user.id)) {
            return { success: false, data: null, error: 'Permission denied or project not found.' };
        }

        const newTask = await taskData.createTask({
            title,
            description: description || '',
            projectId,
            team: project.team,
            createdBy: user.id,
            status: status || project.statuses?.[0] || 'todo', // Default to first status or 'todo'
        });

        await logActivity({
            actor: user.id,
            type: 'task.create',
            project: projectId,
            task: newTask._id,
            payload: { title },
        });

        revalidateTag(`tasks-${projectId}`);
        revalidateTag(`project-detail-${projectId}`);
        revalidatePath(`/projects/${projectId}`);

        return { success: true, data: newTask, error: null };
    } catch (error) {
        console.error('Error creating task:', error);
        return { success: false, data: null, error: 'Failed to create task.' };
    }
}

/**
 * Updates the details of an existing task.
 * @param {string} taskId - The ID of the task to update.
 * @param {FormData} formData - The form data with the new details.
 * @returns {Promise<{success: boolean, data: object|null, error: string|object|null}>} Result object.
 */
export async function updateTask(taskId, formData) {
    const user = await getRequestUser();
    if (!user) {
        return { success: false, data: null, error: 'Unauthorized' };
    }

    const task = await taskData.findTaskById(taskId);
    if (!task) {
        return { success: false, data: null, error: 'Task not found.' };
    }

    if (!canEditTask(task, user.id)) {
        return { success: false, data: null, error: 'Permission denied.' };
    }
    
    const updateData = Object.fromEntries(formData.entries());
    // Add more specific Zod validation for updates if needed

    try {
        const updatedTask = await taskData.updateTaskById(taskId, updateData);

        await logActivity({
            actor: user.id,
            type: 'task.update',
            project: task.project,
            task: taskId,
            payload: { changes: updateData },
        });

        revalidateTag(`tasks-${task.project}`);
        revalidateTag(`project-detail-${task.project}`);
        revalidatePath(`/projects/${task.project}`);

        return { success: true, data: updatedTask, error: null };
    } catch (error) {
        console.error(`Error updating task ${taskId}:`, error);
        return { success: false, data: null, error: 'Failed to update task.' };
    }
}

/**
 * Deletes a task.
 * @param {string} taskId - The ID of the task to delete.
 * @returns {Promise<{success: boolean, error: string|null}>} Result object.
 */
export async function deleteTask(taskId) {
    const user = await getRequestUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    const task = await taskData.findTaskById(taskId);
    if (!task) {
        return { success: false, error: 'Task not found.' };
    }

    // Typically, only project managers or the task creator can delete.
    if (!canEditTask(task, user.id)) {
        return { success: false, error: 'Permission denied.' };
    }

    try {
        await taskData.deleteTaskById(taskId);

        await logActivity({
            actor: user.id,
            type: 'task.delete',
            project: task.project,
            task: taskId,
            payload: { title: task.title },
        });

        revalidateTag(`tasks-${task.project}`);
        revalidateTag(`project-detail-${task.project}`);
        revalidatePath(`/projects/${task.project}`);

        return { success: true, error: null };
    } catch (error) {
        console.error(`Error deleting task ${taskId}:`, error);
        return { success: false, error: 'Failed to delete task.' };
    }
}

/**
 * Updates a task's status and/or order, typically for Kanban boards.
 * @param {string} taskId - The ID of the task to move.
 * @param {object} update - The update object.
 * @param {string} update.status - The new status (column).
 * @param {number} update.order - The new order within the column.
 * @returns {Promise<{success: boolean, error: string|null}>} Result object.
 */
export async function updateTaskStatus(taskId, { status, order }) {
    const user = await getRequestUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    const validation = UpdateTaskStatusSchema.safeParse({ status, order });
    if (!validation.success) {
        return { success: false, error: 'Invalid status or order.' };
    }

    const task = await taskData.findTaskById(taskId);
    if (!task) {
        return { success: false, error: 'Task not found.' };
    }

    // Use canEditTask or a more specific permission for moving tasks
    if (!canEditTask(task, user.id)) {
        return { success: false, error: 'Permission denied to move task.' };
    }

    try {
        // Here you might add logic to re-order other tasks in the same column
        // For simplicity, we are just updating the target task for now.
        await taskData.updateTaskById(taskId, { status, kanbanOrder: order });

        await logActivity({
            actor: user.id,
            type: 'task.move',
            project: task.project,
            task: taskId,
            payload: { from: task.status, to: status, newOrder: order },
        });

        // Revalidate the tags for the project's tasks
        revalidateTag(`tasks-${task.project}`);
        revalidateTag(`project-detail-${task.project}`);
        // No need to revalidate the whole path if the page updates via tags
        
        return { success: true, error: null };
    } catch (error) {
        console.error(`Error updating task status for ${taskId}:`, error);
        return { success: false, error: 'Failed to update task status.' };
    }
}

/**
 * Updates a task's planned dates for calendar/timeline views.
 * @param {string} taskId - The ID of the task to update.
 * @param {string} plannedStartAt - ISO date string for planned start.
 * @param {string} plannedDueAt - ISO date string for planned due date.
 * @returns {Promise<{success: boolean, error: string|null}>} Result object.
 */
export async function updateTaskPlan(taskId, plannedStartAt, plannedDueAt) {
    const user = await getRequestUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    const validation = UpdateTaskPlanSchema.safeParse({ plannedStartAt, plannedDueAt });
    if (!validation.success) {
        return { success: false, error: 'Invalid date format.' };
    }

    const task = await taskData.findTaskById(taskId);
    if (!task) {
        return { success: false, error: 'Task not found.' };
    }

    if (!canEditTask(task, user.id)) {
        return { success: false, error: 'Permission denied.' };
    }

    try {
        await taskData.updateTaskById(taskId, { 
            plannedStartAt: plannedStartAt || null,
            plannedDueAt: plannedDueAt || null,
        });

        await logActivity({
            actor: user.id,
            type: 'task.plan.update',
            project: task.project,
            task: taskId,
            payload: { plannedStartAt, plannedDueAt },
        });

        revalidateTag(`tasks-${task.project}`);
        revalidateTag(`project-detail-${task.project}`);
        
        return { success: true, error: null };
    } catch (error) {
        console.error(`Error updating task plan for ${taskId}:`, error);
        return { success: false, error: 'Failed to update task plan.' };
    }
}
