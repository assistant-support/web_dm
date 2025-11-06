/**
 * Migration: Convert team.members[].userId from ObjectId to externalUserId
 * Usage: node scripts/migrate-team-userId.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function migrate() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected!\n');

        const db = mongoose.connection.db;
        const teamsCollection = db.collection('teams');
        const appUsersCollection = db.collection('appusers');

        // Find all teams
        const teams = await teamsCollection.find({ isActive: true }).toArray();
        console.log(`📊 Found ${teams.length} active teams\n`);

        let teamsFixed = 0;
        let membersFixed = 0;

        for (const team of teams) {
            let teamUpdated = false;
            const updatedMembers = [];

            for (const member of team.members || []) {
                const userId = member.userId;

                // Check if userId looks like ObjectId (24 hex characters)
                const isObjectId = /^[0-9a-fA-F]{24}$/.test(userId);

                if (isObjectId) {
                    try {
                        // Find AppUser by _id
                        const appUser = await appUsersCollection.findOne({ 
                            _id: new mongoose.Types.ObjectId(userId) 
                        });

                        if (appUser && appUser.externalUserId) {
                            console.log(`  🔄 Team "${team.name}": ${userId} → ${appUser.externalUserId}`);
                            updatedMembers.push({
                                ...member,
                                userId: appUser.externalUserId
                            });
                            teamUpdated = true;
                            membersFixed++;
                        } else {
                            console.warn(`  ⚠️  Team "${team.name}": No AppUser found for ${userId}`);
                            updatedMembers.push(member); // Keep original
                        }
                    } catch (err) {
                        console.error(`  ❌ Error processing ${userId}:`, err.message);
                        updatedMembers.push(member); // Keep original
                    }
                } else {
                    // Already externalUserId (string format), keep it
                    updatedMembers.push(member);
                }
            }

            if (teamUpdated) {
                await teamsCollection.updateOne(
                    { _id: team._id },
                    { $set: { members: updatedMembers } }
                );
                teamsFixed++;
                console.log(`  ✅ Team "${team.name}" updated\n`);
            }
        }

        console.log('\n=== 📋 Migration Summary ===');
        console.log(`Teams processed: ${teams.length}`);
        console.log(`Teams fixed: ${teamsFixed}`);
        console.log(`Members fixed: ${membersFixed}`);
        console.log('✨ Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Database connection closed');
    }
}

// Run
migrate();
