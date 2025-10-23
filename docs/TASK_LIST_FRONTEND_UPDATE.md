# Task List Frontend Updates - Summary

## Ngày cập nhật: ${new Date().toLocaleDateString('vi-VN')}

## Mục tiêu
Cập nhật giao diện TaskList và TaskItem để hiển thị đầy đủ thông tin cần thiết và hỗ trợ các thao tác nhanh trong chế độ danh sách (list view).

## Các file đã cập nhật

### 1. **TaskItem.client.js** - Component hiển thị từng task
**Vị trí:** `v:\Backup\web_dm\components\tasks\TaskItem.client.js`

**Thay đổi chính:**
- ✅ Thêm dropdown chọn người được giao việc (assignee) từ danh sách users
- ✅ Hiển thị thanh tiến độ (progress bar) với % hoàn thành từ subtasks
- ✅ Nút Expand/Collapse để xem subtasks (khi có)
- ✅ Quick actions: Start/Pause, Mark Done, Cancel (hover hiển thị)
- ✅ Hiển thị số lượng comments và attachments
- ✅ Icon trạng thái (status) và độ ưu tiên (priority) với màu sắc
- ✅ Hiển thị số điểm (points) của task
- ✅ Link đến trang chi tiết task
- ✅ Hiển thị tên project (nếu có)

**Layout (10 phần từ trái sang phải):**
1. Expand button (chevron) - nếu có subtasks
2. Status icon với màu sắc
3. Title (clickable link) + Project name
4. Progress badge (% - completed/total) - nếu có subtasks
5. Priority badge (Khẩn/Cao/TB/Thấp)
6. Assignee dropdown với user picker
7. Due date với icon lịch
8. Comments & Attachments count
9. Points badge
10. Quick actions (opacity=0, hiện khi hover)

**Props:**
```javascript
{
  task: Object,          // Task object với progress, assignee, status, etc.
  users: Array,          // Danh sách users để chọn assignee: [{ value, label }]
  actions: Object,       // { onAssign, onUpdateStatus, onMarkDone, onCancel }
  onRefresh: Function    // Callback để refresh danh sách sau khi action
}
```

---

### 2. **TaskList.client.js** - Component danh sách tasks
**Vị trí:** `v:\Backup\web_dm\components\tasks\TaskList.client.js`

**Thay đổi chính:**
- ✅ Nhận prop `users` từ component cha
- ✅ Truyền `users` xuống từng TaskItem

**Props mới:**
```javascript
{
  initialTasks: Array,  // Mảng tasks đã được lọc
  users: Array,         // Danh sách users để truyền xuống TaskItem
  canManage: Boolean    // Quyền quản lý (hiện tại chưa dùng)
}
```

---

### 3. **PersonalTasksClient.client.js** - Component cha (multi-view container)
**Vị trí:** `v:\Backup\web_dm\components\tasks\PersonalTasksClient.client.js`

**Thay đổi chính:**
- ✅ Nhận prop `users` từ page.js
- ✅ Truyền `users` xuống TaskList component

**Props mới:**
```javascript
{
  initialTasks: Array,
  projects: Array,
  currentUserId: String,
  users: Array          // NEW: Danh sách users từ listForPicker()
}
```

---

### 4. **app/(auth)/page.js** - HomePage (Server Component)
**Vị trí:** `v:\Backup\web_dm\app\(auth)\page.js`

**Thay đổi chính:**
- ✅ Import `listForPicker` từ `@/data/appUser/actions`
- ✅ Fetch danh sách users: `const users = await listForPicker()`
- ✅ Truyền `users` prop xuống PersonalTasksClient

**Code đã thêm:**
```javascript
import { listForPicker } from '@/data/appUser/actions';

const usersResult = await listForPicker();
const users = usersResult.success ? usersResult.data : [];

<PersonalTasksClient 
  initialTasks={tasks}
  projects={projects}
  currentUserId={user.externalUserId}
  users={users}  // NEW
/>
```

---

## Chi tiết kỹ thuật

### User Picker Dropdown
- **Component:** Native HTML `<select>`
- **Data format:** `users = [{ value: externalUserId, label: name }, ...]`
- **Behavior:** 
  - Tự động gọi `onAssign(taskId, newAssignee, onRefresh)` khi thay đổi
  - Hiển thị "Chưa giao" cho option rỗng
  - Controlled component với `useState`

### Progress Tracking
- **Source:** `task.progress = { total, completed, percentage }`
- **Display:** Badge với icon BarChart3, % và count
- **Condition:** Chỉ hiển thị khi `progress.total > 0` (có subtasks)

### Quick Actions
- **Visibility:** `opacity-0` → `opacity-100` khi hover vào row
- **Actions:**
  - **Start/Pause:** Toggle giữa `in_progress` và `on_hold`
  - **Mark Done:** Chuyển sang `completed_await_review`
  - **Cancel:** Hủy task
- **Conditional rendering:** Dựa vào `task.status`

### Subtask Expansion
- **State:** `useState(false)` - isExpanded
- **Trigger:** Click chevron button
- **Content:** Placeholder component `<SubtaskList parentTaskId={task._id} />`
- **TODO:** Fetch và hiển thị subtasks thật trong SubtaskList

---

## Tương thích Backend

### Task Model Fields được sử dụng:
```javascript
{
  _id: String,
  title: String,
  status: String,                    // draft, pending_approval, in_progress, ...
  priority: String,                  // urgent, high, normal, low
  assignee: String,                  // externalUserId
  plannedDueAt: Date,
  initialPoints: Number,
  finalPoints: Number,
  progress: {                        // NEW - từ backend mới
    total: Number,
    completed: Number,
    percentage: Number
  },
  commentsCount: Number,             // Virtual field
  attachmentsCount: Number,          // Virtual field
  projectName: String,               // Populated field
  project: ObjectId
}
```

### Server Actions được gọi:
- `onAssign(taskId, assignee, onRefresh)` - Assign task
- `onUpdateStatus(taskId, status, onRefresh)` - Thay đổi status
- `onMarkDone(taskId, onRefresh)` - Đánh dấu hoàn thành
- `onCancel(taskId, onRefresh)` - Hủy task

Các actions này được import từ `@/hooks/task-board.hook.js` (useTaskBoardActions)

---

## Testing Checklist

- [ ] User dropdown hiển thị danh sách users từ database
- [ ] Chọn assignee → cập nhật database → refresh UI
- [ ] Progress bar hiển thị đúng % khi task có subtasks
- [ ] Expand/collapse subtasks hoạt động
- [ ] Quick actions (Start/Pause/Done/Cancel) hoạt động
- [ ] Link đến task detail page hoạt động
- [ ] Icons và badges hiển thị đúng màu theo status/priority
- [ ] Comments/Attachments count hiển thị đúng
- [ ] Points hiển thị đúng (finalPoints hoặc initialPoints)

---

## Lưu ý

### Chưa hoàn thành:
1. **SubtaskList component** - Hiện tại chỉ là placeholder, cần fetch subtasks thật
2. **Kanban/Calendar/Gantt views** - Chưa cập nhật để sử dụng users prop
3. **Task detail page** - Chưa tạo giao diện cho workflow, collaborators, approval buttons
4. **Permissions** - `canManage` prop chưa được sử dụng trong TaskItem

### Nguyên tắc thiết kế:
- ✅ Server Components để fetch data
- ✅ Client Components chỉ cho tương tác UI
- ✅ Controlled components với useState
- ✅ Tailwind CSS cho styling
- ✅ Lucide-react cho icons
- ✅ Next.js App Router với router.refresh()

### Performance:
- useMemo cho filteredTasks
- Key prop cho lists
- Debounce search (đã có trong PersonalTasksClient)

---

## Kế hoạch tiếp theo (theo thứ tự ưu tiên)

1. **SubtaskList component** - Fetch và hiển thị subtasks với progress tracking
2. **Task detail modal/page** - Workflow visualization, collaborators, approvals
3. **Kanban view** - Cập nhật để hỗ trợ user picker và progress
4. **Calendar view** - Hiển thị tasks theo timeline
5. **Gantt view** - Dependencies và timeline visualization

---

**Tác giả:** GitHub Copilot  
**Ngày:** ${new Date().toLocaleString('vi-VN')}
