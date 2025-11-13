# Hệ thống Lưu trữ Lịch sử Chat

## 📋 Tổng quan

Hệ thống tự động lưu trữ lịch sử chat của mỗi người dùng vào `localStorage`, cho phép người dùng mở lại popup và xem lại cuộc trò chuyện trước đó.

## ✨ Tính năng

### 1. **Tự động lưu trữ** (chạy ngầm)
- ✅ Lưu tin nhắn người dùng và bot response
- ✅ Debounce 2 giây (tránh lưu quá nhiều lần)
- ✅ Không hiển thị loading indicator
- ✅ Lưu khi đóng popup (force save)

### 2. **Tải lịch sử**
- ✅ Tự động load khi mở popup
- ✅ Hiển thị tin nhắn cũ ngay lập tức
- ✅ Merge với tin nhắn mới từ WebSocket

### 3. **Quản lý cache**
- ✅ Lưu theo username (mỗi user có lịch sử riêng)
- ✅ Tự động dọn dẹp lịch sử cũ hơn 30 ngày
- ✅ Nút "Xóa lịch sử" trong header
- ✅ Version control cho data structure

## 🏗️ Kiến trúc

### Files đã tạo:

1. **`lib/chat-storage.js`** - Core storage functions
   - `saveChatHistory(username, chatData)` - Lưu lịch sử
   - `loadChatHistory(username)` - Load lịch sử
   - `clearChatHistory(username)` - Xóa lịch sử
   - `clearOldChatHistories(days)` - Dọn dẹp lịch sử cũ

2. **`hooks/useChatStorage.js`** - React hook wrapper
   - Hook tiện lợi để sử dụng chat storage

3. **`components/demo/ChatStorageDebug.client.js`** - Debug panel
   - UI để xem và quản lý tất cả lịch sử chat
   - Chỉ dùng khi development

### Files đã cập nhật:

1. **`components/demo/ChatDataProvider.client.js`**
   - Load history on mount
   - Auto-save với debounce
   - Save on unmount
   - Clear old histories
   - Handler xóa lịch sử

2. **`hooks/useDmAgentSocket.js`**
   - Thêm `initialMessages` option
   - Support restore messages từ storage

3. **`components/demo/DmAgentChatDemo.client.js`**
   - Nút "Xóa lịch sử" trong header
   - Prop `onClearHistory`

## 💾 Data Structure

```javascript
// localStorage key format
'dm_agent_chat_{username}_v1.0'

// Stored data structure
{
  userMessages: [
    { text: "Tạo task mới", timestamp: 1699876543210 },
    { text: "Xác nhận tạo", timestamp: 1699876555432 }
  ],
  botMessages: [
    {
      message: "Okay, I have generated the task...",
      task: { name: "...", description: "..." },
      approved: false,
      receivedAt: 1699876545678,
      raw: "..."
    }
  ],
  timestamp: 1699876555432,
  version: "1.0"
}
```

## 🔄 Flow hoạt động

### Khi mở popup:
```
1. ChatDataProvider mount
2. Load history từ localStorage (loadChatHistory)
3. Set userMessages state
4. Pass initialMessages to useDmAgentSocket
5. Hiển thị lịch sử ngay lập tức
6. WebSocket connect và có thể nhận tin mới
```

### Khi gửi tin nhắn:
```
1. User gửi message
2. Add to userMessages state
3. Send via WebSocket
4. Bot response → add to socket.messages
5. Auto-save triggered (debounced 2s)
6. Save to localStorage in background
```

### Khi đóng popup:
```
1. Component unmount
2. Force save immediately (no debounce)
3. localStorage updated với dữ liệu mới nhất
```

### Khi mở lại popup:
```
1. Load history từ localStorage
2. Hiển thị lại cuộc trò chuyện cũ
3. Continue conversation
```

## 🎯 Ví dụ sử dụng

### Sử dụng hook:
```javascript
import { useChatStorage } from '@/hooks/useChatStorage';

function MyComponent() {
  const username = 'user123';
  const { save, load, clear } = useChatStorage(username);
  
  // Load history
  const history = load();
  
  // Save history
  save({
    userMessages: [...],
    botMessages: [...]
  });
  
  // Clear history
  clear();
}
```

### Debug chat storage:
```javascript
// Thêm vào page.js để debug
import ChatStorageDebug from '@/components/demo/ChatStorageDebug.client';

export default function Page() {
  return (
    <div>
      {/* Your content */}
      {process.env.NODE_ENV === 'development' && <ChatStorageDebug />}
    </div>
  );
}
```

## 🔒 Bảo mật & Privacy

- ✅ Dữ liệu chỉ lưu trên browser của user (localStorage)
- ✅ Không gửi lên server
- ✅ Mỗi user có storage riêng biệt (key theo username)
- ✅ User có thể xóa lịch sử bất kỳ lúc nào
- ✅ Tự động dọn dẹp dữ liệu cũ

## ⚡ Performance

- ✅ Debounce save (2s) để tránh quá nhiều write
- ✅ Load async không block UI
- ✅ Save chạy background không làm gián đoạn UX
- ✅ Tự động cleanup old data để tránh đầy storage

## 🐛 Debugging

### Xem tất cả lịch sử trong localStorage:
```javascript
import { getAllChatHistories } from '@/lib/chat-storage';

console.log(getAllChatHistories());
```

### Xóa lịch sử cũ thủ công:
```javascript
import { clearOldChatHistories } from '@/lib/chat-storage';

// Xóa lịch sử cũ hơn 7 ngày
clearOldChatHistories(7);
```

### Kiểm tra storage size:
```javascript
// Check localStorage usage
const allKeys = Object.keys(localStorage);
const chatKeys = allKeys.filter(k => k.startsWith('dm_agent_chat_'));
console.log('Chat histories:', chatKeys.length);

chatKeys.forEach(key => {
  const size = localStorage.getItem(key)?.length || 0;
  console.log(`${key}: ${(size / 1024).toFixed(2)} KB`);
});
```

## 📝 Notes

1. **localStorage limits**: Mỗi domain có limit ~5-10MB. Hệ thống tự động dọn dẹp để tránh đầy.

2. **Cross-device sync**: localStorage chỉ lưu local, không sync giữa các device. Nếu cần sync, phải implement server-side storage.

3. **Private/Incognito mode**: localStorage có thể bị clear khi đóng browser trong private mode.

4. **Version control**: Data có field `version` để handle migration nếu cần thay đổi structure trong tương lai.

## 🚀 Future improvements

- [ ] Compress data trước khi lưu (LZ-string)
- [ ] Sync lên server (optional)
- [ ] Export/Import chat history
- [ ] Search trong lịch sử chat
- [ ] Pagination cho lịch sử dài
