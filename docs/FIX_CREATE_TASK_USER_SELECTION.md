# Fix CreateTaskDialog - User Selection

## Vấn đề
CreateTaskDialog không hiển thị danh sách người dùng để chọn người thực hiện (assignee). Component sử dụng UserSearchSelect nhưng không nhận được danh sách users từ component cha.

## Giải pháp đã thực hiện

### 1. **PersonalTasksClient.client.js**
Truyền prop `users` xuống CreateTaskDialog:

```javascript
<CreateTaskDialog
    open={true}
    onClose={() => {
        setShowCreateDialog(false);
        setSelectedProject('');
    }}
    projectId={selectedProject}
    currentUserId={currentUserId}
    projectMembers={selectedProjectInfo.members || []}
    canManage={canManageProject}
    users={users}  // ← THÊM MỚI
    onSuccess={handleTaskCreated}
/>
```

### 2. **CreateTaskDialog.client.js**

#### a) Thêm prop `users` vào component:
```javascript
export default function CreateTaskDialog({ 
    open, 
    onClose, 
    projectId,
    projectMembers = [],
    users = [],  // ← THÊM MỚI
    canManage = false,
    currentUserId = '',
    onSuccess 
})
```

#### b) Lọc users thuộc project:
```javascript
// Lọc users thuộc project từ projectMembers
const projectUserOptions = projectMembers
    .map(member => {
        const user = users.find(u => u.value === member.userId);
        return user ? { value: user.value, label: user.label } : null;
    })
    .filter(Boolean);

// Nếu là member (không phải manager), chỉ cho phép giao cho bản thân
const assigneeOptions = canManage 
    ? projectUserOptions 
    : projectUserOptions.filter(u => u.value === currentUserId);
```

#### c) Thay UserSearchSelect bằng Select component:
```javascript
<Select
    label="Người thực hiện"
    value={formData.assignee}
    onChange={(e) => handleChange('assignee', e.target.value)}
    disabled={isSubmitting || !canManage}  // ← Nhân viên không được chọn
>
    {canManage && (
        <option value="">Chưa gán (tự làm sau)</option>
    )}
    {assigneeOptions.map(opt => (
        <option key={opt.value} value={opt.value}>
            {opt.label} {opt.value === currentUserId ? '(Bản thân)' : ''}
        </option>
    ))}
</Select>
```

#### d) Cập nhật form state cho nhân viên:
```javascript
const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal',
    assignee: canManage ? '' : currentUserId,  // ← Nhân viên mặc định = bản thân
    // ... các field khác
});
```

#### e) Xóa import UserSearchSelect:
```javascript
// XÓA: import UserSearchSelect from '@/components/ui/UserSearchSelect.client';
// GIỮ LẠI: import { Input, Textarea, Select, Checkbox } from '@/components/ui/input';
```

## Quy tắc nghiệp vụ

### Manager (canManage = true):
- ✅ Được chọn bất kỳ member nào trong project
- ✅ Có option "Chưa gán (tự làm sau)" để không gán ngay
- ✅ Hiển thị "(Bản thân)" khi chọn chính mình
- ✅ Dropdown enable (không bị disable)

### Member/Nhân viên (canManage = false):
- ✅ Chỉ thấy tên bản thân trong dropdown
- ✅ Dropdown bị **disabled** (không thể thay đổi)
- ✅ Default assignee = currentUserId (tự động gán cho bản thân)
- ✅ Hiển thị text: "Task của bạn sẽ được gán cho bản thân và cần quản lý phê duyệt"
- ✅ Task sẽ ở trạng thái `pending_approval` khi tạo

## Data Flow

```
page.js (Server)
  ↓ users = await listForPicker()
  
PersonalTasksClient.client.js
  ↓ users={users}
  
CreateTaskDialog.client.js
  ↓ projectUserOptions = filter by projectMembers
  ↓ assigneeOptions = canManage ? all : [currentUser only]
  
<Select> component
  ↓ Hiển thị dropdown với options đã lọc
```

## Format dữ liệu

### users prop:
```javascript
[
  { value: "externalUserId", label: "Tên người dùng" },
  { value: "user123", label: "Nguyễn Văn A" },
  ...
]
```

### projectMembers prop:
```javascript
[
  { userId: "externalUserId", role: "manager" },
  { userId: "user123", role: "member" },
  ...
]
```

### projectUserOptions (sau khi lọc):
```javascript
[
  { value: "user123", label: "Nguyễn Văn A" },
  { value: "user456", label: "Trần Thị B" },
  ...
]
```

## Testing Checklist

### Với Manager:
- [ ] Dropdown hiển thị đầy đủ members trong project
- [ ] Có option "Chưa gán (tự làm sau)"
- [ ] Chọn bản thân → hiển thị "(Bản thân)"
- [ ] Chọn người khác → hiển thị text "Người này sẽ nhận thông báo và cần xác nhận"
- [ ] Dropdown không bị disable

### Với Member:
- [ ] Dropdown chỉ hiển thị tên bản thân
- [ ] Dropdown bị disable (không click được)
- [ ] Default value = tên bản thân
- [ ] Hiển thị text "Task của bạn sẽ được gán cho bản thân và cần quản lý phê duyệt"
- [ ] Tạo task → status = `pending_approval`

### Chung:
- [ ] Không có lỗi compile
- [ ] Dropdown load đúng danh sách users
- [ ] Tạo task thành công với assignee đã chọn
- [ ] Refresh danh sách sau khi tạo

## Files đã thay đổi

1. ✅ `v:\Backup\web_dm\components\tasks\PersonalTasksClient.client.js`
   - Thêm prop `users={users}` khi render CreateTaskDialog

2. ✅ `v:\Backup\web_dm\components\tasks\CreateTaskDialog.client.js`
   - Thêm prop `users` vào component signature
   - Lọc `projectUserOptions` và `assigneeOptions`
   - Thay UserSearchSelect bằng Select
   - Xóa import UserSearchSelect
   - Xóa biến `memberUserIds`
   - Cập nhật default assignee cho member

3. ✅ `v:\Backup\web_dm\app\(auth)\page.js`
   - Đã có sẵn logic load users (commit trước)

## Lưu ý

- **Không dùng UserSearchSelect nữa**: Component này cần API search động, không phù hợp với danh sách nhỏ (chỉ members trong project)
- **Native Select đủ dùng**: Danh sách members thường ít (< 20 người), dùng select thông thường đơn giản và nhanh hơn
- **Security**: Chỉ hiển thị members trong project, không leak thông tin users khác
- **UX tốt hơn**: Member không bị confuse vì dropdown bị disable và có text giải thích rõ ràng

---

**Ngày cập nhật:** ${new Date().toLocaleDateString('vi-VN')}  
**Tác giả:** GitHub Copilot
