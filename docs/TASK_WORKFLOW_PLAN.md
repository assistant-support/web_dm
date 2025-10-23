# KẾ HOẠCH CẢI TIẾN HỆ THỐNG TASK

## MỤC TIÊU
Xây dựng hệ thống quản lý công việc với luồng phê duyệt đầy đủ, hỗ trợ:
- Phân biệt role (Manager/Member) khi tạo task
- Approval workflow cho task creation
- Assignee confirmation
- Collaborators system (mời người ngoài)
- Subtask với point distribution
- Progress tracking tự động
- Final approval từ Manager

## GIAI ĐOẠN 1: BỔ SUNG MODEL

### 1.1. Task Model - Thêm trường (backward compatible)

**File**: `/model/task.model.js`

```javascript
// THÊM VÀO TaskSchema (sau trường watchers)

// Collaborators: người được mời vào task (không cần là member project)
collaborators: [{
    _id: false,
    userId: { type: String, required: true, index: true }, // externalUserId
    invitedBy: { type: String, required: true },
    invitedAt: { type: Date, default: () => new Date() },
    acceptedAt: { type: Date },
    role: { type: String, enum: ['contributor', 'reviewer'], default: 'contributor' }
}],

// Progress tracking (auto-calculate từ subtasks)
progress: {
    _id: false,
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    inProgress: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 }, // 0-100
},

// Point distribution cho các subtasks
subtaskPointsDistribution: [{
    _id: false,
    subtaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    assignedPoints: { type: Number, default: 0, min: 0 },
}],

// Workflow reference
workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', index: true },
```

**Index mới**:
```javascript
TaskSchema.index({ 'collaborators.userId': 1, deletedAt: 1 });
TaskSchema.index({ workflowId: 1 });
```

### 1.2. Workflow Model - Cải tiến

**File**: `/model/workflow.model.js`

```javascript
// THÊM VÀO WorkflowSchema
parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },

// UPDATE NodeSchema - thêm tracking
const NodeSchema = new mongoose.Schema({
    key: { type: String, required: true },
    type: { type: String, enum: Object.values(WORKFLOW_NODE_TYPE), default: 'group' },
    label: { type: String, required: true },
    color: { type: String },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    
    // NEW: Status tracking
    status: { 
        type: String, 
        enum: ['pending', 'in_progress', 'completed', 'blocked'], 
        default: 'pending' 
    },
    completedAt: { type: Date },
    
    meta: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });
```

---

## GIAI ĐOẠN 2: PROCESSORS - Helper Functions

### 2.1. Task Processors - Progress Calculator

**File mới**: `/data/task/processors/progress.js`

```javascript
/**
 * Tính progress từ subtasks
 */
export async function calculateTaskProgress(parentTaskId) {
    const subtasks = await Task.find({
        parentTask: parentTaskId,
        deletedAt: null,
    }).lean();
    
    const total = subtasks.length;
    const completed = subtasks.filter(t => t.status === TASK_STATUS.COMPLETED).length;
    const inProgress = subtasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, inProgress, percentage };
}

/**
 * Update progress vào parent task
 */
export async function updateParentProgress(parentTaskId) {
    const progress = await calculateTaskProgress(parentTaskId);
    await Task.findByIdAndUpdate(parentTaskId, { progress });
    return progress;
}
```

### 2.2. Task Processors - Collaborators

**File mới**: `/data/task/processors/collaborators.js`

```javascript
/**
 * Thêm collaborator vào task
 */
export async function addCollaborator(taskId, { userId, invitedBy, role = 'contributor' }) {
    const task = await Task.findById(taskId);
    if (!task) throw new Error('Task not found');
    
    // Check duplicate
    const exists = task.collaborators?.find(c => String(c.userId) === String(userId));
    if (exists) throw new Error('User already added as collaborator');
    
    task.collaborators = task.collaborators || [];
    task.collaborators.push({
        userId,
        invitedBy,
        invitedAt: new Date(),
        role,
    });
    
    await task.save();
    return task;
}

/**
 * Accept collaboration invitation
 */
export async function acceptCollaboration(taskId, userId) {
    const task = await Task.findById(taskId);
    if (!task) throw new Error('Task not found');
    
    const collab = task.collaborators?.find(c => String(c.userId) === String(userId));
    if (!collab) throw new Error('No invitation found');
    
    collab.acceptedAt = new Date();
    await task.save();
    return task;
}

/**
 * Check if user is collaborator
 */
export function isCollaborator(task, userId) {
    if (!task?.collaborators) return false;
    return task.collaborators.some(c => 
        String(c.userId) === String(userId) && c.acceptedAt
    );
}
```

---

## GIAI ĐOẠN 3: ACTIONS SERVER - Workflow chính

### 3.1. Task Approval Actions

**File mới**: `/data/task/actions/approval.server.js`

```javascript
'use server';

/**
 * ACTION: Manager duyệt task do member tạo
 */
export async function approveTaskCreation(taskId, { approve, note, initialPoints = 0 }) {
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        const task = await Task.findById(taskId);
        assert(task, 'Task not found', 'NOT_FOUND', 404);
        
        const project = await Project.findById(task.project);
        assert(canManageProject(project, uid), 'FORBIDDEN', 'FORBIDDEN', 403);
        
        if (approve) {
            task.approval.status = 'approved';
            task.approval.by = uid;
            task.approval.at = new Date();
            task.approval.note = note;
            task.status = TASK_STATUS.DRAFT;
            task.initialPoints = Number(initialPoints) || 0;
        } else {
            task.approval.status = 'rejected';
            task.approval.by = uid;
            task.approval.at = new Date();
            task.approval.note = note;
            task.status = TASK_STATUS.REJECTED;
        }
        
        await task.save();
        
        await logActivity({
            actor: uid,
            team: task.team,
            project: task.project,
            task: task._id,
            type: approve ? 'task.approval.approved' : 'task.approval.rejected',
            payload: { initialPoints, note },
        });
        
        await notifyEvent(approve ? 'task.approval.approved' : 'task.approval.rejected', {
            taskId: task._id,
            projectId: task.project,
            byUserId: uid,
            toUserIds: [task.createdBy],
        });
        
        await revalidateMany([tags.project(task.project), tags.task(task._id)]);
        
        return asPlainTask(task.toObject());
    }, { requireAuth: true });
}

/**
 * ACTION: Assignee xác nhận nhận task
 */
export async function confirmAssignment(taskId, { accept, note }) {
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        const task = await Task.findById(taskId);
        assert(task, 'Task not found', 'NOT_FOUND', 404);
        assert(task.assignee === uid, 'Not assignee', 'FORBIDDEN', 403);
        
        if (accept) {
            task.assigneeConfirm.confirmedBy = uid;
            task.assigneeConfirm.confirmedAt = new Date();
            task.status = TASK_STATUS.IN_PROGRESS;
            task.startedAt = new Date();
        } else {
            task.assignee = null;
            task.assigneeConfirm = { required: false };
            task.status = TASK_STATUS.DRAFT;
        }
        
        await task.save();
        
        await logActivity({
            actor: uid,
            team: task.team,
            project: task.project,
            task: task._id,
            type: accept ? 'task.assignment.confirmed' : 'task.assignment.rejected',
            payload: { note },
        });
        
        await revalidateMany([tags.project(task.project), tags.task(task._id)]);
        
        return asPlainTask(task.toObject());
    }, { requireAuth: true });
}

/**
 * ACTION: Manager duyệt hoàn thành task (final approval)
 */
export async function approveTaskCompletion(taskId, { approve, finalPoints, note }) {
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        const task = await Task.findById(taskId);
        assert(task, 'Task not found', 'NOT_FOUND', 404);
        assert(task.status === TASK_STATUS.COMPLETED_AWAIT_REVIEW, 'Invalid status', 'BAD_REQUEST', 400);
        
        const project = await Project.findById(task.project);
        assert(canManageProject(project, uid), 'FORBIDDEN', 'FORBIDDEN', 403);
        
        if (approve) {
            task.status = TASK_STATUS.COMPLETED;
            task.finalPoints = Number(finalPoints) || 0;
            task.scoredBy = uid;
            task.scoredAt = new Date();
            
            // Update workflow node if exists
            if (task.workflowNodeKey) {
                await updateWorkflowNodeStatus(task.workflowId, task.workflowNodeKey, 'completed');
            }
        } else {
            task.status = TASK_STATUS.IN_PROGRESS;
            task.completedAt = null;
        }
        
        await task.save();
        
        await logActivity({
            actor: uid,
            team: task.team,
            project: task.project,
            task: task._id,
            type: approve ? 'task.completion.approved' : 'task.completion.rejected',
            payload: { finalPoints, note },
        });
        
        await notifyEvent(approve ? 'task.completion.approved' : 'task.completion.rejected', {
            taskId: task._id,
            projectId: task.project,
            byUserId: uid,
            toUserIds: [task.assignee, task.createdBy].filter(Boolean),
        });
        
        await revalidateMany([tags.project(task.project), tags.task(task._id)]);
        
        return asPlainTask(task.toObject());
    }, { requireAuth: true });
}
```

### 3.2. Collaborators Actions

**File mới**: `/data/task/actions/collaborators.server.js`

```javascript
'use server';

/**
 * ACTION: Mời người vào task (collaborator)
 */
export async function inviteCollaborator(taskId, { userId, role = 'contributor' }) {
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        const task = await Task.findById(taskId);
        assert(task, 'Task not found', 'NOT_FOUND', 404);
        
        // Chỉ assignee hoặc manager mới mời được
        const project = await Project.findById(task.project);
        const canInvite = task.assignee === uid || canManageProject(project, uid);
        assert(canInvite, 'FORBIDDEN', 'FORBIDDEN', 403);
        
        const updated = await addCollaborator(taskId, { userId, invitedBy: uid, role });
        
        await logActivity({
            actor: uid,
            team: task.team,
            project: task.project,
            task: task._id,
            type: 'task.collaborator.invited',
            payload: { userId, role },
        });
        
        await notifyEvent('task.collaborator.invited', {
            taskId: task._id,
            projectId: task.project,
            byUserId: uid,
            toUserIds: [userId],
        });
        
        await revalidateMany([tags.task(task._id)]);
        
        return asPlainTask(updated.toObject());
    }, { requireAuth: true });
}

/**
 * ACTION: Chấp nhận lời mời collaborator
 */
export async function acceptCollaboratorInvite(taskId) {
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        const updated = await acceptCollaboration(taskId, uid);
        
        await logActivity({
            actor: uid,
            project: updated.project,
            task: updated._id,
            type: 'task.collaborator.accepted',
        });
        
        await revalidateMany([tags.task(taskId)]);
        
        return asPlainTask(updated.toObject());
    }, { requireAuth: true });
}
```

### 3.3. Subtask Advanced Actions

**File mới**: `/data/task/actions/subtask-approval.server.js`

```javascript
'use server';

/**
 * ACTION: Parent task assignee duyệt subtask hoàn thành
 */
export async function approveSubtaskCompletion(subtaskId, { approve, note }) {
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        const subtask = await Task.findById(subtaskId);
        assert(subtask, 'Subtask not found', 'NOT_FOUND', 404);
        assert(subtask.parentTask, 'Not a subtask', 'BAD_REQUEST', 400);
        
        const parentTask = await Task.findById(subtask.parentTask);
        assert(parentTask.assignee === uid, 'Not parent task owner', 'FORBIDDEN', 403);
        
        if (approve) {
            subtask.status = TASK_STATUS.COMPLETED;
            subtask.completedAt = new Date();
            
            // Update progress
            await updateParentProgress(subtask.parentTask);
            
            // Update workflow node
            if (subtask.workflowNodeKey && parentTask.workflowId) {
                await updateWorkflowNodeStatus(parentTask.workflowId, subtask.workflowNodeKey, 'completed');
            }
        } else {
            subtask.status = TASK_STATUS.IN_PROGRESS;
            subtask.completedAt = null;
        }
        
        await subtask.save();
        
        await logActivity({
            actor: uid,
            project: subtask.project,
            task: subtask._id,
            type: approve ? 'subtask.approved' : 'subtask.rejected',
            payload: { note },
        });
        
        await revalidateMany([
            tags.task(subtask._id),
            tags.task(subtask.parentTask),
        ]);
        
        return asPlainTask(subtask.toObject());
    }, { requireAuth: true });
}

/**
 * ACTION: Set points cho subtasks
 */
export async function distributePointsToSubtasks(parentTaskId, distribution) {
    // distribution: [{ subtaskId, points }]
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        const task = await Task.findById(parentTaskId);
        assert(task, 'Task not found', 'NOT_FOUND', 404);
        assert(task.assignee === uid, 'Not task owner', 'FORBIDDEN', 403);
        
        const totalAssigned = distribution.reduce((sum, d) => sum + (d.points || 0), 0);
        assert(totalAssigned <= task.initialPoints, 'Points exceed limit', 'BAD_REQUEST', 400);
        
        task.subtaskPointsDistribution = distribution.map(d => ({
            subtaskId: d.subtaskId,
            assignedPoints: d.points,
        }));
        
        await task.save();
        
        // Update subtasks initialPoints
        for (const d of distribution) {
            await Task.findByIdAndUpdate(d.subtaskId, {
                initialPoints: d.points,
            });
        }
        
        await logActivity({
            actor: uid,
            project: task.project,
            task: task._id,
            type: 'task.points.distributed',
            payload: { distribution },
        });
        
        await revalidateMany([tags.task(parentTaskId)]);
        
        return asPlainTask(task.toObject());
    }, { requireAuth: true });
}
```

---

## GIAI ĐOẠN 4: PERMISSIONS - Cập nhật

### 4.1. Cập nhật lib/permissions.js

```javascript
// THÊM VÀO /lib/permissions.js

/**
 * Check if user is collaborator of task
 */
export function isTaskCollaborator(task, uid) {
    if (!task?.collaborators || !uid) return false;
    return task.collaborators.some(c => 
        String(c.userId) === String(uid) && c.acceptedAt
    );
}

/**
 * Có thể xem task (bao gồm collaborators)
 */
export function canViewTask(task, uid) {
    if (!task || !uid) return false;
    
    // Public đã publish
    if (task.scope === 'public' && task.public?.published) {
        return true;
    }
    
    // Creator, assignee, watchers
    if (task.createdBy === uid) return true;
    if (task.assignee === uid) return true;
    if (Array.isArray(task.watchers) && task.watchers.includes(uid)) return true;
    
    // Collaborators (THÊM MỚI)
    if (isTaskCollaborator(task, uid)) return true;
    
    // Project members
    if (task.project) {
        return canViewProject(task.project, uid);
    }
    
    return false;
}

/**
 * Check quyền duyệt subtask (chỉ parent task assignee)
 */
export function canApproveSubtask(subtask, parentTask, uid) {
    if (!subtask?.parentTask || !parentTask || !uid) return false;
    return String(parentTask.assignee) === String(uid);
}
```

---

## GIAI ĐOẠN 5: SERIALIZE - Cập nhật

### 5.1. Cập nhật lib/serialize.js

```javascript
// THÊM VÀO asPlainTask()

export function asPlainTask(doc) {
    if (!doc) return null;
    return {
        // ... giữ nguyên các trường cũ ...
        
        // THÊM MỚI
        collaborators: Array.isArray(doc.collaborators) 
            ? doc.collaborators.map(c => ({
                userId: String(c.userId),
                invitedBy: String(c.invitedBy),
                invitedAt: toPlainDate(c.invitedAt),
                acceptedAt: toPlainDate(c.acceptedAt),
                role: c.role,
            }))
            : [],
        
        progress: doc.progress ? {
            total: doc.progress.total || 0,
            completed: doc.progress.completed || 0,
            inProgress: doc.progress.inProgress || 0,
            percentage: doc.progress.percentage || 0,
        } : { total: 0, completed: 0, inProgress: 0, percentage: 0 },
        
        subtaskPointsDistribution: Array.isArray(doc.subtaskPointsDistribution)
            ? doc.subtaskPointsDistribution.map(d => ({
                subtaskId: toPlainId(d.subtaskId),
                assignedPoints: d.assignedPoints || 0,
            }))
            : [],
        
        workflowId: toPlainId(doc.workflowId),
        
        // ... phần còn lại ...
    };
}
```

---

## GIAI ĐOẠN 6: WORKFLOW INTEGRATION

### 6.1. Workflow Actions

**File mới**: `/data/workflow/actions/server.js`

```javascript
'use server';

/**
 * ACTION: Tạo workflow cho parent task
 */
export async function createTaskWorkflow(parentTaskId, { name, nodes, edges }) {
    return runAction(async ({ user }) => {
        const uid = user.externalUserId;
        const task = await Task.findById(parentTaskId);
        assert(task, 'Task not found', 'NOT_FOUND', 404);
        assert(task.assignee === uid, 'Not task owner', 'FORBIDDEN', 403);
        
        const workflow = await Workflow.create({
            parentTask: parentTaskId,
            project: task.project,
            name,
            nodes,
            edges,
            version: 1,
            isActive: true,
        });
        
        task.workflowId = workflow._id;
        await task.save();
        
        await logActivity({
            actor: uid,
            project: task.project,
            task: task._id,
            type: 'workflow.created',
            payload: { workflowId: workflow._id },
        });
        
        await revalidateMany([tags.task(parentTaskId)]);
        
        return asPlainWorkflow(workflow.toObject());
    }, { requireAuth: true });
}

/**
 * Helper: Update workflow node status
 */
export async function updateWorkflowNodeStatus(workflowId, nodeKey, status) {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) return;
    
    const node = workflow.nodes.find(n => n.key === nodeKey);
    if (!node) return;
    
    node.status = status;
    if (status === 'completed') {
        node.completedAt = new Date();
    }
    
    await workflow.save();
    return workflow;
}
```

---

## LUỒNG HOÀN CHỈNH THEO YÊU CẦU

### A. NHÂN VIÊN TẠO TASK

```
1. createTask(projectId, payload) 
   → status = PENDING_APPROVAL
   → approval.required = true
   → initialPoints = 0
   → Notify managers

2. Manager: approveTaskCreation(taskId, { approve: true, initialPoints: X })
   → status = DRAFT
   → initialPoints = X
   → approval.status = 'approved'
   → Notify creator

3. Task bắt đầu: updateTaskStatus(taskId, IN_PROGRESS)
```

### B. QUẢN LÝ TẠO TASK

```
1. createTask(projectId, { assignee: memberId, initialPoints: X })
   → status = WAITING_ASSIGNEE_CONFIRM
   → assigneeConfirm.required = true
   → initialPoints = X (manager set được)
   → Notify assignee

2. Assignee: confirmAssignment(taskId, { accept: true })
   → status = IN_PROGRESS
   → startedAt = now
   → Notify creator/manager
```

### C. XỬ LÝ TASK & SUBTASKS

```
1. Tạo subtasks: createSubtask(parentTaskId, payload)
   → Nhiều subtasks cho 1 parent

2. Chia điểm: distributePointsToSubtasks(parentTaskId, distribution)
   → Set initialPoints cho từng subtask

3. Mời collaborator: inviteCollaborator(subtaskId, { userId })
   → Người ngoài project có thể tham gia subtask

4. Collaborator accept: acceptCollaboratorInvite(subtaskId)

5. Subtask hoàn thành: updateTaskStatus(subtaskId, COMPLETED_AWAIT_REVIEW)

6. Parent duyệt: approveSubtaskCompletion(subtaskId, { approve: true })
   → Auto update progress của parent

7. Tạo workflow: createTaskWorkflow(parentTaskId, { nodes, edges })
   → Workflow visual cho subtasks
```

### D. HOÀN THÀNH TASK TỔNG

```
1. Assignee: updateTaskStatus(taskId, COMPLETED_AWAIT_REVIEW)

2. Manager: approveTaskCompletion(taskId, { approve: true, finalPoints: Y })
   → status = COMPLETED
   → finalPoints = Y
   → Update workflow node
```

---

## IMPLEMENTATION ORDER

1. ✅ **Model updates** (Task + Workflow)
2. ✅ **Processors** (progress.js, collaborators.js)
3. ✅ **Actions** (approval.server.js, collaborators.server.js, subtask-approval.server.js)
4. ✅ **Permissions** updates
5. ✅ **Serialize** updates
6. ✅ **Workflow** integration

## TESTING CHECKLIST

- [ ] Member tạo task → pending approval
- [ ] Manager approve task → can set points
- [ ] Manager tạo task & assign → assignee confirm
- [ ] Create subtasks & distribute points
- [ ] Invite collaborators (in/out project)
- [ ] Approve subtask completion → progress updates
- [ ] Create workflow for parent task
- [ ] Final approval → task completed
- [ ] All data serialize to plain JSON
- [ ] Permissions check collaborators
