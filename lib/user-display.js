// lib/user-display.js
// Mục đích: Helper functions để hiển thị thông tin user

'use server';

import { connectDB } from '@/lib/db.js';
import AppUser from '@/model/user.model.js';
import { getRuntimeCache, setRuntimeCache } from '@/lib/runtime-cache.js';

/**
 * Get user display info from AppUser
 * @param {string} externalUserId 
 * @returns {Promise<{userId: string, name: string, jobTitle: string, color: string}>}
 */
export async function getUserDisplayInfo(externalUserId) {
    if (!externalUserId) {
        return {
            userId: '',
            name: 'Không xác định',
            jobTitle: '',
            color: null,
        };
    }

    // Check cache first (5 minutes)
    const cacheKey = `user-display:${externalUserId}`;
    const cached = getRuntimeCache(cacheKey);
    if (cached) return cached;

    try {
        await connectDB();

        const appUser = await AppUser.findOne({ externalUserId }).lean();

        const displayInfo = {
            userId: externalUserId,
            name: appUser?.name || appUser?.email || externalUserId,
            jobTitle: appUser?.jobTitle || '',
            color: appUser?.color || null,
            avatar: appUser?.avatar || null,
        };

        // Cache for 5 minutes
        setRuntimeCache(cacheKey, displayInfo, 300_000);

        return displayInfo;
    } catch (error) {
        console.error('Error fetching user display info:', error);
        return {
            userId: externalUserId,
            name: externalUserId,
            jobTitle: '',
            color: null,
            avatar: null,
        };
    }
}

/**
 * Get multiple users display info (batch)
 * @param {string[]} userIds 
 * @returns {Promise<Map<string, object>>}
 */
export async function getUsersDisplayInfo(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        return new Map();
    }

    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    const result = new Map();

    // Check cache first
    const uncachedIds = [];
    for (const userId of uniqueIds) {
        const cacheKey = `user-display:${userId}`;
        const cached = getRuntimeCache(cacheKey);
        if (cached) {
            result.set(userId, cached);
        } else {
            uncachedIds.push(userId);
        }
    }

    // Fetch uncached users
    if (uncachedIds.length > 0) {
        try {
            await connectDB();

            const appUsers = await AppUser.find({
                externalUserId: { $in: uncachedIds }
            }).lean();

            // Create map of fetched users
            const fetchedMap = new Map();
            for (const appUser of appUsers) {
                fetchedMap.set(appUser.externalUserId, appUser);
            }

            // Process all uncached IDs
            for (const userId of uncachedIds) {
                const appUser = fetchedMap.get(userId);
                const displayInfo = {
                    userId,
                    name: appUser?.name || appUser?.email || userId,
                    jobTitle: appUser?.jobTitle || '',
                    color: appUser?.color || null,
                    avatar: appUser?.avatar || null,
                };

                result.set(userId, displayInfo);

                // Cache
                const cacheKey = `user-display:${userId}`;
                setRuntimeCache(cacheKey, displayInfo, 300_000);
            }
        } catch (error) {
            console.error('Error fetching users display info:', error);
            
            // Fallback for errored IDs
            for (const userId of uncachedIds) {
                if (!result.has(userId)) {
                    result.set(userId, {
                        userId,
                        name: userId,
                        jobTitle: '',
                        color: null,
                        avatar: null,
                    });
                }
            }
        }
    }

    return result;
}

/**
 * Format user display name
 * @param {object} userInfo 
 * @returns {string}
 */
export async function formatUserDisplayName(userInfo) {
    if (!userInfo) return 'Không xác định';
    if (userInfo.name && userInfo.jobTitle && userInfo.name !== userInfo.jobTitle) {
        return `${userInfo.name} (${userInfo.jobTitle})`;
    }
    return userInfo.name || userInfo.userId || 'Không xác định';
}
