/**
 * Utility functions for text normalization (Vietnamese support)
 * Used for search indexing - removes diacritics, converts to lowercase
 */

/**
 * Normalize Vietnamese text for search
 * Removes diacritics, converts to lowercase, trims
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
export function normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
        .toLowerCase()
        .normalize('NFD') // Decompose characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .trim();
}

