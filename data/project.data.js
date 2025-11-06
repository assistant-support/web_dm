/**
 * @file data/project.data.js
 * @description Data Access Layer for Project-related operations.
 * Contains pure CRUD functions for interacting with the Project model.
 */

import { connectDB } from '@/lib/db';
import Project from '@/model/project.model';
import { safeMongo } from '@/lib/action-utils';

/**
 * Retrieves a list of projects based on a query.
 * @param {object} query - The MongoDB query object.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of projects.
 */
export async function findProjects(query) {
    await connectDB();
    return safeMongo(Project.find(query).populate('team', 'name').lean().exec());
}

/**
 * Retrieves a single project by its ID.
 * @param {string} projectId - The ID of the project.
 * @returns {Promise<object|null>} A promise that resolves to the project object or null if not found.
 */
export async function findProjectById(projectId) {
    await connectDB();
    return safeMongo(Project.findById(projectId).populate('team', 'name').lean().exec());
}

/**
 * Creates a new project in the database.
 * @param {object} projectData - The data for the new project.
 * @returns {Promise<object>} A promise that resolves to the newly created project.
 */
export async function createProject(projectData) {
    await connectDB();
    return safeMongo(Project.create(projectData));
}

/**
 * Updates a project by its ID.
 * @param {string} projectId - The ID of the project to update.
 * @param {object} updateData - The data to update the project with.
 * @returns {Promise<object|null>} A promise that resolves to the updated project.
 */
export async function updateProjectById(projectId, updateData) {
    await connectDB();
    return safeMongo(
        Project.findByIdAndUpdate(projectId, { $set: updateData }, { new: true }).lean().exec()
    );
}

/**
 * Deletes a project by its ID.
 * @param {string} projectId - The ID of the project to delete.
 * @returns {Promise<object|null>} A promise that resolves when the project is deleted.
 */
export async function deleteProjectById(projectId) {
    await connectDB();
    return safeMongo(Project.findByIdAndDelete(projectId).lean().exec());
}

/**
 * Adds a member to a project.
 * @param {string} projectId - The ID of the project.
 * @param {string} userId - The ID of the user to add.
 * @param {string} role - The role of the member (e.g., 'owner', 'manager', 'member').
 * @returns {Promise<object|null>} A promise that resolves to the updated project.
 */
export async function addMemberToProject(projectId, userId, role = 'member') {
    await connectDB();
    return safeMongo(
        Project.findByIdAndUpdate(
            projectId,
            { $addToSet: { members: { userId, role } } },
            { new: true }
        )
            .lean()
            .exec()
    );
}

/**
 * Removes a member from a project.
 * @param {string} projectId - The ID of the project.
 * @param {string} userId - The ID of the user to remove.
 * @returns {Promise<object|null>} A promise that resolves to the updated project.
 */
export async function removeMemberFromProject(projectId, userId) {
    await connectDB();
    return safeMongo(
        Project.findByIdAndUpdate(
            projectId,
            { $pull: { members: { userId } } },
            { new: true }
        )
            .lean()
            .exec()
    );
}
