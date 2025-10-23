# TASK WORKFLOW IMPLEMENTATION - COMPLETED

## ✅ ĐÃ HOÀN THÀNH

### 1. MODEL UPDATES

#### Task Model (`/model/task.model.js`)
- ✅ Thêm trường `collaborators` - Mời người vào task
- ✅ Thêm trường `progress` - Tracking tiến độ từ subtasks
- ✅ Thêm trường `subtaskPointsDistribution` - Chia điểm cho subtasks
- ✅ Thêm trường `workflowId` - Link tới workflow
- ✅ Thêm indexes: `collaborators.userId`, `workflowId`

#### Workflow Model (`/model/workflow.model.js`)
- ✅ Thêm trường `parentTask` - Link tới task chính
- ✅ Thêm trường `status` và `completedAt` trong NodeSchema
- ✅ Thêm index: `parentTask`

### 2. PROCESSORS

#### Progress Processor (`/data/task/processors/progress.js`)
- ✅ `calculateTaskProgress()` - Tính toán % hoàn thành
- ✅ `updateParentProgress()` - Cập nhật progress vào DB

#### Collaborators Processor (`/data/task/processors/collaborators.js`)
- ✅ `addCollaborator()` - Thêm collaborator
- ✅ `acceptCollaboration()` - Accept invitation
- ✅ `removeCollaborator()` - Xoá collaborator
- ✅ `isCollaborator()` - Check collaborator status
- ✅ `hasPendingInvitation()` - Check pending invitation

### 3. ACTIONS SERVER

#### Approval Actions (`/data/task/actions/approval.server.js`)
- ✅ `approveTaskCreation()` - Manager duyệt task member tạo
- ✅ `confirmAssignment()` - Assignee xác nhận nhận task
- ✅ `approveTaskCompletion()` - Manager duyệt hoàn thành (final approval)

#### Collaborators Actions (`/data/task/actions/collaborators.server.js`)
- ✅ `inviteCollaborator()` - Mời người vào task
- ✅ `acceptCollaboratorInvite()` - Accept invitation
- ✅ `removeCollaboratorFromTask()` - Xoá collaborator
- ✅ `listTaskCollaborators()` - List collaborators

#### Subtask Approval Actions (`/data/task/actions/subtask-approval.server.js`)
- ✅ `approveSubtaskCompletion()` - Parent assignee duyệt subtask
- ✅ `distributePointsToSubtasks()` - Chia điểm cho subtasks
- ✅ `getTaskProgress()` - Get progress info

### 4. WORKFLOW INTEGRATION

#### Workflow Actions (`/data/workflow/actions/server.js`)
- ✅ `createTaskWorkflow()` - Tạo workflow cho task
- ✅ `getTaskWorkflow()` - Get workflow của task
- ✅ `updateWorkflowNodeStatus()` - Update node status
- ✅ `updateNodeStatus()` - Update node manually

### 5. PERMISSIONS & SERIALIZE

#### Permissions (`/lib/permissions.js`)
- ✅ `isTaskCollaborator()` - Check collaborator status
- ✅ `canViewTask()` - Updated để support collaborators
- ✅ `canApproveSubtask()` - Check quyền duyệt subtask

#### Serialize (`/lib/serialize.js`)
- ✅ `asPlainTask()` - Updated với collaborators, progress, subtaskPointsDistribution, workflowId
- ✅ `asPlainWorkflow()` - Serialize workflow với nodes status

### 6. INDEX FILE
- ✅ `/data/task/actions/index.js` - Export tất cả actions

---

## LUỒNG HOÀN CHỈNH

### A. NHÂN VIÊN TẠO TASK
```javascript
// 1. Member tạo task
createTask(projectId, { title, description, ... })
→ status: PENDING_APPROVAL
→ approval.required: true
→ initialPoints: 0
→ Notify managers

// 2. Manager duyệt
approveTaskCreation(taskId, { 
  approve: true, 
  initialPoints: 100,
  note: "OK"
})
→ status: DRAFT
→ initialPoints: 100
→ Notify creator
```

### B. QUẢN LÝ TẠO TASK & ASSIGN
```javascript
// 1. Manager tạo & assign
createTask(projectId, { 
  title, 
  assignee: memberId,
  initialPoints: 100 
})
→ status: WAITING_ASSIGNEE_CONFIRM
→ Notify assignee

// 2. Member xác nhận
confirmAssignment(taskId, { accept: true })
→ status: IN_PROGRESS
→ startedAt: now
```

### C. XỬ LÝ TASK VỚI SUBTASKS

```javascript
// 1. Tạo subtasks
createSubtask(parentTaskId, { title, assignee, ... })
→ Tạo nhiều subtasks

// 2. Chia điểm
distributePointsToSubtasks(parentTaskId, [
  { subtaskId: 'xxx', points: 30 },
  { subtaskId: 'yyy', points: 40 },
  { subtaskId: 'zzz', points: 30 },
])
→ Total: 100 points

// 3. Mời collaborator
inviteCollaborator(subtaskId, { 
  userId: 'external_user_id',
  role: 'contributor' 
})
→ Notify user

// 4. Accept invitation
acceptCollaboratorInvite(subtaskId)
→ Can view & work on task

// 5. Subtask hoàn thành
updateTaskStatus(subtaskId, COMPLETED_AWAIT_REVIEW)

// 6. Parent duyệt
approveSubtaskCompletion(subtaskId, { approve: true })
→ subtask.status: COMPLETED
→ Auto update parent.progress
→ Update workflow node

// 7. Tạo workflow visual
createTaskWorkflow(parentTaskId, {
  name: 'Task Flow',
  nodes: [...],
  edges: [...]
})
```

### D. HOÀN THÀNH TASK TỔNG

```javascript
// 1. Assignee báo hoàn thành
updateTaskStatus(taskId, COMPLETED_AWAIT_REVIEW)

// 2. Manager duyệt cuối
approveTaskCompletion(taskId, {
  approve: true,
  finalPoints: 95,
  note: "Good job!"
})
→ status: COMPLETED
→ finalPoints: 95
→ Workflow node updated
```

---

## ĐIỂM KHÁC BIỆT VỚI YÊU CẦU

### ✅ ĐÃ ĐÁP ỨNG
1. ✅ Nhân viên tạo task → chờ duyệt + Manager set điểm
2. ✅ Manager tạo task → assign + Member xác nhận
3. ✅ Subtasks với người đứng chính
4. ✅ Chia điểm cho subtasks
5. ✅ Mời người ngoài vào task (collaborators)
6. ✅ Người đứng chính duyệt subtask
7. ✅ Progress tracking tự động
8. ✅ Manager duyệt cuối + chấm điểm
9. ✅ Workflow visual (nodes + edges)
10. ✅ Tất cả data serialize to JSON (không trả raw MongoDB ObjectId)

### 🔄 CẦN LƯU Ý
1. **Permissions cho collaborators**: Người được mời chỉ xem được task đó, không xem toàn bộ project
   - Đã implement trong `canViewTask()` check `isTaskCollaborator()`
   
2. **Comments phân biệt**: Quản lý comment task chính vs subtask
   - Đã có Comment model sẵn với trường `task`
   - Frontend cần filter comments theo taskId

3. **Điểm tính cho AppUser._id**:
   - Cần implement service riêng để:
     - Từ `externalUserId` → tìm `AppUser._id`
     - Cập nhật điểm vào AppUser document
   - Có thể tạo `/data/points/actions/server.js`

---

## TESTING CHECKLIST

- [ ] Member tạo task → status = PENDING_APPROVAL
- [ ] Manager approve → set initialPoints → status = DRAFT
- [ ] Manager tạo & assign → status = WAITING_ASSIGNEE_CONFIRM
- [ ] Assignee confirm → status = IN_PROGRESS
- [ ] Create subtasks → link parentTask
- [ ] Distribute points → update subtask initialPoints
- [ ] Invite collaborator → pending invitation
- [ ] Accept invitation → can view task
- [ ] Subtask complete → request approval
- [ ] Approve subtask → update progress
- [ ] Create workflow → link to parent task
- [ ] Complete parent → manager final approval
- [ ] All data JSON.stringify without error
- [ ] Collaborator can view task but not project

---

## NEXT STEPS (Optional)

### 1. Points Service (Tích điểm cho AppUser)
```javascript
// /data/points/actions/server.js
export async function awardPoints(externalUserId, points, reason) {
  // Tìm AppUser by externalUserId
  // Cộng điểm vào trường totalPoints
  // Log vào PointsHistory
}
```

### 2. Notification Service
- Gửi email/push khi:
  - Task cần duyệt
  - Được assign task
  - Được mời vào task
  - Task được duyệt/từ chối
  - Subtask hoàn thành

### 3. Dashboard & Analytics
- Task completion rate
- Points leaderboard
- Workflow progress visualization

---

## FILES CREATED/MODIFIED

### Created (New Files)
1. `/docs/TASK_WORKFLOW_PLAN.md` - Kế hoạch chi tiết
2. `/data/task/processors/progress.js` - Progress calculator
3. `/data/task/processors/collaborators.js` - Collaborators manager
4. `/data/task/actions/approval.server.js` - Approval actions
5. `/data/task/actions/collaborators.server.js` - Collaborator actions
6. `/data/task/actions/subtask-approval.server.js` - Subtask approval
7. `/data/task/actions/index.js` - Export all actions

### Modified (Updated Files)
1. `/model/task.model.js` - Added collaborators, progress, subtaskPointsDistribution, workflowId
2. `/model/workflow.model.js` - Added parentTask, node status
3. `/lib/permissions.js` - Added collaborator checks
4. `/lib/serialize.js` - Updated asPlainTask, added asPlainWorkflow
5. `/data/task/processors/subtasks.js` - Auto update progress
6. `/data/workflow/actions/server.js` - Added workflow for tasks

---

## BACKWARD COMPATIBILITY

✅ **100% Backward Compatible**
- Tất cả trường mới đều có giá trị default
- Dữ liệu cũ vẫn hoạt động bình thường
- Không breaking changes
