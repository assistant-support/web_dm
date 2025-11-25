````markdown
# Task reference — Mô tả chi tiết luồng Task (PROJECT & PUBLIC)

Tài liệu này tập trung mô tả mọi thứ liên quan tới Task trong codebase: model (`model/task.model.js`), processors (`data/task/processors/*`), validators (`data/task/processors/validators.js`), server actions (`data/task/actions/*`), helpers liên quan (drive, noti, permissions), invariants và ví dụ luồng nghiệp vụ.

Mục tiêu: giúp developer hiểu mọi luồng (tạo task, tạo subtask, assign, claim/public, approve completion, collaborators, outsource), nơi tìm mã nguồn, và các invariants cần bảo toàn.

---

## 1. Vị trí file chính

- Model: `model/task.model.js`
- Processors: `data/task/processors/*.js` (`repo.js`, `subtasks.js`, `compute.js`, `collaborators.js`, `progress.js`, `validators.js`)
- Actions (server): `data/task/actions/*.js` (`server.js`, `subtasks.server.js`, `approval.server.js`, `collaborators.server.js`, `project.server.js`, `subtask-approval.server.js`, `index.js`)
- Helpers liên quan: `lib/permissions.js`, `lib/drive.js`, `lib/noti.js`, `lib/noti-helpers.js`, `lib/drive-utils.js`.

---

## 2. Tổng quan model `Task` (`model/task.model.js`)

- Task hỗ trợ hai scope: `PROJECT` và `PUBLIC`.
- Các trường quan trọng:
  - `scope` — `PROJECT` hoặc `PUBLIC`.
  - `project`, `team`, `parentTask` — quan hệ.
  - `title`, `description`, `createdBy`, `assignee`, `watchers`, `collaborators`.
  - `status`, `approval`, `assigneeConfirm`, `workflowNodeKey`.
  - `plannedStartAt`, `plannedDueAt`, `startedAt`, `completedAt`, `trackedDurationSec`.
  - `initialPoints`, `finalPoints`, `public` (public metadata, claims, payouts), `outsource` (link tới bản public task nếu có).
  - `docs` — Drive folder metadata.

- Virtuals: `isSubtask`, `isOverdue`, `daysRemaining`, `archiveStatus`, `completionRate`, `activeCollaboratorsCount`, `hasDriveFolder`.

- Statics & Methods (chỉ một số quan trọng):
  - `createPublicTask`, `publishFromProjectTask`, `findByProject`, `findSubtasks`.
  - `publishPublic`, `claimPublic`, `decideClaim`, `approveCompletionWithSplit`.
  - `addCollaborator`, `removeCollaborator`, `softDelete`, `restore`.

Ghi chú: model thực hiện pre-save hooks tự cập nhật `startedAt`/`completedAt`, tính `progress.percentage`, và validate claim/publish rules.

---

## 3. Processors (DB + business logic)

- `data/task/processors/repo.js`
  - Wrapper cho các thao tác public board: `createPublicDraftTask`, `publishPublicTask`, `publishFromProjectTask`, `createClaim`, `decideClaim`, `approveCompletionWithSplit`, `listOpenPublicTasks`, `getTaskOriginMapping`, v.v.
  - Sử dụng `Task` model methods/statics; chuyển kết quả sang `asPlainTask`/`asPlainClaim`.

- `data/task/processors/validators.js`
  - Zod schemas cho public flows: `publicCreateDraftSchema`, `publicPublishSchema`, `publicClaimSchema`, `publicDecideClaimSchema`, `publicApproveCompletionWithSplitSchema`, `publicListOpenSchema`.
  - `validate(schema, payload)` ném `AppError('VALIDATION', { issues })`.

- `data/task/processors/subtasks.js`
  - `getSubtasks`, `getSubtaskStats`, `canHaveSubtasks`, `validateSubtask`, `updateParentStatusFromSubtasks`, `getTaskTree`.
  - `updateParentStatusFromSubtasks` gọi `updateParentProgress` và tự động complete/reopen parent dựa trên `autoBypassForSubtask`.

- `data/task/processors/compute.js`
  - Chuyển input approve-completion (B9) → dạng phù hợp cho `Task.approveCompletionWithSplit`. Hàm `computeFromB9Input` trả `workerSplitPoints`, `payouts`, `issues`.

- `data/task/processors/collaborators.js`
  - `addCollaborator`, `acceptCollaboration`, `removeCollaborator`, `isCollaborator`, `hasPendingInvitation` — đảm nhiệm logic mảng collaborator.

---

## 4. Server actions & luồng nghiệp vụ chính

Phân nhóm hành vi: Project-scoped (core CRUD, assign, subtasks, status, approval) và Public-scoped (public drafts, publish, claim, approve completion split).

4.1. Project-scoped flows (file: `data/task/actions/server.js`)

- `listByProject(projectId, filters)` — aggregation trả tasks root + subtaskCount; yêu cầu member hoặc admin.

- `listMyTasks(filters)` — tasks created by or assigned to user; trả cả subtasks preloaded.

- `getTaskDetail(taskId)` — aggregation đầy đủ, kiểm tra quyền (admin || creator || assignee || project member || team member).

- `createTask(projectId, payload)` — (chi tiết luồng):
  1. Kiểm tra project tồn tại, xác định `isMember` (project.members hoặc team.members), admin override.
  2. Kiểm tra permission: gọi `canCreateTask(project, user)`; hiện có assert ngăn non-manager tạo root task (manager-only). (See `lib/permissions.js` for helper logic.)
  3. Nếu `payload.assignee` không ở trong project.members thì **auto-add** vào `project.members` (idempotent) và log `project.member.added` + revalidate.
  4. Quyết định `status` / `approval` / `assigneeConfirm` dựa trên creator role:
     - Member tạo → `PENDING_APPROVAL`, `approval.required=true`, `initialPoints=0`.
     - Manager tạo → nếu assign to other → `WAITING_ASSIGNEE_CONFIRM` + `assigneeConfirm.required=true`; if assign to self → `IN_PROGRESS`; else `DRAFT`.
  5. Tạo Task document, lưu, tạo Drive folder nếu `createTaskFolder` và parentTask absent (resolve monthly folder via `resolveMonthlyDriveFolderId`).
  6. Gửi notifications (Zalo) cho assignee / PMs; logActivity `task.created`; revalidate paths & tags.

- `updateTask(taskId, payload)` — permission: manager or assignee. Assignee limited to safe fields. Validates `finalPoints` vs subtasks, cancel permissions, saves, logs, revalidate.

- `deleteTask(taskId)` — soft delete; only project manager can delete project-scoped tasks; sets `deletedAt`, logs, revalidate.

- `updateTaskStatus(taskId, status)` — anyone in project can update status (member or admin), sets timestamps, logs, revalidate.

- `assignTask(taskId, assigneeId)` — permission: manager, task assignee, or creator. Auto-add assignee to project.members if missing (and log `task.assignee.outside_team` if not in team). Subtask-specific behavior: if parentTask.assignee equals assigneeId → auto IN_PROGRESS and confirm; otherwise set `WAITING_ASSIGNEE_CONFIRM`.

- `updateKanbanOrder(taskIds)` — permission: project team member; updates `kanbanOrder` for tasks in same project.

4.2. Subtasks flows (`data/task/actions/subtasks.server.js`)

- `createSubtask(parentTaskId, payload)`:
  - Validate parent exists and project access.
  - Validate via `validateSubtask(parentTask, payload)`.
  - Permission: `canCreateSubtask(parentTask, project, user)` — manager OR creator/assignee of parent.
  - Determine `status` and `assigneeConfirm`: if assigning to parent owner → auto `IN_PROGRESS` and `assigneeConfirm.confirmed`; otherwise `WAITING_ASSIGNEE_CONFIRM`.
  - Create subtask, log `subtask.created`, notify assignee & parent owner, revalidate, and call `updateParentStatusFromSubtasks` when appropriate (on update/delete).

- `updateSubtask`, `deleteSubtask`, `reorderSubtasks`, `getTaskWithSubtasks`, `getSubtaskStats` — standard behaviors with permission checks and parent update.

4.3. Approval flows (`data/task/actions/approval.server.js`)

- `approveTaskCreation(taskId, { approve, note, initialPoints })` — manager only (`canManageProject`). If approve → set `approval.status = APPROVED`, set `initialPoints` (manager may set), set next `status` depending on `assignee` and notify. If reject → `REJECTED`.

- `confirmAssignment(taskId, { accept, note })` — assignee only; if accept → `IN_PROGRESS` and set `startedAt`; else unassign & set `DRAFT`.

- `approveTaskCompletion(taskId, { approve, finalPoints, note })` — manager only; validate subtasks completed/finalPoints rules; if approve → set `finalPoints`, `COMPLETED`, update workflow node status, notify assignee/creator, and if subtask then notify parent owner.

4.4. Collaborators flows (`data/task/actions/collaborators.server.js` + `processors/collaborators.js`)

- `inviteCollaborator(taskId, { userId, role })` — permission: assignee or project manager. Calls `addCollaborator` processor; logs, notify, revalidate.
- `acceptCollaboratorInvite(taskId)` — user accepts invitation; processor `acceptCollaboration` updates `acceptedAt`.
- `removeCollaboratorFromTask(taskId, userId)` — assignee or manager only; calls `removeCollaborator`.
- `listTaskCollaborators(taskId)` — visibility: creator/assignee/watcher/collaborator/public; else require project membership.

4.5. Public flows (publish & claim) — `data/task/processors/repo.js` + `data/task/actions/*` wrappers

- Create public draft (`createPublicDraftTask`) → publish (`publishPublicTask`) → users claim via `createClaim` (AUTO or REVIEW) or manager decide via `decideClaim`.
- Approve completion with split: `approveCompletionWithSplit` in repo delegates to Task method `approveCompletionWithSplit` which enforces `status === COMPLETED_AWAIT_REVIEW`, splits points, and updates origin task if outsource.

---

## 5. Invariants & business rules (tóm tắt)

- Project-scoped tasks require project existence; viewing requires membership or admin or creator/assignee.
- Root task creation: currently manager-only (`canCreateTask` assert in `createTask`).
- Auto-add assignee to project.members when assigning/creating with assignee not in project.members (idempotent push + log activity).
- Subtasks: only one depth (parentTask cannot itself be a subtask). `canHaveSubtasks` enforces this.
- Points validation:
  - When approving completion, finalPoints must be >= sum(finalPoints of completed subtasks).
  - Subtask finalPoints must not exceed parent initialPoints when approving subtask completion.
  - Public approval B9 input is normalized by `computeFromB9Input`.
- Collaborators: invitation/acceptance flow stored in `task.collaborators[]`; acceptedAt indicates active collaborator.

---

## 6. Side-effects & notifications

- Drive folder creation: `createTaskFolder` used in `createTask` when `createTaskFolder` requested; parent folder resolved by `resolveMonthlyDriveFolderId` (project monthly folders). Failures are logged but do not rollback task creation.
- Notifications: `notifyEvent`, `notifyTaskAssignment`, `notifySubtaskCreated`, and Zalo helpers used across actions; all are best-effort and errors are caught/logged.
- Activity log: `logActivity` is called for major mutating events (`task.created`, `task.updated`, `subtask.created`, `task.assigned`, `task.deleted`, etc.).

---

## 7. Code references (file + approximate line)

Các vị trí dưới đây là gần đúng trong repository hiện tại; mở file tương ứng để nhảy chính xác.

- Model: `model/task.model.js`
  - Task schema & virtuals: ~line 1 - 220
  - Statics: `createPublicTask`, `publishFromProjectTask`, `findByProject`, `findSubtasks`: ~line 400 - 600
  - Methods: `claimPublic`, `decideClaim`, `approveCompletionWithSplit`: ~line 520 - 780
  - Middleware hooks (pre-save): ~line 700 - 840

- Processors: `data/task/processors/*`
  - `repo.js` (public board / claim / approve wrapper): ~line 1 - 220
  - `validators.js` (Zod schemas): ~line 1 - 140
  - `subtasks.js` (subtask helpers): ~line 1 - 200
  - `compute.js` (B9 -> points mapping): ~line 1 - 160
  - `collaborators.js` (collab processors): ~line 1 - 140

- Actions: `data/task/actions/*`
  - `server.js` (project-scoped main flows): ~line 1 - 1100 (contains `listByProject`, `createTask`, `updateTask`, `deleteTask`, `updateTaskStatus`, `assignTask`, `updateKanbanOrder`, `listSubtasks`, `listMyTasks`, ...)
  - `subtasks.server.js`: ~line 1 - 300 (list/create/update/delete subtasks, getTaskWithSubtasks)
  - `approval.server.js`: ~line 1 - 260 (approve creation, confirm assignment, approve completion)
  - `collaborators.server.js`: ~line 1 - 260 (invite/accept/remove/list collaborators)

---

## 8. Example flows (short snippets)

1) Manager creates task assigned to someone else (requires assignee confirm):

```js
await createTask(projectId, {
  title: 'Design banner',
  assignee: 'u_42',
  initialPoints: 10,
  createTaskFolder: true
});
```

Server flow: `canCreateTask` (manager) → create Task doc with status `WAITING_ASSIGNEE_CONFIRM` → auto-add assignee to project.members if missing → create Drive folder (if requested) → notify assignee → logActivity → revalidate.

2) Member creates task (requires manager approval):

```js
await createTask(projectId, { title: 'Write spec', assignee: null, initialPoints: 0 });
```

Server flow: create `PENDING_APPROVAL` task with `approval.required=true` → manager calls `approveTaskCreation(taskId, { approve: true, initialPoints: 5 })` → task moves to `DRAFT` or `WAITING_ASSIGNEE_CONFIRM` or `IN_PROGRESS` depending on assignee.

3) Public claim flow (AUTO):

```js
// User claims a published public task
await createClaim({ taskId: 'PUB_TASK_ID', workerId: 'u_50', note: 'I can do this' });
```

Flow: `repo.createClaim` → `Task.claimPublic` (AUTO assigns worker & sets IN_PROGRESS) → asPlainTask returned.

---

## 9. Recommendations

- Add unit/integration tests for: auto-add-assignee behavior, subtask parent auto-complete (`autoBypassForSubtask`), point-splitting (B9) validation, collaborators invite/accept flows.
- Consider extracting Drive folder creation into a background job to avoid blocking createTask and improve consistency (or add compensating rollback on failure).
- Consider explicit audit trail for auto-added project members so operators can review automatic changes.

---

File này được sinh tự động bởi trợ lý; bạn muốn tôi commit file này lên `main` không? Gõ `viết` hoặc yêu cầu khác để tôi thực hiện tiếp.

<!-- EOF -->
````
