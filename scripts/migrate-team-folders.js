// scripts/migrate-team-folders.js
// Mục đích: Tạo folder Drive cho các team chưa có driveFolderId

import { connectDB } from '../lib/db.js';
import Team from '../model/team.model.js';
import { createTeamFolder } from '../lib/drive.js';

// Load environment variables từ .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

async function migrateTeamFolders() {
    try {
        console.log('🚀 Starting migration: Create Drive folders for teams...');
        
        await connectDB();
        console.log('✅ Connected to database');
        
        // Tìm các team chưa có driveFolderId
        const teams = await Team.find({
            $or: [
                { driveFolderId: { $exists: false } },
                { driveFolderId: null },
                { driveFolderId: '' }
            ],
            isActive: true
        });
        
        console.log(`📊 Found ${teams.length} teams without Drive folders`);
        
        if (teams.length === 0) {
            console.log('✅ All teams already have Drive folders. Nothing to do.');
            return;
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const team of teams) {
            try {
                console.log(`\n📁 Processing team: ${team.name} (${team._id})`);
                
                // Tạo folder trên Drive
                const { id: driveFolderId, name: driveFolderName } = await createTeamFolder(team.name);
                console.log(`   ✅ Created folder: ${driveFolderName} (${driveFolderId})`);
                
                // Update team document
                team.driveFolderId = driveFolderId;
                team.driveFolderName = driveFolderName;
                team.driveParentId = process.env.DRIVE_SHARED_DRIVE_ID || undefined;
                await team.save();
                
                console.log(`   ✅ Updated team document`);
                successCount++;
                
            } catch (error) {
                console.error(`   ❌ Error processing team ${team.name}:`, error.message);
                errorCount++;
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log(`   Total teams: ${teams.length}`);
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Failed: ${errorCount}`);
        console.log('='.repeat(60));
        
        if (errorCount === 0) {
            console.log('✅ Migration completed successfully!');
        } else {
            console.warn('⚠️ Migration completed with some errors. Please check the logs.');
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Chạy migration
migrateTeamFolders()
    .then(() => {
        console.log('\n👋 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });
