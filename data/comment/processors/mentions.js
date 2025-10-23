// data/comment/processors/mentions.js
// Mục đích: Extract mentions (@username) từ comment text

/**
 * Extract mentions from comment text
 * @param {string} text - Comment text
 * @returns {string[]} - Array of mentioned user IDs or usernames
 */
export function extractMentions(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    // Pattern: @username hoặc @[userId]
    const mentionPattern = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionPattern.exec(text)) !== null) {
        mentions.push(match[1]);
    }

    // Remove duplicates
    return [...new Set(mentions)];
}

/**
 * Format text with mentions highlighted
 * @param {string} text - Comment text
 * @returns {string} - Formatted text
 */
export function formatMentions(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
}
