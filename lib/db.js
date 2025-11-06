/**
 * @file lib/db.js
 * @description Establishes a singleton connection to MongoDB, safe for Next.js hot-reloading.
 * The connectDB function is reused across Server Actions, API Routes, and background jobs.
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
let cached = global.__mongoose_conn__;

if (!cached) {
    cached = global.__mongoose_conn__ = { conn: null, promise: null };
}

/**
 * Establishes a connection to the MongoDB database.
 * Implements the singleton pattern to avoid multiple connections.
 * @returns {Promise<mongoose.Mongoose>} The Mongoose connection instance.
 */
export async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            appName: 'web_dm_refactored',
            serverSelectionTimeoutMS: 5000,
        };
        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            return mongoose;
        });
    }
    cached.conn = await cached.promise;
    return cached.conn;
}
