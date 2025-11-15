# 🔧 FIX: TaskItem "Đánh dấu hoàn thành" - Permission Denied & No UI Feedback

## 📋 Vấn đề

1. **Permission denied**: Click "Đánh dấu hoàn thành" bị lỗi 403
2. **No UI feedback**: Không có loading spinner hoặc error message
3. **Root cause**: `onUpdateStatus` prop không được implement hoặc gọi sai function

---

## 🔍 Phân tích chi tiết

### Luồng hiện tại (SAI)

```
User click "Đánh dấu hoàn thành"
  ↓
handleMarkDoneClick() được gọi
  ↓
run(() => onUpdateStatus(task._id, TASK_STATUS.COMPLETED_AWAIT_REVIEW))
  ↓
onUpdateStatus = ??? (UNDEFINED hoặc gọi updateTask thay vì updateTaskStatus)
  ↓
❌ updateTask() → Cần quyền PM → 403 Forbidden
  ↓
❌ Không có error handling → UI không phản hồi
```

### Luồng đúng (ĐÚNG)

```
User click "Đánh dấu hoàn thành"
  ↓
handleMarkDoneClick() được gọi
  ↓
run(() => updateTaskStatus(task._id, newStatus)) ← Dùng function cho member
  ↓
✅ updateTaskStatus() kiểm tra isMember → OK
  ↓
✅ Update status thành công
  ↓
✅ UI hiển thị success notification + refresh data
```

---

## ✅ Giải pháp

### Option 1: Truyền đúng function vào TaskItem (Recommended)

Tìm nơi render `<TaskItem>` và sửa prop `onUpdateStatus`:

```javascript
// ❌ SAI: Nếu bạn đang làm như này
<TaskItem
  task={task}
  actions={{
    onUpdateStatus: (taskId, status) => updateTask(taskId, { status }), // ❌ SAI!
    // ...
  }}
/>

// ✅ ĐÚNG: Dùng updateTaskStatus
import { updateTaskStatus } from '@/data/task/actions/server.js';

<TaskItem
  task={task}
  actions={{
    onUpdateStatus: updateTaskStatus, // ✅ ĐÚNG - Truyền trực tiếp function
    // ...
  }}
/>
```

---

### Option 2: Tạo wrapper function với error handling

Nếu bạn muốn custom logic:

```javascript
// File: app/(auth)/(main)/projects/[projectId]/tasks/TaskListWrapper.client.js
'use client';

import TaskItem from '@/components/tasks/TaskItem.client';
import { updateTaskStatus } from '@/data/task/actions/server.js';
import { updateTask, deleteTask } from '@/data/task/actions/server.js';

export default function TaskListWrapper({ tasks, projectMembers, ... }) {
  const { run } = useAsyncNotifier();

  // ✅ Wrapper function với proper error handling
  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      // Gọi đúng function cho member
      const result = await updateTaskStatus(taskId, newStatus);
      
      // Check result format
      if (result && typeof result === 'object') {
        if (result.ok === false) {
          throw new Error(result.message || 'Cập nhật thất bại');
        }
        return result;
      }
      
      return { ok: true, data: result };
    } catch (error) {
      // Ensure error is properly formatted
      throw {
        ok: false,
        message: error.message || 'Có lỗi xảy ra khi cập nhật trạng thái',
        code: error.code || 'UPDATE_STATUS_ERROR',
        status: error.status || 500
      };
    }
  };

  return (
    <div>
      {tasks.map(task => (
        <TaskItem
          key={task._id}
          task={task}
          projectMembers={projectMembers}
          actions={{
            onUpdateStatus: handleUpdateStatus, // ✅ Dùng wrapper
            onEdit: (id) => { /* ... */ },
            onDelete: async (id) => await deleteTask(id),
            // ...
          }}
          onRefresh={fetchTasks} // ✅ Đảm bảo có refresh function
        />
      ))}
    </div>
  );
}
```

---

### Option 3: Fix trực tiếp trong TaskItem (Fallback)

Nếu không thể thay đổi parent component, sửa trực tiếp trong `TaskItem.client.js`:

```javascript
// File: components/tasks/TaskItem.client.js

// THÊM import ở đầu file
import { updateTaskStatus as serverUpdateTaskStatus } from '@/data/task/actions/server.js';

// ...

export default function TaskItem({ task, actions, ... }) {
  const { run } = useAsyncNotifier();
  
  // SỬA: Destructure với fallback
  const {
    onUpdateStatus = serverUpdateTaskStatus, // ✅ Fallback nếu không truyền
    onEdit,
    onDelete,
    onAssign,
    onAddSubtask
  } = actions || {};

  // handleMarkDoneClick giữ nguyên, giờ onUpdateStatus đã có giá trị đúng
  const handleMarkDoneClick = async (e) => {
    e.stopPropagation();
    if (![TASK_STATUS.IN_PROGRESS, TASK_STATUS.ON_HOLD].includes(task.status)) return;
    
    if (onUpdateStatus) {
      if (isSubtask && isParentOwner) {
        await run(() => onUpdateStatus(task._id, TASK_STATUS.COMPLETED), {
          loadingMessage: 'Đang hoàn thành công việc...',
          successMessage: 'Đã hoàn thành công việc!',
          onSuccess: onRefresh
        });
      } else {
        await run(() => onUpdateStatus(task._id, TASK_STATUS.COMPLETED_AWAIT_REVIEW), {
          loadingMessage: 'Đang gửi duyệt hoàn thành...',
          successMessage: 'Đã gửi duyệt. Vui lòng chờ quản lý!',
          onSuccess: onRefresh
        });
      }
    }
  };

  // ... rest of code
}
```

---

## 📊 So sánh 2 functions

| Aspect | `updateTask()` | `updateTaskStatus()` |
|--------|----------------|----------------------|
| **File** | `data/task/actions/server.js:646` | `data/task/actions/server.js:779` |
| **Permission** | ❌ Chỉ Project Manager | ✅ Bất kỳ member nào |
| **Use case** | Update fields (title, description, finalPoints, v.v.) | Update status only (IN_PROGRESS, COMPLETED, v.v.) |
| **Validation** | `canManageProject()` → 403 if not PM | `isMember()` → 403 if not member |
| **Best for** | Edit task details | Status transitions |

---

## 🧪 Testing

### Test case 1: Member update status (PHẢI PASS)
```javascript
// Setup
const member = 'member_a@test.com'; // Team member, NOT PM
const task = { _id: 'task_123', status: 'in_progress' };

// Action
await updateTaskStatus(task._id, TASK_STATUS.COMPLETED_AWAIT_REVIEW);

// Expected
✅ Status updated thành công
✅ UI hiển thị loading spinner
✅ UI hiển thị success notification: "Đã gửi duyệt"
```

### Test case 2: Member update task fields (PHẢI FAIL)
```javascript
// Setup
const member = 'member_a@test.com'; // NOT PM

// Action
await updateTask(task._id, { status: TASK_STATUS.COMPLETED });

// Expected
❌ API trả về 403 Forbidden
✅ UI hiển thị loading spinner (trong khi call API)
✅ UI hiển thị error notification: "FORBIDDEN"
```

### Test case 3: PM update task (PHẢI PASS)
```javascript
// Setup
const pm = 'pm_alpha@test.com'; // Project Manager

// Action
await updateTask(task._id, { status: TASK_STATUS.COMPLETED, finalPoints: 100 });

// Expected
✅ Update thành công (cả status và finalPoints)
✅ UI hiển thị success notification
```

---

## 🔧 Implementation Steps

### Bước 1: Tìm file render TaskItem

```powershell
# Tìm tất cả file import TaskItem
grep -r "from.*TaskItem" --include="*.js" --include="*.jsx"
```

Thường là:
- `app/(auth)/(main)/tasks/page.js`
- `app/(auth)/(main)/projects/[projectId]/tasks/page.js`
- `components/project/TaskList.client.js`
- `hooks/task-board.hook.js`

### Bước 2: Kiểm tra prop `actions.onUpdateStatus`

```javascript
// Mở file tìm được ở Bước 1
// Tìm dòng <TaskItem ... actions={{ ... }} />

// ❌ Nếu thấy:
actions={{
  onUpdateStatus: (id, status) => updateTask(id, { status })
}}

// ✅ Sửa thành:
import { updateTaskStatus } from '@/data/task/actions/server.js';

actions={{
  onUpdateStatus: updateTaskStatus
}}
```

### Bước 3: Test thử

1. Đăng nhập bằng member (không phải PM)
2. Vào 1 task đang `in_progress`
3. Click "Đánh dấu Hoàn thành"
4. **Quan sát:**
   - ✅ Có loading spinner
   - ✅ Có success notification hoặc error notification
   - ✅ Nếu thành công: Task chuyển sang `completed_await_review`

---

## 📚 Quyền hạn đúng cho từng action

| Action | Task cha | Task con (Subtask) | Function dùng | Quyền cần |
|--------|----------|--------------------|--------------|-|
| **Tạo task gốc** | ✅ | N/A | `createTask()` | PM only |
| **Tạo subtask** | N/A | ✅ | `createTask()` | PM hoặc assignee của task cha |
| **Update status** | ✅ | ✅ | `updateTaskStatus()` | Member of project |
| **Update fields** | ✅ | ✅ | `updateTask()` | PM only |
| **Giao việc (assign)** | ✅ | ✅ | `assignTask()` | PM only (task cha) / PM or parent owner (task con) |
| **Duyệt hoàn thành** | ✅ | ✅ | `approveTaskCompletion()` | PM (task cha) / creator (task con) |
| **Hủy task** | ✅ | ✅ | `updateTask()` với validation | PM, creator, hoặc assignee |
| **Xóa task** | ✅ | ✅ | `deleteTask()` | PM, creator (nếu draft/rejected/cancelled) |

---

## ✅ Checklist sau khi fix

- [ ] Import đúng function: `updateTaskStatus` (not `updateTask`)
- [ ] Truyền function vào prop: `actions.onUpdateStatus = updateTaskStatus`
- [ ] Đảm bảo `onRefresh` prop được truyền vào TaskItem
- [ ] Test với member (không phải PM) → Phải thành công
- [ ] Test UI feedback: Loading spinner hiển thị
- [ ] Test UI feedback: Success/Error notification hiển thị
- [ ] Test với PM → Vẫn hoạt động bình thường
- [ ] Test với subtask → Xem logic auto-complete nếu là parent owner

---

## 🐛 Debug tips

### Nếu vẫn không có UI feedback:

1. **Check `useAsyncNotifier` có được init không:**
```javascript
const { run, Overlays } = useAsyncNotifier();

// Trong JSX, phải có:
return (
  <>
    <Overlays /> {/* ✅ PHẢI CÓ */}
    <TaskItem ... />
  </>
);
```

2. **Check function return đúng format:**
```javascript
// ✅ ĐÚNG: Function phải return Promise
const onUpdateStatus = async (taskId, status) => {
  return await updateTaskStatus(taskId, status);
};

// ❌ SAI: Không return Promise
const onUpdateStatus = (taskId, status) => {
  updateTaskStatus(taskId, status); // Thiếu return!
};
```

3. **Check error format:**
```javascript
// Function server action phải throw error đúng format
throw {
  ok: false,
  message: 'Permission denied',
  code: 'FORBIDDEN',
  status: 403
};
```

4. **Check console logs:**
```javascript
// Thêm log trong handleMarkDoneClick
const handleMarkDoneClick = async (e) => {
  console.log('🔍 handleMarkDoneClick called', { taskId: task._id, status: task.status });
  console.log('🔍 onUpdateStatus exists?', !!onUpdateStatus);
  
  // ... rest of code
};
```

---

## 📝 Notes

- **`updateTaskStatus`** là function dành cho **status transitions** (member có quyền)
- **`updateTask`** là function dành cho **edit task fields** (chỉ PM có quyền)
- **`useAsyncNotifier.run()`** tự động xử lý loading + notification, nhưng cần function return đúng format
- **Task con (subtask)**: Nếu parent owner tự giao cho mình → Auto-complete không cần duyệt

---

**File này được tạo:** 2025-01-14  
**Liên quan:** CHANGELOG_STEP_3_5.md, TESTING_GUIDE.md
