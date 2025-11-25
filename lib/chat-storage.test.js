/**
 * Quick test for chat storage functionality
 * Run this in browser console to test
 */

// Test 1: Save chat history
function testSaveChatHistory() {
  const username = 'testuser';
  const chatData = {
    userMessages: [
      { text: 'Hello', timestamp: Date.now() - 10000 },
      { text: 'Create a task', timestamp: Date.now() - 5000 },
    ],
    botMessages: [
      {
        message: 'Hi! How can I help?',
        task: null,
        approved: null,
        receivedAt: Date.now() - 9000,
        raw: '...',
      },
      {
        message: 'Okay, I have generated the task',
        task: { name: 'Test Task', description: 'Test' },
        approved: false,
        receivedAt: Date.now() - 4000,
        raw: '...',
      },
    ],
  };

    import('@/lib/chat-storage').then(({ saveChatHistory }) => {
    saveChatHistory(username, chatData);
  });
}

// Test 2: Load chat history
function testLoadChatHistory() {
  const username = 'testuser';
  
    import('@/lib/chat-storage').then(({ loadChatHistory }) => {
    const history = loadChatHistory(username);
    
    if (history) {
      
    } else {
      
    }
  });
}

// Test 3: Get all histories
function testGetAllHistories() {
    import('@/lib/chat-storage').then(({ getAllChatHistories }) => {
    const histories = getAllChatHistories();
  });
}

// Test 4: Clear specific history
function testClearChatHistory() {
  const username = 'testuser';
  
    import('@/lib/chat-storage').then(({ clearChatHistory, loadChatHistory }) => {
    clearChatHistory(username);
  });
}

// Test 5: Clear old histories
function testClearOldHistories() {
    import('@/lib/chat-storage').then(({ clearOldChatHistories, getAllChatHistories }) => {
    clearOldChatHistories(30); // Clear older than 30 days
  });
}

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testChatStorage = {
    save: testSaveChatHistory,
    load: testLoadChatHistory,
    getAll: testGetAllHistories,
    clear: testClearChatHistory,
    clearOld: testClearOldHistories,
  };
  
  
}
