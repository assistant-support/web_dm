/**
 * Script: Fix team.members userId to use externalUserId
 * 
 * Problem: team.members[].userId currently stores MongoDB ObjectId (_id of AppUser)
 * Should store: externalUserId (string from auth provider)
 * 
 * This script:
 * 1. Finds all teams
 * 2. For each team.members[].userId that looks like ObjectId
 * 3. Finds the AppUser by _id
 * 4. Updates team.members[].userId to use AppUser.externalUserId
 */

import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load models directly with relative paths
const { connectDB } = await import(join(__dirname, '../lib/db.js'));
const TeamModule = await import(join(__dirname, '../model/team.model.js'));
const AppUserModule = await import(join(__dirname, '../model/user.model.js'));

const Team = TeamModule.default;
const AppUser = AppUserModule.default;

async function fixTeamMembersUserId() {
    try {
        await connectDB();
        console.log('Connected to database');

        const teams = await Team.find({ isActive: true });
        console.log(`Found ${teams.length} active teams`);

        let teamsFixed = 0;
        let membersFixed = 0;

        for (const team of teams) {
            let teamUpdated = false;
            
            for (const member of team.members || []) {
                // Check if userId looks like ObjectId (24 hex characters)
                const isObjectId = /^[0-9a-fA-F]{24}$/.test(member.userId);
                
                if (isObjectId) {
                    try {
                        // Find AppUser by _id
                        const appUser = await AppUser.findById(member.userId);
                        
                        if (appUser && appUser.externalUserId) {
                            console.log(`  Team "${team.name}": Converting member userId from ${member.userId} to ${appUser.externalUserId}`);
                            member.userId = appUser.externalUserId;
                            teamUpdated = true;
                            membersFixed++;
                        } else {
                            console.warn(`  ⚠️ Team "${team.name}": Could not find AppUser with _id=${member.userId}`);
                        }
                    } catch (err) {
                        console.error(`  ❌ Error processing member ${member.userId}:`, err.message);
                    }
                }
            }

            if (teamUpdated) {
                await team.save();
                teamsFixed++;
                console.log(`  ✅ Team "${team.name}" updated`);
            }
        }

        console.log('\n=== Migration Summary ===');
        console.log(`Teams processed: ${teams.length}`);
        console.log(`Teams fixed: ${teamsFixed}`);
        console.log(`Members fixed: ${membersFixed}`);
        console.log('Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run the migration
fixTeamMembersUserId();
