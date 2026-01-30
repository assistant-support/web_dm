/**
 * Migration script: Normalize existing data for search
 * Run this once to populate name_normalized and title_normalized fields
 * Usage: node scripts/migrate-normalize-search.mjs
 */

import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local manually
function loadEnv() {
    try {
        const envPath = join(__dirname, '..', '.env.local');
        const envContent = readFileSync(envPath, 'utf-8');
        const envVars = {};
        
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                }
            }
        });
        
        Object.assign(process.env, envVars);
    } catch (err) {
        console.warn('Could not load .env.local, using process.env directly');
    }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
}

// Normalize function (copy from lib/text-normalize.js)
function normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
        .toLowerCase()
        .normalize('NFD') // Decompose characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .trim();
}

async function migrate() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected!\n');

        const db = mongoose.connection.db;

        // Migrate Projects
        console.log('📁 Migrating Projects...');
        const projectsCollection = db.collection('projects');
        const projects = await projectsCollection.find({
            $or: [
                { name_normalized: { $exists: false } },
                { name_normalized: null },
                { name_normalized: '' }
            ],
            name: { $exists: true, $ne: null, $ne: '' }
        }).toArray();
        
        let projectCount = 0;
        for (const project of projects) {
            if (project.name) {
                await projectsCollection.updateOne(
                    { _id: project._id },
                    { $set: { name_normalized: normalizeText(project.name) } }
                );
                projectCount++;
            }
        }
        console.log(`   ✅ Updated ${projectCount} projects`);

        // Migrate Tasks
        console.log('\n📋 Migrating Tasks...');
        const tasksCollection = db.collection('tasks');
        const tasks = await tasksCollection.find({
            $or: [
                { title_normalized: { $exists: false } },
                { title_normalized: null },
                { title_normalized: '' }
            ],
            title: { $exists: true, $ne: null, $ne: '' }
        }).toArray();
        
        let taskCount = 0;
        for (const task of tasks) {
            if (task.title) {
                await tasksCollection.updateOne(
                    { _id: task._id },
                    { $set: { title_normalized: normalizeText(task.title) } }
                );
                taskCount++;
            }
        }
        console.log(`   ✅ Updated ${taskCount} tasks`);

        // Migrate Teams
        console.log('\n👥 Migrating Teams...');
        const teamsCollection = db.collection('teams');
        const teams = await teamsCollection.find({
            $or: [
                { name_normalized: { $exists: false } },
                { name_normalized: null },
                { name_normalized: '' }
            ],
            name: { $exists: true, $ne: null, $ne: '' }
        }).toArray();
        
        let teamCount = 0;
        for (const team of teams) {
            if (team.name) {
                await teamsCollection.updateOne(
                    { _id: team._id },
                    { $set: { name_normalized: normalizeText(team.name) } }
                );
                teamCount++;
            }
        }
        console.log(`   ✅ Updated ${teamCount} teams`);

        console.log('\n✅ Migration completed successfully!');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

migrate();

