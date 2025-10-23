# Subtask System Documentation

## Overview
Hệ thống Subtask cho phép chia nhỏ task thành các subtask nhỏ hơn, tương tự ClickUp, với workflow tự động và tracking tiến độ.

## Features

### 1. **Hierarchical Structure**
- **Max depth: 1 level** - Chỉ root tasks mới có thể có subtasks
- Root Task → Subtasks (không thể tạo sub-subtasks)
- Parent-child relationship tracked qua `parentTask` field

### 2. **Auto Status Management**
```javascript
// Field trong Task model:
autoBypassForSubtask: Boolean

// Logic:
- Nếu true: Parent task tự động complete khi tất cả subtasks complete
- Nếu subtask reopened: Parent task tự động reopen
```

### 3. **Progress Tracking**
```javascript
SubtaskStats {
  total: Number,           // Tổng số subtasks
  completed: Number,       // Số subtasks hoàn thành
  inProgress: Number,      // Số subtasks đang làm
  todo: Number,           // Số subtasks chưa bắt đầu
  completionRate: Number  // % hoàn thành (0-100)
}
```

### 4. **Drag & Drop Reordering**
- Sử dụng @dnd-kit
- Field `listOrder` để sort
- Drag handle với GripVertical icon

### 5. **Inheritance**
Subtask kế thừa từ parent task:
- `project` - Project ID
- `team` - Team ID
- `scope` - Task scope
- `priority` - Priority level (có thể override)
- `workType` - Work type
- `platforms` - Platform tags

## Database Schema

### Task Model (existing)
```javascript
{
  parentTask: ObjectId,              // Null nếu là root task
  autoBypassForSubtask: Boolean,     // Auto-complete parent
  listOrder: Number,                 // Sort order
  // ... other fields
}
```

## API / Server Actions

### 1. **listSubtasks(parentTaskId)**
```javascript
// Get all subtasks of a parent
const result = await listSubtasks(parentTaskId);
// Returns: Array of subtask objects
```

### 2. **getSubtaskStatsAction(parentTaskId)**
```javascript
// Get statistics
const result = await getSubtaskStatsAction(parentTaskId);
// Returns: { total, completed, inProgress, todo, completionRate }
```

### 3. **createSubtask(parentTaskId, payload)**
```javascript
const result = await createSubtask(parentTaskId, {
  title: 'Subtask title',
  description: 'Optional description',
  assignee: 'userId',
  priority: 'high',
  status: 'draft',
  plannedStartAt: Date,
  plannedDueAt: Date,
});
```

### 4. **updateSubtask(subtaskId, updates)**
```javascript
const result = await updateSubtask(subtaskId, {
  status: 'completed',
  title: 'Updated title',
  // ... any task fields
});
// Auto-updates parent status if needed
```

### 5. **deleteSubtask(subtaskId)**
```javascript
const result = await deleteSubtask(subtaskId);
// Soft delete, updates parent stats
```

### 6. **getTaskWithSubtasks(taskId)**
```javascript
// Get task tree (parent + all subtasks)
const result = await getTaskWithSubtasks(taskId);
// Returns: { ...taskData, subtasks: [...] }
```

### 7. **reorderSubtasks(parentTaskId, subtaskIds)**
```javascript
// Update order
const result = await reorderSubtasks(parentTaskId, [
  'subtask1_id',
  'subtask2_id',
  'subtask3_id',
]);
```

## UI Components

### SubtaskList.client.js

**Props:**
```javascript
{
  parentTaskId: String,    // Required
  canManage: Boolean      // Permission to add/edit/delete
}
```

**Features:**
- ✅ Progress bar với completion rate
- ✅ Add subtask form (inline)
- ✅ Drag & drop reordering
- ✅ Quick toggle complete checkbox
- ✅ Delete với confirmation
- ✅ Priority badges
- ✅ Auto-refresh on changes
- ✅ Loading và error states

**Usage:**
```jsx
import SubtaskList from '@/components/tasks/SubtaskList.client';

<SubtaskList
  parentTaskId={task._id}
  canManage={canManageTask}
/>
```

## Workflow Examples

### Example 1: Basic Subtask Creation
```javascript
// 1. User creates subtasks for a task
await createSubtask(taskId, { title: 'Design mockup', status: 'draft' });
await createSubtask(taskId, { title: 'Implement UI', status: 'draft' });
await createSubtask(taskId, { title: 'Write tests', status: 'draft' });

// 2. Stats show: 0/3 (0%)
const stats = await getSubtaskStatsAction(taskId);
// { total: 3, completed: 0, completionRate: 0 }
```

### Example 2: Auto-Complete Parent
```javascript
// 1. Parent task có autoBypassForSubtask: true
const parentTask = { _id: 'xxx', autoBypassForSubtask: true };

// 2. Complete tất cả subtasks
await updateSubtask(subtask1, { status: 'completed' }); // 1/3
await updateSubtask(subtask2, { status: 'completed' }); // 2/3
await updateSubtask(subtask3, { status: 'completed' }); // 3/3

// 3. Parent task tự động complete!
// updateParentStatusFromSubtasks() được gọi
```

### Example 3: Reopen Parent
```javascript
// 1. Parent đã completed (tất cả subtasks done)

// 2. Reopen 1 subtask
await updateSubtask(subtask1, { status: 'in_progress' });

// 3. Parent tự động reopen về in_progress
```

## Validation Rules

### 1. **Depth Limit**
```javascript
// Cannot create subtask of a subtask
const task = { parentTask: 'someParentId' };
const canCreate = canHaveSubtasks(task); // false
```

### 2. **Required Fields**
```javascript
// Title is required
validateSubtask(parent, { title: '' });
// Returns: { valid: false, error: 'Tiêu đề subtask là bắt buộc' }
```

### 3. **Permission Check**
- Cần permission manage project
- Hoặc là creator của parent task

## Activity Logging

Các events được log:
- `subtask.created` - Subtask được tạo
- `subtask.updated` - Subtask được cập nhật
- `subtask.deleted` - Subtask bị xóa

## Integration Points

### TaskDetail Page
```javascript
// Add to task detail page
<SubtaskList
  parentTaskId={task._id}
  canManage={userCanManage}
/>
```

### TaskRow Component
```javascript
// Show subtask count indicator
{task.subtaskCount > 0 && (
  <span className="flex items-center gap-1 text-xs text-gray-600">
    <ListTree className="h-3 w-3" />
    {task.subtaskCount}
  </span>
)}
```

## Future Enhancements

1. **Nested Subtasks** (depth > 1)
2. **Subtask Templates**
3. **Bulk Operations**
4. **Gantt Chart View**
5. **Dependencies Between Subtasks**
6. **Time Tracking per Subtask**
7. **Subtask Comments**
8. **Subtask Attachments**

## Performance Considerations

- ✅ Indexed `parentTask` field
- ✅ Lazy loading subtasks
- ✅ Optimistic UI updates
- ✅ Batch operations for reordering
- ✅ Cache subtask stats

## Testing

### Unit Tests
```javascript
// Test subtask processors
test('getSubtaskStats calculates correctly', async () => {
  const stats = await getSubtaskStats(parentId);
  expect(stats.total).toBe(5);
  expect(stats.completed).toBe(2);
  expect(stats.completionRate).toBe(40);
});
```

### Integration Tests
```javascript
// Test auto-complete workflow
test('parent completes when all subtasks done', async () => {
  await completeAllSubtasks(parentId);
  const parent = await getTask(parentId);
  expect(parent.status).toBe('completed');
});
```

---

## Quick Start

1. **Import actions:**
```javascript
import { 
  listSubtasks, 
  createSubtask, 
  updateSubtask 
} from '@/data/task/actions/subtasks.server';
```

2. **Use SubtaskList component:**
```jsx
<SubtaskList parentTaskId={taskId} canManage={true} />
```

3. **Done!** Subtask system is ready to use.
