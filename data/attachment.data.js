/**
 * @file data/attachment.data.js
 * @description Data Access Layer for Attachment-related operations.
 * Contains pure CRUD functions for interacting with the Attachment model.
 */

import { connectDB } from '@/lib/db';
import Attachment from '@/model/attachment.model';
import { safeMongo } from '@/lib/action-utils';

/**
 * Retrieves a list of attachments based on a query.
 * @param {object} query - The MongoDB query object.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of attachments.
 */
export async function findAttachments(query) {
    await connectDB();
    return safeMongo(
        Attachment.find(query)
            .populate('uploadedBy', 'name email avatarUrl')
            .sort({ createdAt: -1 })
            .lean()
            .exec()
    );
}

/**
 * Retrieves a single attachment by its ID.
 * @param {string} attachmentId - The ID of the attachment.
 * @returns {Promise<object|null>} A promise that resolves to the attachment object or null if not found.
 */
export async function findAttachmentById(attachmentId) {
    await connectDB();
    return safeMongo(Attachment.findById(attachmentId).lean().exec());
}

/**
 * Creates a new attachment in the database.
 * @param {object} attachmentData - The data for the new attachment.
 * @returns {Promise<object>} A promise that resolves to the newly created attachment.
 */
export async function createAttachment(attachmentData) {
    await connectDB();
    return safeMongo(Attachment.create(attachmentData));
}

/**
 * Deletes an attachment by its ID.
 * @param {string} attachmentId - The ID of the attachment to delete.
 * @returns {Promise<object|null>} A promise that resolves when the attachment is deleted.
 */
export async function deleteAttachmentById(attachmentId) {
    await connectDB();
    return safeMongo(Attachment.findByIdAndDelete(attachmentId).lean().exec());
}
