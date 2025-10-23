# Subtask Creation Dialog Fix

## Vấn đề
User báo cáo rằng khi tạo subtask trong trang task detail (`/tasks/[taskId]`), chỉ có trường title hiển thị, không có popup đầy đủ như mô tả.

## Nguyên nhân
1. `TaskDetail.client.js` sử dụng component `SubtaskList.client.js` (line 211)
2. `SubtaskList.client.js` có inline form chỉ với input title:
   ```jsx
   <form onSubmit={handleAddSubtask}>
     <input placeholder="Thêm subtask..." value={newSubtaskTitle} />
     <button type="submit">Thêm</button>
   </form>
   ```
3. `CreateSubtaskDialog.client.js` đã được tạo đầy đủ nhưng chưa được tích hợp vào `SubtaskList`
4. `SubtaskListSimple.client.js` (dùng trong TaskItem expansion) đã dùng dialog, nhưng detail page vẫn dùng inline form cũ

## Giải pháp

### 1. Cập nhật SubtaskList.client.js
**File**: `components/tasks/SubtaskList.client.js`

**Thay đổi**:
- ✅ Import `CreateSubtaskDialog`
- ✅ Thêm props: `parentTask`, `projectMembers`, `users`, `workTypes`, `platforms`, `currentUserId`
- ✅ Thay state `isAdding, newSubtaskTitle` → `showCreateDialog`
- ✅ Xóa `handleAddSubtask` form handler
- ✅ Thêm `handleSubtaskCreated` callback để refresh danh sách sau khi tạo
- ✅ Thay inline form bằng button + dialog:
  ```jsx
  {canManage && (
    <>
      <button onClick={() => setShowCreateDialog(true)}>
        <Plus className="h-4 w-4" />
        Thêm công việc con
      </button>
      
      {showCreateDialog && parentTask && (
        <CreateSubtaskDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          parentTask={parentTask}
          projectMembers={projectMembers}
          users={users}
          workTypes={workTypes}
          platforms={platforms}
          currentUserId={currentUserId}
          onSuccess={handleSubtaskCreated}
        />
      )}
    </>
  )}
  ```

### 2. Cập nhật TaskDetail.client.js
**File**: `components/tasks/TaskDetail.client.js`

**Thay đổi**:
- ✅ Thêm props component: `users`, `projectMembers`, `workTypes`, `platforms`
- ✅ Truyền đầy đủ props xuống SubtaskList (line 211):
  ```jsx
  <SubtaskList
    parentTaskId={task._id}
    parentTask={task}
    projectMembers={projectMembers}
    users={users}
    workTypes={workTypes}
    platforms={platforms}
    currentUserId={currentUser?.externalUserId}
    canManage={canManage}
  />
  ```

### 3. Cập nhật page.js
**File**: `app/(auth)/(main)/tasks/[taskId]/page.js`

**Thay đổi**:
- ✅ Import `listForPicker` từ `@/data/appUser/actions`
- ✅ Load users trong server component:
  ```javascript
  const usersResult = await listForPicker();
  const users = usersResult.ok ? usersResult.data : [];
  ```
- ✅ Extract `projectMembers` từ project:
  ```javascript
  projectMembers = project.team?.members || [];
  ```
- ✅ Thêm hardcoded `workTypes` và `platforms` (TODO: thay bằng data loader thật):
  ```javascript
  const workTypes = [
    { _id: '1', name: 'Design', code: 'design' },
    { _id: '2', name: 'Development', code: 'dev' },
    { _id: '3', name: 'Content', code: 'content' },
    { _id: '4', name: 'QA', code: 'qa' },
  ];
  const platforms = [
    { _id: '1', name: 'Facebook', code: 'facebook' },
    { _id: '2', name: 'Instagram', code: 'instagram' },
    { _id: '3', name: 'TikTok', code: 'tiktok' },
    { _id: '4', name: 'Website', code: 'website' },
  ];
  ```
- ✅ Truyền props xuống TaskDetail:
  ```jsx
  <TaskDetail 
    task={task}
    projectName={projectName}
    canManage={hasManagePermission}
    currentUser={user}
    users={users}
    projectMembers={projectMembers}
    workTypes={workTypes}
    platforms={platforms}
  />
  ```

## Kết quả
- ✅ Khi click "Thêm công việc con" trong task detail page, sẽ mở popup `CreateSubtaskDialog` đầy đủ
- ✅ Popup có tất cả các trường: title, description, assignee, priority, workType, platforms, points, dates, estimatedHours
- ✅ Assignee được filter theo project members
- ✅ Points được validate ≤ parent task points
- ✅ Drag-and-drop reordering vẫn hoạt động bình thường

## TODO
- [ ] Tạo data loaders thật cho `workTypes` và `platforms` (hiện đang dùng hardcoded)
- [ ] Có thể tạo actions: `listWorkTypes()` và `listPlatforms()` trong `data/` folder
- [ ] Xem xét load từ MongoDB models: `workType.model.js` và `platform.model.js`

## Test
1. Mở http://localhost:3001/tasks/[taskId] (task không phải subtask)
2. Scroll xuống section "Nhiệm vụ con"
3. Click button "Thêm công việc con"
4. Verify popup hiển thị với tất cả fields
5. Điền form và tạo subtask
6. Verify subtask được lưu với đầy đủ thông tin

## Files Changed
- `components/tasks/SubtaskList.client.js` - Replaced inline form with dialog
- `components/tasks/TaskDetail.client.js` - Added props and passed to SubtaskList
- `app/(auth)/(main)/tasks/[taskId]/page.js` - Load users/members/workTypes/platforms
