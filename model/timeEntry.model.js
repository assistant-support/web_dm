// @/model/timeEntry.model.js
/**
 * Tác dụng file: Định nghĩa Mongoose Model cho TimeEntry (Log thời gian làm việc).
 * Ghi lại thời gian làm việc của user cho Task.
 * Tự động tổng hợp và cập nhật trackedDurationSec trong Task.
 * 
 * Tính năng:
 * - Lưu startedAt/endedAt của mỗi session làm việc
 * - Auto-calculate và sync trackedDurationSec với Task
 * - Support note cho mỗi time entry
 * - Index theo task và userId để query nhanh
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db.js';

/**
 * Schema chính cho TimeEntry.
 * Lưu trữ log thời gian làm việc của user cho task.
 */
const TimeEntrySchema = new mongoose.Schema({
    // Task mà time entry thuộc về (bắt buộc)
    task: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Task', 
        required: true, 
        index: true 
    },
    
    // User làm việc (external user ID)
    userId: { 
        type: String, 
        required: true, 
        index: true 
    },
    
    // Thời điểm bắt đầu làm việc
    startedAt: { 
        type: Date, 
        required: true,
        index: true
    },
    
    // Thời điểm kết thúc làm việc
    endedAt: { 
        type: Date, 
        required: true 
    },
    
    // Ghi chú về session làm việc
    note: { 
        type: String,
        trim: true
    },
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
 * Index hợp chất để tối ưu truy vấn time entry theo task và user.
 * Ứng dụng: Lấy tất cả time entry của một user trong một task.
 */
TimeEntrySchema.index({ task: 1, userId: 1, startedAt: 1 });

/**
 * Index để tối ưu truy vấn theo user.
 * Ứng dụng: Lấy tất cả time entry của một user.
 */
TimeEntrySchema.index({ userId: 1, startedAt: -1 });

// ==================== VIRTUALS ====================

/**
 * Virtual field: Tính thời gian làm việc (giây).
 * @returns {number} Số giây từ startedAt đến endedAt
 */
TimeEntrySchema.virtual('durationSeconds').get(function () {
    if (!this.startedAt || !this.endedAt) return 0;
    return Math.floor((this.endedAt - this.startedAt) / 1000);
});

/**
 * Virtual field: Tính thời gian làm việc (phút).
 * @returns {number} Số phút làm việc
 */
TimeEntrySchema.virtual('durationMinutes').get(function () {
    return Math.floor(this.durationSeconds / 60);
});

/**
 * Virtual field: Tính thời gian làm việc (giờ).
 * @returns {number} Số giờ làm việc (2 chữ số thập phân)
 */
TimeEntrySchema.virtual('durationHours').get(function () {
    return parseFloat((this.durationSeconds / 3600).toFixed(2));
});

/**
 * Virtual field: Kiểm tra time entry có note hay không.
 * @returns {boolean} True nếu có note
 */
TimeEntrySchema.virtual('hasNote').get(function () {
    return !!this.note && this.note.trim().length > 0;
});

// ==================== STATICS ====================

/**
 * Static: Tìm tất cả time entry của một task.
 * @param {string|mongoose.Types.ObjectId} taskId - Task ID
 * @param {object} options - Tùy chọn
 * @param {string} [options.userId] - Lọc theo user cụ thể
 * @param {Date} [options.startDate] - Lọc từ ngày
 * @param {Date} [options.endDate] - Lọc đến ngày
 * @returns {Promise<TimeEntry[]>} Danh sách time entry
 */
TimeEntrySchema.statics.findByTask = async function (taskId, options = {}) {
    await connectDB();
    
    const { userId, startDate, endDate } = options;
    
    const query = { task: taskId };
    
    if (userId) {
        query.userId = userId;
    }
    
    if (startDate || endDate) {
        query.startedAt = {};
        if (startDate) query.startedAt.$gte = startDate;
        if (endDate) query.startedAt.$lte = endDate;
    }
    
    return await this.find(query).sort({ startedAt: -1 }).lean().exec();
};

/**
 * Static: Tìm tất cả time entry của một user.
 * @param {string} userId - External User ID
 * @param {object} options - Tùy chọn
 * @param {Date} [options.startDate] - Lọc từ ngày
 * @param {Date} [options.endDate] - Lọc đến ngày
 * @param {number} [options.limit=100] - Giới hạn số lượng
 * @returns {Promise<TimeEntry[]>} Danh sách time entry
 */
TimeEntrySchema.statics.findByUser = async function (userId, options = {}) {
    await connectDB();
    
    const { startDate, endDate, limit = 100 } = options;
    
    const query = { userId };
    
    if (startDate || endDate) {
        query.startedAt = {};
        if (startDate) query.startedAt.$gte = startDate;
        if (endDate) query.startedAt.$lte = endDate;
    }
    
    return await this.find(query)
        .sort({ startedAt: -1 })
        .limit(limit)
        .lean()
        .exec();
};

/**
 * Static: Tính tổng thời gian làm việc của một task.
 * @param {string|mongoose.Types.ObjectId} taskId - Task ID
 * @returns {Promise<number>} Tổng thời gian (giây)
 */
TimeEntrySchema.statics.getTotalDuration = async function (taskId) {
    await connectDB();
    
    const result = await this.aggregate([
        { $match: { task: new mongoose.Types.ObjectId(taskId) } },
        { 
            $project: { 
                duration: { 
                    $dateDiff: { 
                        startDate: '$startedAt', 
                        endDate: '$endedAt', 
                        unit: 'second' 
                    } 
                } 
            } 
        },
        { $group: { _id: null, total: { $sum: '$duration' } } }
    ]);
    
    return result[0]?.total || 0;
};

/**
 * Static: Tạo time entry mới và sync với Task.
 * @param {object} data - Dữ liệu time entry
 * @param {string} data.task - Task ID (bắt buộc)
 * @param {string} data.userId - External User ID (bắt buộc)
 * @param {Date} data.startedAt - Thời điểm bắt đầu (bắt buộc)
 * @param {Date} data.endedAt - Thời điểm kết thúc (bắt buộc)
 * @returns {Promise<TimeEntry>} Time entry đã tạo
 * @throws {Error} Nếu thiếu thông tin bắt buộc hoặc endedAt < startedAt
 */
TimeEntrySchema.statics.createEntry = async function (data) {
    await connectDB();
    
    if (!data.task) {
        throw new Error('Task ID is required');
    }
    if (!data.userId) {
        throw new Error('User ID is required');
    }
    if (!data.startedAt) {
        throw new Error('Started time is required');
    }
    if (!data.endedAt) {
        throw new Error('Ended time is required');
    }
    
    const startedAt = new Date(data.startedAt);
    const endedAt = new Date(data.endedAt);
    
    if (endedAt <= startedAt) {
        throw new Error('Ended time must be after started time');
    }
    
    const entry = await this.create(data);
    
    // Tính lại tổng thời gian và sync với Task
    await this.syncTaskDuration(data.task);
    
    return entry;
};

/**
 * Static: Sync tổng thời gian với Task.
 * @param {string|mongoose.Types.ObjectId} taskId - Task ID
 * @returns {Promise<void>}
 */
TimeEntrySchema.statics.syncTaskDuration = async function (taskId) {
    await connectDB();
    
    try {
        const total = await this.getTotalDuration(taskId);
        
        await mongoose.model('Task').findByIdAndUpdate(
            taskId,
            { trackedDurationSec: total },
            { lean: true }
        );
    } catch (err) {
        console.error('Failed to sync task duration:', err);
    }
};

// ==================== METHODS ====================

/**
 * Method: Cập nhật thời gian kết thúc.
 * @param {Date} newEndedAt - Thời gian kết thúc mới
 * @returns {Promise<TimeEntry>} Time entry đã cập nhật
 * @throws {Error} Nếu newEndedAt <= startedAt
 */
TimeEntrySchema.methods.updateEndTime = async function (newEndedAt) {
    await connectDB();
    
    const endedAt = new Date(newEndedAt);
    
    if (endedAt <= this.startedAt) {
        throw new Error('Ended time must be after started time');
    }
    
    this.endedAt = endedAt;
    await this.save();
    
    // Sync lại duration với Task
    await this.constructor.syncTaskDuration(this.task);
    
    return this;
};

/**
 * Method: Cập nhật note.
 * @param {string} newNote - Note mới
 * @returns {Promise<TimeEntry>} Time entry đã cập nhật
 */
TimeEntrySchema.methods.updateNote = async function (newNote) {
    await connectDB();
    
    this.note = newNote;
    return await this.save();
};

// ==================== MIDDLEWARE ====================

/**
 * Pre-save middleware: Validate endedAt > startedAt.
 */
TimeEntrySchema.pre('save', function (next) {
    if (this.endedAt <= this.startedAt) {
        return next(new Error('Ended time must be after started time'));
    }
    next();
});

/**
 * Post-save middleware: Tự động sync duration với Task.
 */
TimeEntrySchema.post('save', async function (doc) {
    await this.constructor.syncTaskDuration(doc.task);
});

/**
 * Post-delete middleware: Sync lại duration với Task sau khi xóa.
 */
TimeEntrySchema.post('findOneAndDelete', async function (doc) {
    if (doc && doc.task) {
        await mongoose.model('TimeEntry').syncTaskDuration(doc.task);
    }
});

// ==================== MODEL EXPORT ====================

/**
 * Xóa model cũ khỏi cache để tránh lỗi HMR trong Next.js development.
 */
if (mongoose.models.TimeEntry) {
    delete mongoose.models.TimeEntry;
    delete mongoose.connection.models.TimeEntry;
}

/**
 * Export TimeEntry Model.
 * Model này ghi lại thời gian làm việc và tự động sync với Task.
 */
export default mongoose.model('TimeEntry', TimeEntrySchema);
