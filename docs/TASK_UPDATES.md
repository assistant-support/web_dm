# Task Management System - Feature Updates

## 🚀 Recent Updates (October 2025)

### 1. **ClickUp-Style Subtask System**

Hệ thống nhiệm vụ con hoàn chỉnh với workflow tự động:

#### ✨ Features
- **Hierarchical Tasks**: Chia task thành subtasks (max 1 level depth)
- **Auto-Complete**: Parent task tự động hoàn thành khi tất cả subtasks done
- **Progress Tracking**: Progress bar hiển thị % hoàn thành real-time
- **Drag & Drop**: Sắp xếp lại subtasks bằng kéo thả
- **Inline Creation**: Tạo subtask nhanh ngay trong danh sách
- **Permission-Based**: Chỉ managers mới được tạo/sửa/xóa subtasks

#### 📁 Files Created
```
data/
  comment/processors/mentions.js         # Extract @mentions from text
  task/
    processors/subtasks.js                # Business logic for subtasks
    actions/subtasks.server.js            # Server actions for CRUD

components/
  tasks/
    SubtaskList.client.js                 # UI component with drag-drop
    TaskDetailHeader.client.js            # Header for task detail page
  ui/
    TaskStatusBadge.js                    # Status badge component
    TaskPriorityBadge.js                  # Priority badge component

docs/
  SUBTASK_SYSTEM.md                       # Full documentation
```

#### 🎯 Usage

**In Task Detail Page:**
```jsx
import SubtaskList from '@/components/tasks/SubtaskList.client';

<SubtaskList
  parentTaskId={task._id}
  canManage={hasManagePermission}
/>
```

**Create Subtask:**
```javascript
import { createSubtask } from '@/data/task/actions/subtasks.server';

const result = await createSubtask(parentTaskId, {
  title: 'Design mockup',
  description: 'Create UI mockup in Figma',
  priority: 'high',
  assignee: userId,
});
```

**Get Subtask Stats:**
```javascript
import { getSubtaskStatsAction } from '@/data/task/actions/subtasks.server';

const stats = await getSubtaskStatsAction(parentTaskId);
// { total: 5, completed: 3, inProgress: 1, todo: 1, completionRate: 60 }
```

---

### 2. **Enhanced Task Detail Page**

Trang chi tiết task được redesign hoàn toàn:

#### ✨ Features
- **Separated Header**: TaskDetailHeader component với breadcrumbs
- **Badge System**: TaskStatusBadge và TaskPriorityBadge với color coding
- **Inline Editing**: Edit description, status, priority, dates
- **Subtask Section**: Hiển thị subtasks với progress tracking
- **Parent Link**: Subtasks có link về parent task
- **Comments & Attachments**: Sections riêng cho comments và attachments

#### 🎨 UI Improvements
- Modern gray-200 borders
- Smooth transitions
- Responsive 3-column layout
- Hover effects và shadows
- Blue-600 primary color scheme

---

### 3. **Kanban Board Enhancements**

#### ✨ Features
- **Drag & Drop**: Kéo thả tasks giữa các columns
- **Reordering**: Sắp xếp lại tasks trong cùng column
- **Auto-Save**: Tự động lưu order và status
- **Visual Feedback**: Opacity 0.5 khi đang drag

#### 🔧 Implementation
```javascript
// Server action for kanban order
import { updateKanbanOrder } from '@/data/task/actions/server';

await updateKanbanOrder([taskId1, taskId2, taskId3]);
```

---

### 4. **Task List Improvements**

#### ✨ Features
- **Subtask Count Indicator**: Purple badge hiển thị số subtasks
- **Filter by Assignee**: Lọc tasks theo người thực hiện
- **Modern UI**: gray-200 borders, smooth hover effects
- **Quick Complete**: Checkbox để toggle completed/in_progress

#### 📊 Task Row Indicators
- 📝 Comments count
- 📎 Attachments count
- 🌲 **Subtasks count** (NEW - purple color)
- 🏷️ Tags
- 📅 Due date with overdue warning

---

## 🛠️ Technical Details

### Database Schema Updates

**Task Model:**
```javascript
{
  parentTask: ObjectId,              // Reference to parent task
  autoBypassForSubtask: Boolean,     // Auto-complete parent
  listOrder: Number,                 // List view sort order
  kanbanOrder: Number,               // Kanban board sort order
}
```

**Indexes:**
```javascript
{ parentTask: 1, listOrder: 1 }     // Subtask queries
{ project: 1, status: 1, kanbanOrder: 1 }  // Kanban board
```

### Aggregation Pipeline for Subtask Count

```javascript
Task.aggregate([
  { $match: { project: projectId, parentTask: null } },
  {
    $lookup: {
      from: 'tasks',
      let: { taskId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$parentTask', '$$taskId'] } } },
        { $count: 'count' }
      ],
      as: 'subtaskCountArray'
    }
  },
  {
    $addFields: {
      subtaskCount: { $ifNull: [{ $arrayElemAt: ['$subtaskCountArray.count', 0] }, 0] }
    }
  }
]);
```

---

## 📝 API Reference

### Subtask Actions

#### `listSubtasks(parentTaskId)`
Get all subtasks of a parent task.

**Returns:** `Array<Task>`

#### `createSubtask(parentTaskId, payload)`
Create new subtask.

**Payload:**
```typescript
{
  title: string;
  description?: string;
  assignee?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  status?: string;
  plannedStartAt?: Date;
  plannedDueAt?: Date;
}
```

**Returns:** `{ ok: boolean, data: Task }`

#### `updateSubtask(subtaskId, payload)`
Update existing subtask. Auto-updates parent status if needed.

**Returns:** `{ ok: boolean, data: Task }`

#### `deleteSubtask(subtaskId)`
Soft delete subtask. Updates parent stats.

**Returns:** `{ ok: boolean, message: string }`

#### `getSubtaskStatsAction(parentTaskId)`
Get statistics for subtasks.

**Returns:**
```typescript
{
  ok: boolean;
  data: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    completionRate: number; // 0-100
  }
}
```

#### `reorderSubtasks(parentTaskId, subtaskIds)`
Bulk update subtask order.

**Returns:** `{ ok: boolean }`

---

## 🎯 Workflow Examples

### Example 1: Create Task with Subtasks

```javascript
// 1. Create parent task
const parent = await createTask(projectId, {
  title: 'Build landing page',
  autoBypassForSubtask: true, // Auto-complete when all subtasks done
});

// 2. Create subtasks
await createSubtask(parent.data._id, { title: 'Design mockup' });
await createSubtask(parent.data._id, { title: 'Implement HTML/CSS' });
await createSubtask(parent.data._id, { title: 'Add animations' });
await createSubtask(parent.data._id, { title: 'Write tests' });

// 3. Stats: 0/4 completed (0%)
```

### Example 2: Complete Subtasks

```javascript
// Complete first subtask
await updateSubtask(subtask1, { status: 'completed' }); // 1/4 (25%)

// Complete remaining
await updateSubtask(subtask2, { status: 'completed' }); // 2/4 (50%)
await updateSubtask(subtask3, { status: 'completed' }); // 3/4 (75%)
await updateSubtask(subtask4, { status: 'completed' }); // 4/4 (100%)

// ✨ Parent task automatically completes!
```

### Example 3: Reopen Parent Task

```javascript
// Parent is completed (all subtasks done)

// Reopen one subtask
await updateSubtask(subtask1, { status: 'in_progress' });

// ✨ Parent task automatically reopens to in_progress
```

---

## 🎨 UI Components Reference

### TaskStatusBadge

```jsx
import TaskStatusBadge from '@/components/ui/TaskStatusBadge';

<TaskStatusBadge 
  status="in_progress" 
  size="md" 
  showIcon={true} 
/>
```

**Props:**
- `status`: 'draft' | 'pending_approval' | 'in_progress' | 'completed' | etc.
- `size`: 'sm' | 'md' | 'lg'
- `showIcon`: boolean (default: true)

### TaskPriorityBadge

```jsx
import TaskPriorityBadge from '@/components/ui/TaskPriorityBadge';

<TaskPriorityBadge 
  priority="urgent" 
  size="md" 
  showIcon={true} 
/>
```

**Props:**
- `priority`: 'low' | 'normal' | 'high' | 'urgent'
- `size`: 'sm' | 'md' | 'lg'
- `showIcon`: boolean (default: true)

### TaskDetailHeader

```jsx
import TaskDetailHeader from '@/components/tasks/TaskDetailHeader.client';

<TaskDetailHeader
  task={task}
  projectName="Project Alpha"
  canManage={true}
  onUpdate={(updatedTask) => setTask(updatedTask)}
/>
```

**Features:**
- Breadcrumb navigation
- Edit title inline
- Copy task ID
- Delete task
- Status & priority badges

---

## 🚦 Permission System

### Manager Permissions
- ✅ Create subtasks
- ✅ Edit subtasks (title, description, priority, status, dates)
- ✅ Delete subtasks
- ✅ Reorder subtasks
- ✅ Edit parent task

### Member Permissions
- ✅ View subtasks
- ✅ View stats
- ✅ Toggle own subtask complete/incomplete
- ❌ Cannot create/delete subtasks

---

## 📊 Performance Optimizations

### 1. Database Indexes
```javascript
// Optimized queries for subtasks
{ parentTask: 1, listOrder: 1 }
{ parentTask: 1, createdAt: -1 }

// Optimized for list/kanban views
{ project: 1, status: 1, kanbanOrder: 1 }
{ project: 1, listOrder: 1 }
```

### 2. Aggregation Pipeline
- Single query to get tasks + subtask count
- Reduces N+1 queries
- Better performance on large datasets

### 3. Caching Strategy
- Cache subtask stats
- Revalidate on mutations
- Use tags for selective invalidation

---

## 🐛 Troubleshooting

### Issue: Subtasks không hiển thị

**Solution:**
```javascript
// Check parentTask field
const task = await Task.findById(taskId);
console.log('Parent task:', task.parentTask); // Should be null for root tasks

// Check if subtasks exist
const subtasks = await Task.find({ parentTask: taskId, deletedAt: null });
console.log('Subtasks:', subtasks.length);
```

### Issue: Parent không auto-complete

**Solution:**
```javascript
// Check autoBypassForSubtask flag
const parent = await Task.findById(parentId);
console.log('Auto bypass:', parent.autoBypassForSubtask); // Should be true

// Manually trigger update
import { updateParentStatusFromSubtasks } from '@/data/task/processors/subtasks';
await updateParentStatusFromSubtasks(parentId);
```

### Issue: Kanban drag-drop không hoạt động

**Solution:**
```javascript
// Check DndKit sensors
sensors={useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 }
  })
)}

// Check permission
const canManage = canManageProject(project, userId);
console.log('Can manage:', canManage);
```

---

## 📚 Additional Resources

- [SUBTASK_SYSTEM.md](./SUBTASK_SYSTEM.md) - Full subtask documentation
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [DndKit Documentation](https://docs.dndkit.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)

---

## 🎯 Next Steps

### Planned Features
1. **Nested Subtasks** (depth > 1)
2. **Subtask Templates** (quick create from template)
3. **Bulk Operations** (complete all, delete all)
4. **Gantt Chart View** (timeline visualization)
5. **Dependencies** (subtask A blocks subtask B)
6. **Time Tracking** (per subtask)
7. **Recurring Subtasks** (repeat weekly/monthly)

### UI Improvements
1. Keyboard shortcuts (Ctrl+Enter to create subtask)
2. Subtask quick view (preview without opening)
3. Batch editing (select multiple subtasks)
4. Advanced filtering (filter by subtask status)

---

**Last Updated:** October 21, 2025
**Version:** 2.0.0
**Contributors:** Development Team
