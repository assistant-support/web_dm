// /data/comment/processors/repo.js
// Cấu trúc: /data/comment/processors/*
// Mục đích: Tầng DB cho Comment (task-only). Trả về PlainComment (serialize) — không trả Mongoose raw.
// Lưu ý:
//  - Model hiện hữu: /model/comment.model.js với fields: task, author, body, mentions
//  - Post-save hook của model tự +1 Task.commentsCount
//  - Xoá: hard-delete và tự giảm Task.commentsCount ở đây

import mongoose from 'mongoose';
import Comment from '@/model/comment.model.js';
import Task from '@/model/task.model.js';
import { asPlainComment } from '@/lib/serialize.js';

const O = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Tạo comment mới (task-only).
 * @param {{ taskId:string, authorId:string, body:string, mentions?:string[] }} params
 * @returns {Promise<object>} PlainComment
 */
export async function createComment({ taskId, authorId, body, mentions = [] }) {
    const doc = await Comment.create({
        task: O(taskId),
        author: String(authorId),
        body,
        mentions: Array.isArray(mentions) ? mentions.map(String) : [],
    });
    return asPlainComment(doc);
}

/**
 * Lấy 1 comment theo id (plain).
 * @param {string} commentId
 */
export async function getById(commentId) {
    const item = await Comment.findById(O(commentId)).lean();
    return item ? asPlainComment(item) : null;
}

/**
 * Danh sách comment theo Task (desc, paging beforeId trên createdAt)
 * @param {string} taskId
 * @param {{ limit?:number, beforeId?:string }} [opts]
 */
export async function listByTask(taskId, { limit = 30, beforeId } = {}) {
    const q = { task: O(taskId) };

    if (beforeId) {
        const pivot = await Comment.findById(O(beforeId)).lean();
        if (pivot?.createdAt) {
            q.createdAt = { $lt: pivot.createdAt };
        }
    }

    const items = await Comment.find(q).sort({ createdAt: -1 }).limit(limit).lean();
    return items.map(asPlainComment);
}

/**
 * Xoá (hard-delete) comment và giảm Task.commentsCount.
 * @param {string} commentId
 * @returns {Promise<object|null>} PlainComment của bản ghi vừa xoá
 */
export async function deleteComment(commentId) {
    const before = await Comment.findById(O(commentId)).lean();
    if (!before) return null;

    await Comment.findByIdAndDelete(O(commentId));

    try {
        if (before.task) {
            await Task.findByIdAndUpdate(O(before.task), { $inc: { commentsCount: -1 } });
        }
    } catch {
        // nuốt lỗi để không chặn luồng
    }

    return asPlainComment(before);
}
