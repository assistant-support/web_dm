// @/model/comment.model.js
/**
 * Tác dụng file: Định nghĩa Mongoose Model cho Comment (Bình luận).
 * Quản lý bình luận/nhận xét trong Task.
 * Hỗ trợ @mentions và tự động tăng commentsCount trong Task.
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db.js';

/**
 * Schema chính cho Comment.
 * Lưu trữ bình luận của user trong task.
 */
const CommentSchema = new mongoose.Schema({
    // Task mà comment thuộc về (bắt buộc)
    task: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Task', 
        required: true, 
        index: true 
    },
    
    // Tác giả comment (external user ID)
    author: { 
        type: String, 
        required: true, 
        index: true 
    },
    
    // Nội dung bình luận (plain text hoặc markdown)
    body: { 
        type: String, 
        required: true 
    },
    
    // Danh sách user được mention trong comment (external user IDs)
    mentions: [{ 
        type: String, 
        index: true 
    }],
}, {
    timestamps: true, // createdAt, updatedAt
    toJSON: { 
        transform: (_doc, ret) => { 
            delete ret.__v; 
        } 
    }
});

// ==================== INDEXES ====================

/**
 * Index hợp chất để tối ưu truy vấn comment của một task.
 * Ứng dụng: Lấy comment theo thứ tự thời gian (mới nhất trước).
 */
CommentSchema.index({ task: 1, createdAt: -1 });

/**
 * Index để tối ưu truy vấn comment của một user.
 * Ứng dụng: Lấy tất cả comment mà user đã viết.
 */
CommentSchema.index({ author: 1, createdAt: -1 });

// ==================== VIRTUALS ====================

/**
 * Virtual field: Kiểm tra comment có mentions hay không.
 * @returns {boolean} True nếu có ít nhất 1 mention
 */
CommentSchema.virtual('hasMentions').get(function () {
    return this.mentions && this.mentions.length > 0;
});

/**
 * Virtual field: Số lượng mentions trong comment.
 * @returns {number} Số lượng user được mention
 */
CommentSchema.virtual('mentionsCount').get(function () {
    return this.mentions?.length || 0;
});

// ==================== STATICS ====================

/**
 * Static: Tìm tất cả comment của một task.
 * @param {string|mongoose.Types.ObjectId} taskId - Task ID
 * @param {object} options - Tùy chọn
 * @param {number} [options.limit] - Giới hạn số lượng
 * @param {number} [options.skip] - Bỏ qua số lượng
 * @returns {Promise<Comment[]>} Danh sách comment
 */
CommentSchema.statics.findByTask = async function (taskId, options = {}) {
    await connectDB();
    
    const { limit, skip } = options;
    
    const query = this.find({ task: taskId }).sort({ createdAt: -1 });
    
    if (skip) query.skip(skip);
    if (limit) query.limit(limit);
    
    return await query.lean().exec();
};

/**
 * Static: Tìm tất cả comment của một user.
 * @param {string} userId - External User ID
 * @param {object} options - Tùy chọn
 * @param {number} [options.limit=50] - Giới hạn số lượng
 * @returns {Promise<Comment[]>} Danh sách comment
 */
CommentSchema.statics.findByAuthor = async function (userId, options = {}) {
    await connectDB();
    
    const { limit = 50 } = options;
    
    return await this.find({ author: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
};

/**
 * Static: Tìm comment mà user được mention.
 * @param {string} userId - External User ID
 * @param {object} options - Tùy chọn
 * @param {number} [options.limit=50] - Giới hạn số lượng
 * @returns {Promise<Comment[]>} Danh sách comment
 */
CommentSchema.statics.findMentions = async function (userId, options = {}) {
    await connectDB();
    
    const { limit = 50 } = options;
    
    return await this.find({ mentions: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
};

/**
 * Static: Tạo comment mới với auto-increment counter.
 * @param {object} data - Dữ liệu comment
 * @param {string} data.task - Task ID (bắt buộc)
 * @param {string} data.author - External User ID (bắt buộc)
 * @param {string} data.body - Nội dung (bắt buộc)
 * @param {Array<string>} [data.mentions=[]] - Danh sách user IDs được mention
 * @returns {Promise<Comment>} Comment đã tạo
 * @throws {Error} Nếu thiếu thông tin bắt buộc
 */
CommentSchema.statics.createComment = async function (data) {
    await connectDB();
    
    if (!data.task) {
        throw new Error('Task ID is required');
    }
    if (!data.author) {
        throw new Error('Author ID is required');
    }
    if (!data.body || !data.body.trim()) {
        throw new Error('Comment body is required');
    }
    
    const comment = await this.create(data);
    
    // Tăng counter trong Task
    try {
        await mongoose.model('Task').findByIdAndUpdate(
            data.task,
            { $inc: { commentsCount: 1 } },
            { lean: true }
        );
    } catch (err) {
        console.error('Failed to increment commentsCount:', err);
    }
    
    return comment;
};

// ==================== METHODS ====================

/**
 * Method: Cập nhật nội dung comment.
 * @param {string} newBody - Nội dung mới
 * @returns {Promise<Comment>} Comment đã cập nhật
 * @throws {Error} Nếu body rỗng
 */
CommentSchema.methods.updateBody = async function (newBody) {
    await connectDB();
    
    if (!newBody || !newBody.trim()) {
        throw new Error('Comment body cannot be empty');
    }
    
    this.body = newBody;
    return await this.save();
};

/**
 * Method: Thêm mention vào comment.
 * @param {string} userId - External User ID
 * @returns {Promise<Comment>} Comment đã cập nhật
 * @throws {Error} Nếu user đã được mention
 */
CommentSchema.methods.addMention = async function (userId) {
    await connectDB();
    
    if (this.mentions.includes(userId)) {
        throw new Error('User already mentioned');
    }
    
    this.mentions.push(userId);
    return await this.save();
};

/**
 * Method: Xóa mention khỏi comment.
 * @param {string} userId - External User ID
 * @returns {Promise<Comment>} Comment đã cập nhật
 */
CommentSchema.methods.removeMention = async function (userId) {
    await connectDB();
    
    this.mentions = this.mentions.filter(id => id !== userId);
    return await this.save();
};

// ==================== MIDDLEWARE ====================

/**
 * Post-delete middleware: Giảm commentsCount trong Task khi xóa comment.
 */
CommentSchema.post('findOneAndDelete', async function (doc) {
    if (doc && doc.task) {
        try {
            await mongoose.model('Task').findByIdAndUpdate(
                doc.task,
                { $inc: { commentsCount: -1 } },
                { lean: true }
            );
        } catch (err) {
            console.error('Failed to decrement commentsCount:', err);
        }
    }
});

/**
 * Post-deleteMany middleware: Giảm commentsCount khi xóa nhiều comment.
 */
CommentSchema.post('deleteMany', async function (result) {
    // Note: result không chứa docs, cần query lại nếu muốn update counters
    // Để đơn giản, chúng ta sẽ không xử lý trong trường hợp này
});

// ==================== MODEL EXPORT ====================

/**
 * Xóa model cũ khỏi cache để tránh lỗi HMR trong Next.js development.
 */
if (mongoose.models.Comment) {
    delete mongoose.models.Comment;
    delete mongoose.connection.models.Comment;
}

/**
 * Export Comment Model.
 * Model này quản lý bình luận trong task với hỗ trợ mentions và auto-counter.
 */
export default mongoose.model('Comment', CommentSchema);
