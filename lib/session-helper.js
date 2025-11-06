// lib/session-helper.js
/**
 * Helper functions for getting session in NextAuth v5 beta
 * Simplified approach: Use auth() with proper error handling
 */

/**
 * Get session safely with error handling
 * Works in Server Components, Layouts, and API Routes
 * 
 * @returns {Promise<object|null>} Session object or null
 */
export async function getSessionFromCookies() {
    try {
        const { auth } = await import('@/auth');
        const session = await auth();
        return session || null;
    } catch (error) {
        // NextAuth v5 beta may fail in certain contexts
        // Return null instead of throwing
        console.error('getSessionFromCookies: Failed to get session:', error.message);
        return null;
    }
}

/**
 * Alias for backward compatibility
 */
export async function getSession() {
    return getSessionFromCookies();
}
