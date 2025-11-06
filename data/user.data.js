/**
 * @file data/user.data.js
 * @description Data Access Layer for User-related operations.
 * Contains pure CRUD functions for interacting with the User model.
 */

import { connectDB } from '@/lib/db';
import User from '@/model/user.model';
import { safeMongo } from '@/lib/action-utils';

/**
 * Retrieves a list of users based on a query.
 * @param {object} query - The MongoDB query object.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of users.
 */
export async function findUsers(query) {
    await connectDB();
    return safeMongo(User.find(query).lean().exec());
}

/**
 * Retrieves a single user by their ID.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object|null>} A promise that resolves to the user object or null if not found.
 */
export async function findUserById(userId) {
    await connectDB();
    return safeMongo(User.findById(userId).lean().exec());
}

/**
 * Retrieves a single user by their email.
 * @param {string} email - The email of the user.
 * @returns {Promise<object|null>} A promise that resolves to the user object or null if not found.
 */
export async function findUserByEmail(email) {
    await connectDB();
    return safeMongo(User.findOne({ email }).lean().exec());
}

/**
 * Creates a new user in the database.
 * @param {object} userData - The data for the new user.
 * @returns {Promise<object>} A promise that resolves to the newly created user.
 */
export async function createUser(userData) {
    await connectDB();
    return safeMongo(User.create(userData));
}

/**
 * Updates a user by their ID.
 * @param {string} userId - The ID of the user to update.
 * @param {object} updateData - The data to update the user with.
 * @returns {Promise<object|null>} A promise that resolves to the updated user.
 */
export async function updateUserById(userId, updateData) {
    await connectDB();
    return safeMongo(
        User.findByIdAndUpdate(userId, { $set: updateData }, { new: true })
            .lean()
            .exec()
    );
}

/**
 * Deletes a user by their ID.
 * @param {string} userId - The ID of the user to delete.
 * @returns {Promise<object|null>} A promise that resolves when the user is deleted.
 */
export async function deleteUserById(userId) {
    await connectDB();
    return safeMongo(User.findByIdAndDelete(userId).lean().exec());
}
