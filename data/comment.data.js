/**
 * @file data/comment.data.js
 * @description Data Access Layer for Comment-related operations.
 * Contains pure CRUD functions for interacting with the Comment model.
 */

import { connectDB } from '@/lib/db';
import Comment from '@/model/comment.model';
import { safeMongo } from '@/lib/action-utils';

/**
 * Retrieves a list of comments based on a query.
 * @param {object} query - The MongoDB query object.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of comments.
 */
export async function findComments(query) {
    await connectDB();
    return safeMongo(
        Comment.find(query)
            .populate('author', 'name email avatarUrl')
            .sort({ createdAt: -1 })
            .lean()
            .exec()
    );
}

/**
 * Retrieves a single comment by its ID.
 * @param {string} commentId - The ID of the comment.
 * @returns {Promise<object|null>} A promise that resolves to the comment object or null if not found.
 */
export async function findCommentById(commentId) {
    await connectDB();
    return safeMongo(Comment.findById(commentId).lean().exec());
}

/**
 * Creates a new comment in the database.
 * @param {object} commentData - The data for the new comment.
 * @returns {Promise<object>} A promise that resolves to the newly created comment.
 */
export async function createComment(commentData) {
    await connectDB();
    return safeMongo(Comment.create(commentData));
}

/**
 * Deletes a comment by its ID.
 * @param {string} commentId - The ID of the comment to delete.
 * @returns {Promise<object|null>} A promise that resolves when the comment is deleted.
 */
export async function deleteCommentById(commentId) {
    await connectDB();
    return safeMongo(Comment.findByIdAndDelete(commentId).lean().exec());
}
