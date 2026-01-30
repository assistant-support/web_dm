# Cải thiện Search - Hướng dẫn

## Đã thực hiện

1. ✅ Thêm `name_normalized` và `title_normalized` vào models
2. ✅ Tạo index tối ưu cho search
3. ✅ Tạo API endpoints mới với cursor pagination
4. ✅ Implement search logic với phân quyền
5. ✅ Cập nhật UI component
6. ✅ Thêm fallback search (nếu normalized chưa có, search trong name/title gốc)

## Migration (Tùy chọn)

Nếu muốn normalize dữ liệu hiện có, chạy:

```bash
# Cách 1: Set MONGODB_URI trực tiếp
$env:MONGODB_URI="your_mongodb_uri"
node scripts/migrate-normalize-search.mjs

# Cách 2: Hoặc bỏ qua - hệ thống sẽ tự động normalize khi save
```

**Lưu ý**: Nếu không chạy migration, search vẫn hoạt động nhờ fallback logic.

## Debug Search

Nếu search không trả về kết quả, kiểm tra:

1. **Xem logs trong console** khi search:
   - `[Search Preview]` - thông tin user và keyword
   - `[Search Projects]` - query và kết quả

2. **Kiểm tra userId**:
   - Đảm bảo `user.externalUserId` khớp với `members.userId` trong database
   - Xem log để so sánh

3. **Kiểm tra dữ liệu**:
   - Project có `isActive: true`?
   - Project có `members` array với `userId` đúng?
   - `name_normalized` có giá trị? (nếu không, sẽ dùng fallback)

## Test Search

1. Mở browser console
2. Gõ keyword vào search box
3. Xem logs trong:
   - Browser console (client-side)
   - Server console (API logs)

## Sửa lỗi thường gặp

### Search không trả về kết quả

**Nguyên nhân có thể**:
- User không phải member của project
- `members.userId` không khớp với `user.externalUserId`
- Project `isActive: false`

**Cách sửa**:
1. Kiểm tra logs để xem query
2. Kiểm tra database: `db.projects.find({ "members.userId": "user_id_here" })`
3. Đảm bảo userId format đúng (string, không phải ObjectId)

### Migration script lỗi

**Nếu không có dotenv**, có thể:
1. Set MONGODB_URI trực tiếp trong PowerShell:
   ```powershell
   $env:MONGODB_URI="mongodb://..."
   node scripts/migrate-normalize-search.mjs
   ```

2. Hoặc bỏ qua migration - hệ thống sẽ tự normalize khi save mới

