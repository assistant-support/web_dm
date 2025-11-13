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
    console.log('✅ Saved chat history for', username);
  });
}

// Test 2: Load chat history
function testLoadChatHistory() {
  const username = 'testuser';
  
  import('@/lib/chat-storage').then(({ loadChatHistory }) => {
    const history = loadChatHistory(username);
    console.log('✅ Loaded chat history:', history);
    
    if (history) {
      console.log('User messages:', history.userMessages.length);
      console.log('Bot messages:', history.botMessages.length);
      console.log('Last updated:', new Date(history.timestamp).toLocaleString());
    } else {
      console.log('❌ No history found');
    }
  });
}

// Test 3: Get all histories
function testGetAllHistories() {
  import('@/lib/chat-storage').then(({ getAllChatHistories }) => {
    const histories = getAllChatHistories();
    console.log('✅ All chat histories:', histories);
    console.log('Total users:', Object.keys(histories).length);
  });
}

// Test 4: Clear specific history
function testClearChatHistory() {
  const username = 'testuser';
  
  import('@/lib/chat-storage').then(({ clearChatHistory, loadChatHistory }) => {
    console.log('Before clear:', loadChatHistory(username));
    clearChatHistory(username);
    console.log('After clear:', loadChatHistory(username));
    console.log('✅ Cleared chat history for', username);
  });
}

// Test 5: Clear old histories
function testClearOldHistories() {
  import('@/lib/chat-storage').then(({ clearOldChatHistories, getAllChatHistories }) => {
    console.log('Before cleanup:', Object.keys(getAllChatHistories()).length, 'histories');
    clearOldChatHistories(30); // Clear older than 30 days
    console.log('After cleanup:', Object.keys(getAllChatHistories()).length, 'histories');
    console.log('✅ Cleared old chat histories');
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
  
  console.log('💡 Chat Storage Test Functions loaded!');
  console.log('Usage:');
  console.log('  window.testChatStorage.save()   - Save test data');
  console.log('  window.testChatStorage.load()   - Load test data');
  console.log('  window.testChatStorage.getAll() - Get all histories');
  console.log('  window.testChatStorage.clear()  - Clear test data');
  console.log('  window.testChatStorage.clearOld() - Clear old data');
}
