// scripts/fix-worktype-field.js
// Script để fix workType field từ ObjectId sang String

import mongoose from 'mongoose';
import { connectDB } from '../lib/db.js';

async function fixWorkTypeField() {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const tasksCollection = db.collection('tasks');

        // 1. Drop index cũ cho workType nếu có
        try {
            console.log('Dropping old workType index...');
            await tasksCollection.dropIndex('workType_1');
            console.log('✓ Dropped old index');
        } catch (err) {
            if (err.codeName === 'IndexNotFound') {
                console.log('No old index found, skipping...');
            } else {
                console.log('Error dropping index:', err.message);
            }
        }

        // 2. Tạo index mới cho workType (String)
        console.log('Creating new workType index...');
        await tasksCollection.createIndex({ workType: 1 });
        console.log('✓ Created new index');

        // 3. List tất cả indexes để verify
        console.log('\nCurrent indexes:');
        const indexes = await tasksCollection.indexes();
        indexes.forEach(idx => {
            if (idx.key.workType) {
                console.log('  workType index:', JSON.stringify(idx.key));
            }
        });

        console.log('\n✓ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

fixWorkTypeField();
