/**
 * Debug Panel for Chat Storage
 * Add this component temporarily to debug chat history
 * Usage: Import and add <ChatStorageDebug /> to your page
 */

'use client';

import React from 'react';
import { getAllChatHistories, clearChatHistory } from '@/lib/chat-storage';

export default function ChatStorageDebug() {
  const [histories, setHistories] = React.useState({});
  const [expanded, setExpanded] = React.useState(false);

  const loadHistories = () => {
    const data = getAllChatHistories();
    setHistories(data);
  };

  React.useEffect(() => {
    loadHistories();
  }, []);

  const handleClear = (username) => {
    if (confirm(`Xóa lịch sử chat của ${username}?`)) {
      clearChatHistory(username);
      loadHistories();
    }
  };

  const handleClearAll = () => {
    if (confirm('Xóa TẤT CẢ lịch sử chat?')) {
      Object.keys(histories).forEach(key => {
        const username = key.replace('dm_agent_chat_', '').replace(/_v.*$/, '');
        clearChatHistory(username);
      });
      loadHistories();
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 rounded bg-purple-600 px-3 py-2 text-xs text-white shadow-lg hover:bg-purple-700"
      >
        🔍 Chat Storage Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-lg border border-gray-300 bg-white p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Chat Storage Debug</h3>
        <button
          onClick={() => setExpanded(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="mb-3 flex gap-2">
        <button
          onClick={loadHistories}
          className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
        >
          🔄 Reload
        </button>
        <button
          onClick={handleClearAll}
          className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
        >
          🗑️ Clear All
        </button>
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto text-xs">
        {Object.keys(histories).length === 0 ? (
          <p className="text-gray-500">No chat histories found</p>
        ) : (
          Object.entries(histories).map(([key, data]) => {
            const username = key.replace('dm_agent_chat_', '').replace(/_v.*$/, '');
            const date = new Date(data.timestamp);
            
            return (
              <div key={key} className="rounded border border-gray-200 bg-gray-50 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <strong className="text-gray-900">{username}</strong>
                  <button
                    onClick={() => handleClear(username)}
                    className="text-red-600 hover:text-red-700"
                  >
                    🗑️
                  </button>
                </div>
                <div className="space-y-0.5 text-gray-600">
                  <div>User messages: {data.userMessages?.length || 0}</div>
                  <div>Bot messages: {data.botMessages?.length || 0}</div>
                  <div>Last updated: {date.toLocaleString('vi-VN')}</div>
                  <div>Version: {data.version}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
