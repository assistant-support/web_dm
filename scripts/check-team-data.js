/**
 * Script: Check team.members data in database
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { connectDB } = await import(join(__dirname, '../lib/db.js'));
const TeamModule = await import(join(__dirname, '../model/team.model.js'));
const AppUserModule = await import(join(__dirname, '../model/user.model.js'));

const Team = TeamModule.default;
const AppUser = AppUserModule.default;

async function checkTeamData() {
    try {
        await connectDB();
        console.log('✅ Connected to database\n');

        const teams = await Team.find({ isActive: true }).limit(5).lean();
        console.log(`📊 Found ${teams.length} active teams\n`);

        for (const team of teams) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`Team: ${team.name}`);
            console.log(`Members count: ${team.members?.length || 0}`);
            
            if (team.members && team.members.length > 0) {
                console.log('\nMembers:');
                for (const member of team.members) {
                    console.log(`  - userId: ${member.userId}`);
                    console.log(`    role: ${member.role}`);
                    
                    // Check if it's ObjectId format
                    const isObjectId = /^[0-9a-fA-F]{24}$/.test(member.userId);
                    console.log(`    Format: ${isObjectId ? '🔴 ObjectId (_id)' : '✅ externalUserId'}`);
                    
                    // Try to find user
                    if (isObjectId) {
                        const userById = await AppUser.findById(member.userId).lean();
                        if (userById) {
                            console.log(`    Found by _id: ${userById.name} (externalUserId: ${userById.externalUserId})`);
                        } else {
                            console.log(`    ⚠️ NOT FOUND by _id`);
                        }
                    } else {
                        const userByExternal = await AppUser.findOne({ externalUserId: member.userId }).lean();
                        if (userByExternal) {
                            console.log(`    Found by externalUserId: ${userByExternal.name}`);
                        } else {
                            console.log(`    ⚠️ NOT FOUND by externalUserId`);
                        }
                    }
                }
            }
        }
        
        console.log(`\n${'='.repeat(60)}\n`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkTeamData();
