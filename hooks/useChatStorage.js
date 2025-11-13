/**
 * React Hook for Chat Storage
 * Convenient hook to access chat storage functions
 */

'use client';

import { useCallback } from 'react';
import { saveChatHistory, loadChatHistory, clearChatHistory } from '@/lib/chat-storage';

/**
 * Hook to manage chat storage for current user
 * @param {string} username - Current user's username
 * @returns {Object} - Storage functions
 */
export function useChatStorage(username) {
  const save = useCallback((chatData) => {
    if (!username) return;
    saveChatHistory(username, chatData);
  }, [username]);

  const load = useCallback(() => {
    if (!username) return null;
    return loadChatHistory(username);
  }, [username]);

  const clear = useCallback(() => {
    if (!username) return;
    clearChatHistory(username);
  }, [username]);

  return {
    save,
    load,
    clear,
  };
}
