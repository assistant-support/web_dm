/**
 * Chat Storage Manager
 * Uses sessionStorage to store chat history only for current browser session.
 * History is cleared when user closes browser/tab.
 */

const CHAT_STORAGE_KEY_PREFIX = 'dm_agent_chat_';
const CHAT_STORAGE_VERSION = '1.0';

/**
 * Get storage key for a specific user
 * @param {string} username
 * @returns {string}
 */
function getStorageKey(username) {
  return `${CHAT_STORAGE_KEY_PREFIX}${username}_v${CHAT_STORAGE_VERSION}`;
}

/**
 * Save chat history to sessionStorage (cleared when browser closes)
 * @param {string} username
 * @param {Object} chatData
 * @param {Array} chatData.userMessages - User's sent messages
 * @param {Array} chatData.botMessages - Bot's responses
 * @param {number} chatData.timestamp - Last update timestamp
 */
export function saveChatHistory(username, chatData) {
  if (!username || typeof window === 'undefined') return;
  
  try {
    const key = getStorageKey(username);
    const dataToSave = {
      ...chatData,
      timestamp: Date.now(),
      version: CHAT_STORAGE_VERSION,
    };
    
    sessionStorage.setItem(key, JSON.stringify(dataToSave));
  } catch (error) {
    console.warn('Failed to save chat history:', error);
  }
}

/**
 * Load chat history from sessionStorage
 * @param {string} username
 * @returns {Object|null} - Chat data or null if not found
 */
export function loadChatHistory(username) {
  if (!username || typeof window === 'undefined') return null;
  
  try {
    const key = getStorageKey(username);
    const stored = sessionStorage.getItem(key);
    
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    
    // Validate data structure
    if (!data.userMessages || !Array.isArray(data.userMessages)) return null;
    if (!data.botMessages || !Array.isArray(data.botMessages)) return null;
    
    return data;
  } catch (error) {
    console.warn('Failed to load chat history:', error);
    return null;
  }
}

/**
 * Clear chat history for a specific user
 * @param {string} username
 */
export function clearChatHistory(username) {
  if (!username || typeof window === 'undefined') return;
  
  try {
    const key = getStorageKey(username);
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear chat history:', error);
  }
}

/**
 * Get all chat histories (for debugging)
 * @returns {Object} - Object with username keys and chat data values
 */
export function getAllChatHistories() {
  if (typeof window === 'undefined') return {};
  
  const histories = {};
  
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(CHAT_STORAGE_KEY_PREFIX)) {
        const data = sessionStorage.getItem(key);
        if (data) {
          histories[key] = JSON.parse(data);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to get all chat histories:', error);
  }
  
  return histories;
}

/**
 * Clear old chat histories (older than specified days)
 * Note: With sessionStorage, this is less critical as history is cleared on browser close
 * @param {number} days - Number of days to keep
 */
export function clearOldChatHistories(days = 30) {
  if (typeof window === 'undefined') return;
  
  const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  try {
    const keysToRemove = [];
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(CHAT_STORAGE_KEY_PREFIX)) {
        const data = sessionStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.timestamp && parsed.timestamp < cutoffTime) {
            keysToRemove.push(key);
          }
        }
      }
    }
    
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    
    
  } catch (error) {
    console.warn('Failed to clear old chat histories:', error);
  }
}
