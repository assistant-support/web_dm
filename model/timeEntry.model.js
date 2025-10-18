// MỤC ĐÍCH: Ghi log thời gian làm việc cho Task.
// - Mỗi bản ghi có startedAt/endedAt, userId (external), task.
// - Hook post-save tự tổng hợp trackedDurationSec cho Task.

import mongoose from 'mongoose';

const TimeEntrySchema = new mongoose.Schema({
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    userId: { type: String, required: true, index: true }, // externalUserId
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    note: String,
}, {
    timestamps: true,
    toJSON: { transform: (_d, r) => { delete r.__v; } }
});

TimeEntrySchema.index({ task: 1, userId: 1, startedAt: 1 });

TimeEntrySchema.post('save', async function (doc, next) {
    try {
        const agg = await this.constructor.aggregate([
            { $match: { task: doc.task } },
            { $project: { dur: { $dateDiff: { startDate: '$startedAt', endDate: '$endedAt', unit: 'second' } } } },
            { $group: { _id: '$task', total: { $sum: '$dur' } } }
        ]);
        const total = agg[0]?.total || 0;
        await mongoose.model('Task').findByIdAndUpdate(doc.task, { trackedDurationSec: total }, { lean: true });
    } catch (_) { }
    next();
});

export default mongoose.models.TimeEntry || mongoose.model('TimeEntry', TimeEntrySchema);
