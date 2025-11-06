/**
 * @file data/task.data.js
 * @description Data Access Layer for Task-related operations.
 * Contains pure CRUD functions for interacting with the Task model.
 */

import { connectDB } from '@/lib/db';
import Task from '@/model/task.model';
import { safeMongo } from '@/lib/action-utils';

/**
 * Retrieves a list of tasks based on a query.
 * @param {object} query - The MongoDB query object.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of tasks.
 */
export async function findTasks(query) {
    await connectDB();
    return safeMongo(
        Task.find(query)
            .populate('project', 'name statuses')
            .populate('assignee', 'name email avatarUrl')
            .populate('createdBy', 'name email')
            .lean()
            .exec()
    );
}

/**
 * Retrieves a single task by its ID.
 * @param {string} taskId - The ID of the task.
 * @returns {Promise<object|null>} A promise that resolves to the task object or null if not found.
 */
export async function findTaskById(taskId) {
    await connectDB();
    return safeMongo(
        Task.findById(taskId)
            .populate('project', 'name members statuses')
            .populate('assignee', 'name email avatarUrl')
            .populate('createdBy', 'name email')
            .lean()
            .exec()
    );
}

/**
 * Creates a new task in the database.
 * @param {object} taskData - The data for the new task.
 * @returns {Promise<object>} A promise that resolves to the newly created task.
 */
export async function createTask(taskData) {
    await connectDB();
    return safeMongo(Task.create(taskData));
}

/**
 * Updates a task by its ID.
 * @param {string} taskId - The ID of the task to update.
 * @param {object} updateData - The data to update the task with.
 * @returns {Promise<object|null>} A promise that resolves to the updated task.
 */
export async function updateTaskById(taskId, updateData) {
    await connectDB();
    return safeMongo(
        Task.findByIdAndUpdate(taskId, { $set: updateData }, { new: true })
            .lean()
            .exec()
    );
}

/**
 * Deletes a task by its ID.
 * @param {string} taskId - The ID of the task to delete.
 * @returns {Promise<object|null>} A promise that resolves when the task is deleted.
 */
export async function deleteTaskById(taskId) {
    await connectDB();
    return safeMongo(Task.findByIdAndDelete(taskId).lean().exec());
}
