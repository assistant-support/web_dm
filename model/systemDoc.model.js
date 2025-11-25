import mongoose from 'mongoose';
import { connectDB } from '@/lib/db.js';

const SystemDocSchema = new mongoose.Schema(
    {
        tabName: { type: String, required: true, trim: true },
        content: { type: String, default: '' },
        order: { type: Number, default: 0, index: true },
        updatedBy: { type: String, default: null }, // externalUserId
        // Note: images are intentionally not persisted here to avoid storing large base64 blobs.
        // If you have a file service, store image URLs separately and reference them here.
    },
    { timestamps: true }
);

SystemDocSchema.index({ order: 1, tabName: 1 });

let SystemDoc;
try {
    SystemDoc = mongoose.model('SystemDoc');
} catch (e) {
    SystemDoc = mongoose.model('SystemDoc', SystemDocSchema);
}

export async function getSystemDocModel() {
    await connectDB();
    return SystemDoc;
}

export default SystemDoc;
