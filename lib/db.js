// cấu trúc thư mục hiện tại: /lib/db.js
// Tác dụng file: Kết nối MongoDB theo kiểu singleton an toàn với hot-reload Next.js.
// - Giữ nguyên logic cũ (Auth 2.0 của bạn đang dùng).
// - Hàm connectDB() dùng lại ở server actions, API routes, jobs.

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI');
}

// Tránh tạo nhiều connection trong môi trường dev/hot-reload Next.js
let cached = global.__mongoose_conn__;
if (!cached) {
    cached = global.__mongoose_conn__ = { conn: null, promise: null };
}

/**
 * Kết nối MongoDB (singleton).
 * @returns {Promise<mongoose.Mongoose>}
 */
export async function connectDB() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI, {
            // Mongoose 8: không cần nhiều option cũ
            appName: 'n2c-clickup-like',
            // Giúp timestamps ổn định, phục vụ đo lường
            serverSelectionTimeoutMS: 5000
        }).then(m => m);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}
