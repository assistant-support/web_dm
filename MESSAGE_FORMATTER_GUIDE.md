# 🎨 Message Formatter - Hướng dẫn sử dụng

## ✅ Đã cập nhật thành công!

Component `MessageFormatter` đã được thêm vào chatbot để hiển thị tin nhắn đẹp hơn với format phù hợp.

---

## 🎯 **Tính năng mới**

### 1. **Danh sách gạch đầu dòng (Bullet Lists)**

Bot trả lời:
```
Ban đang có 3 dự án đang chạy:
- App Ngôn ngữ
- Thử nghiệm tool AI
- 3D blender
```

**Hiển thị:**
```
Ban đang có 3 dự án đang chạy:
• App Ngôn ngữ
• Thử nghiệm tool AI
• 3D blender
```
✨ Mỗi mục có dấu chấm xanh và căn lề đẹp

---

### 2. **Danh sách đánh số (Numbered Lists)**

Bot trả lời:
```
Các bước tạo dự án:
1. Chọn tên dự án
2. Thêm mô tả
3. Gán thành viên
```

**Hiển thị:**
```
Các bước tạo dự án:
1. Chọn tên dự án
2. Thêm mô tả
3. Gán thành viên
```
✨ Số thứ tự màu xanh, căn chỉnh đẹp

---

### 3. **In đậm (Bold Text)**

Bot trả lời:
```
**Quan trọng:** Bạn cần hoàn thành task trước 5PM
```

**Hiển thị:**
**Quan trọng:** Bạn cần hoàn thành task trước 5PM

✨ Text trong ** ** sẽ được in đậm

---

### 4. **In nghiêng (Italic Text)**

Bot trả lời:
```
*Lưu ý:* Dự án đang ở chế độ Draft
```

**Hiển thị:**
*Lưu ý:* Dự án đang ở chế độ Draft

✨ Text trong * * sẽ được in nghiêng

---

### 5. **Code Inline**

Bot trả lời:
```
Sử dụng lệnh `npm install` để cài đặt
```

**Hiển thị:**
Sử dụng lệnh `npm install` để cài đặt

✨ Code trong ` ` có nền xám và font monospace

---

### 6. **Code Block**

Bot trả lời:
```
Cú pháp tạo task:
\`\`\`
{
  "title": "Task mới",
  "status": "in_progress"
}
\`\`\`
```

**Hiển thị:**
```json
{
  "title": "Task mới",
  "status": "in_progress"
}
```
✨ Block code có nền đen, text trắng

---

### 7. **Links**

Bot trả lời:
```
Xem chi tiết tại [Tài liệu hướng dẫn](https://docs.example.com)
```

**Hiển thị:**
Xem chi tiết tại [Tài liệu hướng dẫn](https://docs.example.com)

✨ Link màu xanh, underline khi hover

---

### 8. **Heading (Tiêu đề)**

Bot trả lời:
```
## Danh sách dự án
Dưới đây là các dự án của bạn...

### Chi tiết dự án
Thông tin chi tiết...
```

**Hiển thị:**
## Danh sách dự án
Dưới đây là các dự án của bạn...

### Chi tiết dự án
Thông tin chi tiết...

✨ Tiêu đề có font lớn hơn, in đậm

---

## 📊 **Ví dụ thực tế**

### Trước (Old):
```
Ban đang có 3 dự án đang chạy: 1. **App Ngôn ngữ** 2. **Thử nghiệm tool AI**: Sinh viên TT tham gia trải nghiệm và đánh giá một công cụ AI mới. Đây là cơ hội để bạn: - Trực tiếp sử dụng các tính năng AI tiên tiến. - Phản tích ưu/nhược điểm, đóng góp ý tưởng phát triển. - Nâng cao kỹ năng và hiểu biết về công nghệ lõi của tương lai. 3. **3D blender**: Phát triển sản phẩm 3D blender và đồi ngũ nhân sự.
```
❌ Khó đọc, mọi thứ dính vào nhau

---

### Sau (New):
```
Ban đang có 3 dự án đang chạy:

• **App Ngôn ngữ**

• **Thử nghiệm tool AI**: Sinh viên TT tham gia trải nghiệm và đánh giá một công cụ AI mới. 
  
  Đây là cơ hội để bạn:
  - Trực tiếp sử dụng các tính năng AI tiên tiến
  - Phản tích ưu/nhược điểm, đóng góp ý tưởng phát triển
  - Nâng cao kỹ năng và hiểu biết về công nghệ lõi của tương lai

• **3D blender**: Phát triển sản phẩm 3D blender và đội ngũ nhân sự
```
✅ Dễ đọc, có cấu trúc rõ ràng, gạch đầu dòng đẹp

---

## 🎨 **Styling**

### **Colors:**
- Bullet point: `text-blue-600` (xanh dương)
- Numbers: `text-blue-600 font-semibold`
- Bold text: `text-gray-900 font-semibold`
- Regular text: `text-gray-800`
- Code inline: `bg-gray-200 text-gray-800`
- Code block: `bg-gray-900 text-gray-100`
- Links: `text-blue-600 hover:underline`

### **Spacing:**
- Danh sách: `space-y-1.5` (khoảng cách giữa các mục)
- Margin: `ml-4` cho indent
- Padding: `p-3` cho code block

---

## 🔧 **Technical Details**

### **Files Modified:**
1. ✅ `components/demo/MessageFormatter.client.js` - **NEW**
   - Component chính parse và format message
   - Hỗ trợ 8 loại format khác nhau

2. ✅ `components/demo/DmAgentChatDemo.client.js` - **UPDATED**
   - Import `MessageFormatter`
   - Replace `{msg.message}` → `<MessageFormatter message={msg.message} />`

### **How it works:**
1. **Parse:** Phân tích message thành blocks (paragraph, list, code, heading)
2. **Format Inline:** Xử lý bold, italic, code, links trong từng dòng
3. **Render:** Hiển thị từng block với styling phù hợp

---

## 🧪 **Testing**

### Test các format:

1. **Test danh sách:**
   ```
   User: "Liệt kê các dự án của tôi"
   Bot: "Bạn có 3 dự án:\n- Dự án A\n- Dự án B\n- Dự án C"
   ```
   → Sẽ hiển thị 3 bullet points xanh

2. **Test số thứ tự:**
   ```
   User: "Các bước tạo task"
   Bot: "1. Mở form\n2. Nhập thông tin\n3. Bấm submit"
   ```
   → Sẽ hiển thị numbered list

3. **Test bold:**
   ```
   Bot: "**Cảnh báo:** Task sắp hết hạn"
   ```
   → "Cảnh báo:" sẽ in đậm

4. **Test mixed:**
   ```
   Bot: "Dự án của bạn:\n1. **App A** - *đang chạy*\n2. **App B** - `pending`"
   ```
   → Kết hợp cả bold, italic, và code

---

## ✨ **Benefits**

### **Trước:**
- ❌ Text dài khó đọc
- ❌ Danh sách không có structure
- ❌ Không phân biệt được thông tin quan trọng

### **Sau:**
- ✅ Danh sách có gạch đầu dòng/số thứ tự
- ✅ In đậm cho keywords quan trọng
- ✅ Code có highlight
- ✅ Links clickable
- ✅ Dễ đọc, professional

---

## 🚀 **Next Steps**

### Suggestions for improvement:

1. **Add emoji support:**
   ```javascript
   // Detect emoji patterns like :smile:, :rocket:
   const emojiMap = { ':smile:': '😊', ':rocket:': '🚀' };
   ```

2. **Add table support:**
   ```
   | Dự án | Trạng thái | Tiến độ |
   |-------|-----------|---------|
   | App A | Active    | 80%     |
   ```

3. **Add blockquote:**
   ```
   > Quan trọng: Deadline sắp đến
   ```

4. **Add syntax highlighting for code:**
   ```javascript
   // Use react-syntax-highlighter
   <SyntaxHighlighter language="javascript">
     {code}
   </SyntaxHighlighter>
   ```

---

## 📝 **How Bot Should Format**

### **Good practices cho AI bot:**

1. **Khi liệt kê nhiều items:**
   ```
   Bạn có 3 dự án:
   - Dự án A
   - Dự án B
   - Dự án C
   ```

2. **Khi hướng dẫn từng bước:**
   ```
   Các bước:
   1. Bước 1
   2. Bước 2
   3. Bước 3
   ```

3. **Khi nhấn mạnh:**
   ```
   **Quan trọng:** Thông tin này cần chú ý
   ```

4. **Khi đề cập code:**
   ```
   Sử dụng lệnh `npm start` để chạy
   ```

---

## ✅ **Done!**

Giờ chatbot của bạn sẽ hiển thị tin nhắn đẹp và dễ đọc hơn nhiều! 🎉

Test ngay bằng cách hỏi bot:
- "Liệt kê các dự án của tôi"
- "Hướng dẫn tạo task mới"
- "Cho tôi biết các loại công việc"

Chúc bạn thành công! 🚀
