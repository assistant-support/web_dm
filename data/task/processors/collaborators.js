// data/task/processors/collaborators.js
// Mục đích: Quản lý collaborators (người được mời vào task)

import Task from '@/model/task.model.js';
import { AppError } from '@/lib/errors.js';

/**
 * Thêm collaborator vào task
 * @param {string} taskId - Task ID
 * @param {Object} params - { userId, invitedBy, role }
 * @returns {Promise<Object>} - Updated task
 */
export async function addCollaborator(taskId, { userId, invitedBy, role = 'contributor' }) {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 'NOT_FOUND', 404);
    
    // Check duplicate
    const exists = task.collaborators?.find(c => String(c.userId) === String(userId));
    if (exists) throw new AppError('User already added as collaborator', 'BAD_REQUEST', 400);
    
    // Initialize if needed
    if (!task.collaborators) {
        task.collaborators = [];
    }
    
    task.collaborators.push({
        userId: String(userId),
        invitedBy: String(invitedBy),
        invitedAt: new Date(),
        role: role || 'contributor',
    });
    
    await task.save();
    return task;
}

/**
 * Accept collaboration invitation
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID accepting
 * @returns {Promise<Object>} - Updated task
 */
export async function acceptCollaboration(taskId, userId) {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 'NOT_FOUND', 404);
    
    const collab = task.collaborators?.find(c => String(c.userId) === String(userId));
    if (!collab) throw new AppError('No invitation found', 'NOT_FOUND', 404);
    
    if (collab.acceptedAt) {
        throw new AppError('Already accepted', 'BAD_REQUEST', 400);
    }
    
    collab.acceptedAt = new Date();
    await task.save();
    return task;
}

/**
 * Remove collaborator from task
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID to remove
 * @returns {Promise<Object>} - Updated task
 */
export async function removeCollaborator(taskId, userId) {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 'NOT_FOUND', 404);
    
    if (!task.collaborators) {
        throw new AppError('No collaborators', 'BAD_REQUEST', 400);
    }
    
    const index = task.collaborators.findIndex(c => String(c.userId) === String(userId));
    if (index === -1) {
        throw new AppError('Collaborator not found', 'NOT_FOUND', 404);
    }
    
    task.collaborators.splice(index, 1);
    await task.save();
    return task;
}

/**
 * Check if user is collaborator (và đã accept)
 * @param {Object} task - Task object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function isCollaborator(task, userId) {
    if (!task?.collaborators || !userId) return false;
    return task.collaborators.some(c => 
        String(c.userId) === String(userId) && c.acceptedAt
    );
}

/**
 * Check if user has pending invitation
 * @param {Object} task - Task object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function hasPendingInvitation(task, userId) {
    if (!task?.collaborators || !userId) return false;
    return task.collaborators.some(c => 
        String(c.userId) === String(userId) && !c.acceptedAt
    );
}
