# Hệ thống web_dm — Tổng quan kỹ thuật và hướng dẫn sử dụng

Tài liệu này mô tả cấu trúc, các mô hình (models) chính, hành vi nghiệp vụ quan trọng, phân quyền, chức năng, và một số lưu ý vận hành dành cho người phát triển/triển khai hệ thống `web_dm`.

Mục đích: giúp người đọc nắm rõ cách sử dụng hệ thống, nơi tìm mã nguồn liên quan, và cảnh báo những điểm cần lưu ý khi vận hành hoặc thay đổi mã.

---

## 1. Kiến trúc tổng quát

- Next.js (App Router) với `app/` chứa page + client components.
- Server-side logic được tổ chức qua `data/` (server actions, processors, repo), `model/` (Mongoose models), và `lib/` (helpers chung: drive, noti, permissions, db).
- Client components nằm trong `components/` và `hooks/` (ví dụ: `useDmAgentSocket`, nhiều client components `.client.js`).
- Drive integration, notifications và side-effects được đặt trong `lib/` và là "best-effort" (không làm rollback nếu thất bại).

---

## 2. Các mô hình chính (Model)
Tập trung vào các model mà hệ thống phụ thuộc nhiều.

### 2.1. Task (Task model)
- File tham chiếu: `model/task.model.js`.
- Các trường quan trọng: title, description, project, team, assignee (externalUserId), status, points, initialPoints, finalPoints, startedAt, completedAt, createdBy, parentTask (nếu là subtask), assigneeConfirm, approval metadata, trackedDurationSec, deletedAt, remindAt, reminderSent.
- Hành vi nổi bật:
  - pre-save hooks cập nhật `startedAt`/`completedAt` khi `status` chuyển sang tương ứng.
  - `approveCompletionWithSplit` (nếu có) sẽ điều chỉnh `finalPoints` khi duyệt hoàn thành.
  - Server actions (create/update) đảm bảo ràng buộc points và status.

### 2.2. Project
- File tham chiếu: `model/project.model.js`, repo ở `data/project/processors/repo.js`.
- Lưu metadata Drive: `driveFolderId`, `monthlyDriveFolders`, v.v.
- Members: mảng object { userId (externalUserId), role }.
- Khi tạo project, hệ thống có thể tạo 12 folder tháng (`createProjectMonthlyFolders`).

### 2.3. Team
- File: `model/team.model.js`.
- Members và roles tương tự project; có các hành vi thêm/bỏ thành viên, đảm bảo không xóa manager cuối cùng.

### 2.4. User
- File: `model/user.model.js`.
- Trường `externalUserId` là key dùng trong toàn hệ thống (không dùng Mongo `_id` ở nhiều chỗ).
- Có helper `lib/oauth-client.js` để sync user từ Authorization Server vào DB (lưu ý về `externalUserId` vs `sub`).

### 2.5. Attachment
- File: `model/attachment.model.js`.
- Lưu metadata liên quan tới Drive, counters, và liên kết với task/project.
- Upload flow: client → server action `createAttachment` → upload tới Drive (via `lib/drive.js`) → save metadata.

### 2.6. Comment, Notification, Activity
- `comment.model.js`, `notification.model.js`, `activityLog.model.js`.
- Comment có mentions; hệ thống dùng `notifyEvent` để gửi noti (in-app + Zalo stub).

---

## 3. Quyền (Permissions)
Tất cả kiểm tra quan trọng được enforce ở server-side (helper ở `lib/permissions.js`). UI chỉ làm gợi ý.

Các helper chính:
- `canManageProject(project, user)`: kiểm tra manager/owner.
- `canCreateTask(project, user)`: tạo task trong project.
- `canEditTask(task, user)`: sửa task (tuỳ quyền và vai trò).
- `canAssignTask(task, project, user)`: quyền gán assignee.
- `canCreateSubtask(parentTask, project, user)`: quyền tạo subtask (manager hoặc creator/assignee của task cha).
- `canApproveSubtask(...)` / duyệt hoàn thành: quyền thuộc quản lý hoặc theo rules cụ thể.

Quy tắc truy cập chung:
- Project-scoped resources: chỉ member của project (hoặc admin) có thể xem/tạo; các action quan trọng phải gọi `canManageProject`.
- Team-scoped resources: tương tự team membership.
- Một số actions cho phép thêm "outsider" vào project (được log & warn) — repo cho phép nhưng cảnh báo.

---

## 4. Luồng nghiệp vụ chính (Features)

### 4.1. Tạo Task
- Thực hiện qua server action (ví dụ `data/task/actions/server.js`).
- Khi tạo task có assignee: server đảm bảo người được giao nằm trong `project.members` (auto-add nếu cần), và set status phù hợp (PENDING_APPROVAL hay IN_PROGRESS tùy context).
- Nếu tạo task con (subtask), một số trường được kế thừa từ parent.

Ví dụ ngắn:
1. Client gọi server action `createTask(payload)`.
2. Server validate và enforce quyền bằng `canCreateTask`.
3. Server tạo Task record và log activity, revalidate tags (ISR), tạo Drive folder nếu cần.
4. Server gửi notification (best-effort) và trả về plain task.

### 4.2. Gán Assignee
- Hành vi tự động: khi gán một người (externalUserId) mà chưa có trong project.members, server auto thêm vào project.members (best-effort) — để đảm bảo assignee có quyền.
- Quyền gán do `canAssignTask` quyết định.

### 4.3. Subtasks
- Tạo ở `data/task/actions/subtasks.server.js`.
- Quyền: `canCreateSubtask(parentTask, project, user)` — manager hoặc creator/assignee của parent.
- Khi parent owner tự giao subtask cho mình → status: `IN_PROGRESS` và `assigneeConfirm` auto confirmed.
- Nếu giao cho người khác → `WAITING_ASSIGNEE_CONFIRM` và require confirm.
- Khi subtasks thay đổi, parent status có thể được cập nhật từ logic `updateParentStatusFromSubtasks`.

### 4.4. Drive integration (Google Drive)
- `lib/drive.js` cung cấp: createFolder, createProjectMonthlyFolders, createTaskFolder, uploadFile, moveFile, deleteFile.
- Credentials: `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `DRIVE_SHARED_DRIVE_ID` hoặc `DRIVE_ROOT_FOLDER_ID` sử dụng để quyết định root.
- Lưu ý: tạo folder / upload có thể fail — server thường xử lý là "best-effort" (log lỗi nhưng không rollback data chính).

### 4.5. Notifications
- `lib/noti.js` + `lib/noti-helpers.js` + `data/noti/processors/service.js`.
- notifyEvent → build message theo RULES → gửi in-app (`Notification` model) và Zalo stub.
- Scheduler `data/noti/actions/server.js` có `scanDueTasks` để quét remind/overdue.
- Lưu ý: trong môi trường DEV, noti thường là log/stub để tránh phụ thuộc hạ tầng.

### 4.6. Points & Scoring
- `task.model.js` có `initialPoints`, `finalPoints` và validate/approve flows.
- Khi task được duyệt, `finalPoints` được tính/ghi lại, có thể trigger point distributions.

---

## 5. API & Server Actions (các entry points quan trọng)
- `data/task/actions/*`: create, update, assign, updateStatus, subtasks
- `data/project/actions/*`: create, update, add/remove members
- `data/team/actions/*`: team CRUD
- `data/comment/actions/*`: create comment, list, remove
- `data/noti/actions/*`: scanDueTasks, sendTest

Chỉ gọi các server action này từ client. Mọi kiểm tra quyền/validate đều nằm trong server action.

---

## 6. Hướng dẫn sử dụng nhanh (Use-cases)

1. Tạo task từ UI
   - Điền `title`, `project` (bắt buộc nếu cần phân công), `assignee` (externalUserId), `points`.
   - Server sẽ validate và trả về object task.

2. Gán lại người làm
   - Gọi action assign; server sẽ đảm bảo thành viên được thêm vào project nếu cần.

3. Tạo subtask
   - Tạo subtask từ task detail; server sẽ kiểm tra quyền: manager hoặc creator/assignee của parent.

4. Duyệt hoàn thành
   - Quyền duyệt: manager; khi duyệt, `finalPoints` được set và có thể trigger points distribution.

---

## 7. Lưu ý khi phát triển & vận hành
- Quyền quan trọng luôn phải kiểm tra ở server-side (UI chỉ là gợi ý). Không tin vào client input.
- Drive & external services là side-effect: errors được log và thường không rollback transaction chính (thiếu Drive không nên phá huỷ task creation).
- Env vars cần thiết cho Drive: `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `DRIVE_SHARED_DRIVE_ID` / `DRIVE_ROOT_FOLDER_ID`.
- Notifications có stub trong code: kiểm tra `data/noti` và `lib/noti.js` nếu muốn bật thực tế.
- User identity: dùng `externalUserId` làm khóa phân quyền nội bộ. Cẩn trọng khi sync từ OAuth providers — `lib/oauth-client.js` có logic fixed externalUserId.
- Tránh để `console.log` debug trên production (đã loại bỏ nhiều logs). Giữ `console.error`/`warn` cho lỗi nghiêm trọng.

---

## 8. Vị trí mã nguồn tham chiếu (quick map)
- Models: `model/*.model.js` (task, project, team, user, attachment, comment, notification)
- Server actions: `data/*/actions/*.js`
- Processors / repo: `data/*/processors/*.js` (validators, repo, processors)
- Lib helpers: `lib/permissions.js`, `lib/drive.js`, `lib/noti.js`, `lib/noti-helpers.js`, `lib/oauth-client.js`, `lib/chat-storage.js`.
- Client components: `components/` and hooks in `hooks/`.
- Guide viewer (in-app docs): `app/(auth)/(main)/guide/page.js` and `GuideViewer.client.js`.

---

## 9. Các câu hỏi thường gặp / Troubleshooting
- "Tại sao assignee không có trong project?" → server sẽ auto-add khi cần; kiểm tra action logs và `project.members`.
- "Drive folder không tạo được" → kiểm tra env vars và quyền SA; Drive errors không rollback task creation.
- "Điểm (points) bị sai" → kiểm tra `finalPoints` logic trong `task.model` và flow `approveCompletionWithSplit`.

---

## 10. Next steps & đề xuất
- Thêm tests cho server actions quan trọng (createTask, assignTask, createSubtask, approveCompletion).
- Bật logging structured (winston/pino) cho production thay vì `console.*`.
- Thêm scripts CI để run `npm run build` và lint trước khi merge.

---

Tài liệu này dựa trên mã nguồn hiện có trong kho (`model/`, `data/`, `lib/`, `components/`, `hooks/`) và các hành vi đã được kiểm tra thực tế trong code. Nếu bạn muốn, tôi có thể:
 
 ---
 
 ## 11. Task collaborators (Quản lý cộng tác viên)
 
 - **File:** `data/task/actions/collaborators.server.js`
 - **Purpose:** Thực hiện các server action liên quan tới mời/đồng ý/xóa/hiển thị collaborators trên một task.
 
 Các action chính:
 - **inviteCollaborator(taskId, { userId, role })**:
    - Quyền: chỉ assignee của task hoặc người có quyền quản lý project (`canManageProject`) có thể mời.
    - Hành động: gọi processor `addCollaborator` để thêm collaborator (lưu invitedBy, role), log activity (`logActivity`), gửi notification (`notifyEvent`) và revalidate tags liên quan (`revalidateMany`).
    - Trả về: plain task (sử dụng `asPlainTask`).
 
 - **acceptCollaboratorInvite(taskId)**:
    - Quyền: người dùng hiện tại (invitee) có thể gọi để chấp nhận.
    - Hành động: gọi `acceptCollaboration`, log activity, gửi notification tới assignee/creator nếu cần, revalidate tag task.
    - Trả về: plain task.
 
 - **removeCollaboratorFromTask(taskId, userId)**:
    - Quyền: chỉ assignee của task hoặc manager project (`canManageProject`) có thể xóa collaborator.
    - Hành động: gọi processor `removeCollaborator`, log activity, revalidate tag task.
    - Trả về: plain task.
 
 - **listTaskCollaborators(taskId)**:
    - Quyền xem: creator, assignee, watcher, collaborator đã accept, hoặc task public đã publish; nếu chưa có, kiểm tra membership trong project (`canViewProject`).
    - Trả về: mảng collaborator với các trường `userId`, `invitedBy`, `invitedAt`, `acceptedAt`, `role` (dạng string/ISO date).
 
 Implementation notes / important behaviors:
 - Processors used: `data/task/processors/collaborators.js` exports `addCollaborator`, `acceptCollaboration`, `removeCollaborator` — giữ logic thao tác mảng collaborators/acceptedAt tại một nơi.
 - Notifications & activity: mọi thay đổi collaborator đều được log (`logActivity`) và gửi event (`notifyEvent`) — các side-effect này là best-effort.
 - Permissions: các checks nằm trong action (không phụ thuộc vào UI). Hãy dùng helper permissions nếu mở rộng logic.
 - Revalidation: sau mutating actions, `revalidateMany` được gọi với tags tương ứng (`tags.task`, `tags.project`).
 
 ---
 
 <!-- EOF -->
<!-- EOF -->

---

## 12. Project actions (Quản lý Project)

- **File:** `data/project/actions/server.js`
- **Purpose:** Các CRUD và quản lý thành viên cho Project; dùng repo layer để thực hiện thao tác DB và dùng `lib/noti-helpers.js` để gửi thông báo liên quan member.

Các action chính và hành vi:
- **listByTeamAction(teamId)**
   - Quyền: Người gọi phải là thành viên team hoặc admin.
   - Hành động: dùng `listByTeam` từ repo để trả về danh sách project; serialize bằng `asPlainProject`.

- **getDetailAction(projectId)**
   - Quyền: chỉ member của project hoặc admin có thể xem.
   - Hành động: trả về project đã serialize bởi `asPlainProject`.

- **create(payload)**
   - Quyền: **chỉ admin** (`user.role === 'admin'`).
   - Hành động: validate payload, gọi `createProject`, log activity, revalidate tags (team/project).

- **update(projectId, patch)**
   - Quyền: `canManageProject` kiểm tra trên project hiện tại.
   - Hành động: gọi `updateProject`, log activity, revalidate tags team/project.

- **archive(projectId)**
   - Quyền: `canManageProject`.
   - Hành động: gọi `archiveProject` (soft-delete), log activity, revalidate tags.

- **addMemberAction(projectId, payload)**
   - Quyền: `canManageProject`.
   - Hành động đặc biệt: hệ thống **cho phép** thêm user không nằm trong team (outsider) — trường hợp này sẽ chỉ log (warn) và proceed; sau đó gọi `addMember` repo, log activity và gửi notification (`notifyProjectMemberAdded`).
   - Revalidation: team/project and `tags.userInbox(userId)`.

- **removeMemberAction(projectId, payload)**
   - Quyền: `canManageProject`.
   - Hành động: gọi `removeMember`, log activity, gửi notification tới managers (`notifyProjectMemberRemoved`).

- **changeRole(projectId, payload)**
   - Quyền: `canManageProject`.
   - Hành động: gọi `changeMemberRole`, log activity, thông báo (`notifyProjectMemberRoleUpdated`) tới managers.

- **deleteProjectAction(projectId)**
   - Quyền: chỉ project owner hoặc global admin có thể xóa (soft-delete via `archiveProject`).

Implementation notes / important behaviors:
- Repo layer: file uses `data/project/processors/repo.js` to centralize DB operations (listByTeam, createProject, updateProject, archiveProject, addMember, removeMember, changeMemberRole). Prefer calling repo functions to keep logic consistent.
- Notifications: member-related actions call `lib/noti-helpers.js` functions; these are best-effort (promises caught with `.catch` and logged).
- Outsider handling: adding a user not in the team is allowed but logged as warning. This is a deliberate behavior to allow cross-team collaboration.
- Revalidation: after mutating actions the code calls `revalidateMany` on `tags.team`, `tags.project`, and sometimes `tags.userInbox`.

---

<!-- EOF -->

---

## 13. Team actions (Quản lý Team)

- **Files:** `data/team/actions/server.js`, `data/team/actions/management.js`
- **Purpose:** CRUD cho Team, quản lý thành viên, archive/delete team, và các thao tác quản trị liên quan ownership/transfer.

Các action chính và hành vi:
- **listMy() / listManagedTeams()**
   - Quyền: yêu cầu auth; admin trả về tất cả teams; user trả về teams họ tham gia.
   - Hành động: trả về danh sách team đã serialize (`asPlainTeam`).

- **getByIdAction(teamId)**
   - Quyền: chỉ member hoặc admin có quyền xem chi tiết team.

- **create(payload)**
   - Quyền: **Nếu `team` được cung cấp** → người gọi phải là quản lý/owner của team (team manager/creator). **Nếu không có `team`** → chỉ Global Admin (`user.role === 'admin'`) mới được tạo. Log activity và revalidate tag team.

- **update(teamId, patch)**
   - Quyền: `isTeamManager` required; update via repo `updateTeam`, log và revalidate.

- **archive(teamId)**
   - Quyền: `isTeamManager`.
   - Hành động: gọi `archiveTeam`, rồi archive toàn bộ project liên quan (sử dụng `listProjectsByTeam` + `archiveProject`). Log activity và revalidate team + projects.

- **addMemberAction(teamId, payload)**
   - Quyền: `isTeamManager`.
   - Hành động: gọi `addMember` repo, log activity, gửi notification (`notifyTeamMemberAdded`), revalidate `tags.team`.

- **removeMemberAction(teamId, payload)**
   - Quyền: `isTeamManager`.
   - Hành động: gọi `removeMember`, log activity, gửi notification tới managers (`notifyTeamMemberRemoved`), revalidate `tags.team` và `tags.userInbox(userId)`.

- **changeRole(teamId, payload)**
   - Quyền: `isTeamManager`.
   - Hành động: gọi `changeMemberRole`, log activity, notify managers, revalidate.

Management actions (file `management.js`):
- **toggleArchive(payload)**
   - Quyền: `isTeamManager`.
   - Hành động: bật/tắt `team.isActive`, save, revalidate tag team; trả về trạng thái mới.

- **deleteTeam(payload)**
   - Quyền: `isTeamManager`.
   - Hành động: yêu cầu confirmText đúng (tên team), kiểm tra không còn project/task ràng buộc (projectCount === 0, taskCount === 0), sau đó xóa team (`findByIdAndDelete`). Revalidate tag team.

- **transferOwnership(payload)**
   - Quyền: `isTeamManager`.
   - Hành động: thay đổi roles trong `team.members` để chuyển manager sang `newManagerUserId`, save và revalidate.

Implementation notes / important behaviors:
- Cascading archive: archiving a team archives its projects via `archiveProject` — note this is a potentially long-running set of operations executed sequentially in the action.
- Deletion safety: `deleteTeam` enforces that there are no projects or orphan tasks before allowing delete (prevents accidental data loss).
- Notifications: team member changes use `lib/noti-helpers.js` and are best-effort (errors are caught and logged).
- Revalidation: team-related mutating actions call `revalidateMany` for `tags.team`, and sometimes also for projects and user inbox tags.

---

<!-- EOF -->

---

## 14. Notifications & Drive actions

Notifications:
- **File:** `data/noti/actions/server.js`
- **Purpose:** Scheduler and test helpers for notifications. Key actions:
   - **scanDueTasks()**: intended for cron — finds tasks with `remindAt` due and tasks overdue, sends `notifyEvent('task.reminder'|'task.overdue')` to recipients, marks `reminderSent` to avoid repeats. `requireAuth: false` so the scheduler can call it.
   - **sendTest(payload)**: developer/test helper to send a test notification event (defaults to `task.reminder`) to the calling user. Useful for manual testing and verifying `notifyEvent` behavior.

Drive actions (file uploads):
- **File:** `data/drive/actions/server.js` (contains actions like `uploadFileToTaskAction`)
- **Purpose:** Provide server actions that accept FormData for file uploads and route them to `lib/drive` helpers.
   - Example behavior (`uploadFileToTaskAction`): validate `taskId` and file, check that task has a `docs.driveFolderId`, call `driveUploadFile` (via `lib/drive`), then update Task document (`fileIds` and `attachmentsCount`). Returns success/failure with details.
   - Errors and warnings are logged; failure to update DB after upload is treated specially: the file may exist in Drive but the Task update could fail — code logs a warning and returns an error state.

Implementation notes / important behaviors:
- `scanDueTasks` avoids spamming by setting `reminderSent=true` after sending reminder/overdue notifications.
- `sendTest` is useful for debugging; it requires auth and passes options like `totalPoints` or `accept` to simulate different event payloads.
- Drive upload server actions use `FormData` and Buffer conversion; they rely on `lib/drive.uploadFile` and expect `driveFile.id` in response. They return structured results indicating DB update status.
- Drive operations are best-effort for external storage; failures are logged and surfaced to caller, but typically do not roll back unrelated DB work unless explicitly handled.

---

<!-- EOF -->

---

## 15. Attachments & Comments

Attachments (file operations):
- **Files:** `data/attachment/actions/server.js`, `data/attachment/actions/list.server.js`
- **Purpose:** Upload/list/rename/move/delete attachments; integrate with Drive via processors and keep DB in sync.

Key behaviors:
- **create / upload**: accept `FormData` (`create`) or JSON payload (`upload`), validate `scope` ('project'|'task'), check `project` and `task` consistency, enforce permission via `canManageProject` / `canViewProject` / `canEditTask` depending on scope, determine parent Drive folder with `ensureProjectFolder` / `ensureTaskFolder`, call drive adapter to upload, create DB record via repo, log activity, send `attachment.added` notifications (managers + assignee) and revalidate tags.
- **listProjectAttachments / listTaskAttachments / listAttachments(params)**: controlled listing with filters, access-context resolution (projects user can access, managed projects, personal scope), preview warming (calls `lib/drive.getFileMeta`), pagination and serialization for safe JSON.
- **rename / move / remove**: permission checks (owner or project manager for rename/remove; more nuanced checks for move), calls drive adapter (rename/move/delete), update repo, log and notify, revalidate relevant tags. Move explicitly forbids cross-project moves.

Important implementation notes:
- Attachment upload supports both streaming FormData and base64 payloads (see `upload`).
- `ATTACHMENTS_PROJECT_UPLOAD` env var controls whether non-managers can upload to projects (`members` value allows it).
- Deletion mode controlled by `ATTACHMENTS_DELETE` env var: `hard` will remove Drive file as well.
- Listing logic is complex and intentionally conservative: it builds an access context to ensure only allowed attachments are returned and warms preview metadata in parallel.

Comments:
- **File:** `data/comment/actions/server.js`
- **Purpose:** Create/list/delete comments on tasks, extract mentions, notify recipients, maintain counts and revalidate task/project.

Key behaviors:
- **create(payload)**: requires project membership (`canViewProject`) to post; extracts mentions from comment body (processor `extractMentions`), creates comment via repo, logs activity, sends `comment.added` to mentions + assignee + managers (excludes author), revalidates `tags.task` and `tags.project`.
- **listByTaskAction(payload)**: requires project membership; returns paged comments and populates author display fields (name, avatar) before serializing.
- **remove(payload)**: author or project manager can delete; side-effect reduces `Task.commentsCount`, logs `comment.removed`, notifies managers, revalidates tags, returns `{ _removed: true }` marker along with removed data.

Implementation notes / important behaviors:
- Mentions are parsed server-side to ensure notifications are correct and cannot be spoofed by clients.
- Deleting comments performs checks for author/manager and then does a hard delete via repo; UI expects `_removed` marker to handle local updates.
- Revalidation and notifications are best-effort; errors in notifications are logged but do not block the main DB change.

---

<!-- EOF -->

---

## 16. Task: subtask approval & project-scope task flows

Task index exports (aggregator):
- **File:** `data/task/actions/index.js` — re-exports task-related actions from `server.js`, `subtasks.server.js`, `approval.server.js`, `collaborators.server.js`, `subtask-approval.server.js`, and `project.server.js`. Use this file when you need to import many task APIs from a single entry.

Subtask approval & distribution (`data/task/actions/subtask-approval.server.js`):
- **approveSubtaskCompletion(subtaskId, { approve, finalPoints, note })**
   - Quyền: `canApproveSubtask(subtask, parentTask, user)` — typically parent task assignee or project manager.
   - Hành động: nếu approve → validate `finalPoints` (>=0, <= parent.initialPoints), set subtask status to COMPLETED, set `finalPoints`, `completedAt`, `scoredBy/scoredAt`, update parent progress via `updateParentProgress`, update workflow node status if linked, log activity and `notifyEvent` to assignee/creator, revalidate task & project tags.
   - Nếu từ chối → set subtask back to IN_PROGRESS and notify.

- **distributePointsToSubtasks(parentTaskId, distribution)**
   - Quyền: parent task assignee, project manager, or admin.
   - Hành động: validate distribution array, total assigned <= parent.initialPoints, validate subtasks belong to parent, write `subtaskPointsDistribution` on parent, update each subtask.initialPoints, log activity, revalidate.

- **getTaskProgress(parentTaskId)**
   - Quyền: authenticated; returns parent task `progress` object (total, completed, inProgress, percentage).

Project-scoped task flows (`data/task/actions/project.server.js`, re-exported by index):
- Exposes actions for public/project board flows: createDraft, publish, unpublish, claim, decide, approveCompletionWithSplitAction, listOpen.
- Behaviors: these actions manage public-facing tasks, support claim/decide flows (claiming work), and may interact with approval workflows and point-splitting for collaborative tasks. Permission rules vary per action (publish/unpublish by project managers/owners; claim by authenticated users on open tasks; decide by project managers).

Project listing & analytics (related):
- **listMyProjects({ search, teamId })** (`data/project/actions/list.js`)
   - Returns projects the user is member of (or all for admin); supports search and team filter, limits results, populates `team` minimally.
- **getProjectDetail(projectId)** (`data/project/actions/list.js`) — wrapper that uses repo `getDetail` and enforces membership or admin.
- **getAnalytics(projectId) / getMemberStats(projectId) / getActivities({projectId, limit, skip})** (`data/project/actions/analytics.js`)
   - Require project membership; delegate heavy-lifting to `data/project/processors/analytics.js` and `ActivityLog` model; return serialized analytics, per-member stats, and paged activity logs respectively.

Implementation notes / important behaviors:
- The `index.js` task export file is a convenient import surface; deeper logic lives in each specific file where permissions and side-effects are enforced.
- Approval and distribution flows are careful about point consistency (no subtask may receive more points than parent) — actions validate and persist these invariants.
- Project-scope public task flows are separate from internal project tasks; check `project.server.js` for exact rules if you need to modify claim/publish behavior.

---

<!-- EOF -->

---

## 17. Workflow, Leaderboard, Report, Team analytics

Workflow (`data/workflow/actions/server.js`):
- **Purpose:** CRUD cho workflow, attach task vào node, activate/deactivate, và mapping workflow ↔ task.
- **Quyền:** create/update/attach/activate/deactivate → `canManageProject` trên project; getByProject → project member (`canViewProject`).
- **Hành vi chính:**
   - `create(payload)`, `update(payload)`: validate bằng schema, gọi repo, log activity, revalidate `tags.project` + workflow tag.
   - `attachTask({ workflowId, nodeKey, taskId })`: gán task vào node; quyền quản lý project.
   - `createTaskWorkflow(parentTaskId, { name, nodes, edges })`: tạo hoặc cập nhật workflow cho riêng một task; quyền: Project Manager hoặc creator của task.
   - `getTaskWorkflow(taskId)`, `getByProjectAction(payload)`: đọc workflow; revalidate nhẹ.
   - `updateNodeStatus(workflowId, nodeKey, status)`: cho phép assignee hoặc admin update node status nếu workflow gắn với task.

Leaderboard (`data/leaderboard/actions/server.js`):
- **Purpose:** Truy xuất leaderboard theo team hoặc project cho một tháng (ym = YYYY-MM).
- **Quyền:** team leaderboard → `isTeamMember`; project leaderboard → `canViewProject`.
- **Hành vi:** gọi aggregation processors (`teamLeaderboardAgg`, `projectLeaderboardAgg`) và revalidate tags `tags.leaderboard(...)` (và `tags.project` cho project leaderboard). Trả dữ liệu đã serialize.

Report (`data/report/actions/server.js`):
- **Purpose:** Báo cáo tháng cho user/project và tổng hợp user data.
- **Quyền:** `userMonthly` → self hoặc admin; `projectSummary` → project member; `getUserReportData` → self hoặc admin.
- **Hành vi:** dùng aggregations (`userMonthlyAgg`, `projectSummaryAgg`) để thu thập dữ liệu; trả kết quả đã serialize và revalidate các tags leaderboard/project khi cần.

Team analytics & activities (`data/team/actions/analytics.js`, `data/team/actions/activities.js`):
- **Purpose:** trả analytics tổng quan cho team và history activity của team.
- **Quyền:** yêu cầu `isTeamMember` (member của team).
- **Hành vi:** delegate tới processors (e.g., `getTeamAnalytics`) để tránh N+1; `getActivities` lấy `ActivityLog` theo `teamId` với pagination, trả dữ liệu serialized.

Implementation notes / important behaviors:
- Các module analytics/leaderboard/report thường dùng aggregation processors dưới `data/*/processors/*` — chỉnh sửa logic tính toán nên thực hiện ở processor để tận dụng caching và tránh lặp code.
- Revalidation: sau các thay đổi liên quan project/team/workflow cần gọi `revalidateMany` với các tags tương ứng để giữ cache/ISR nhất quán.
- Quyền truy cập luôn được kiểm tra server-side; không tin vào client.

---

<!-- EOF -->

---

## 18. Public tasks (Board công khai) & Claim flows

- **File:** `data/task/actions/project.server.js` (public server)
- **Purpose:** Quản lý public board: tạo draft, publish/unpublish, claim/decide, approve completion with split, list open tasks.

Key rules & behaviors:
- **createDraft(payload)**: authenticated users có thể tạo draft public; draft chưa publish và có `postedBy`.
- **publish(payload)**: có hai luồng:
   - Nếu task scope = `project`: chỉ project manager mới được publish từ project (`publishFromProjectTask`).
   - Nếu task scope = `public` (draft): chỉ owner/postedBy mới publish (`publishPublicTask`).
- **unpublish(payload)**: tương tự publish — nếu task có origin project thì require project manager; nếu draft public thì require owner.
- **claim(payload) / decide(payload)**: hỗ trợ `AUTO` (tự động accept → assign) và `REVIEW` (tạo claim pending); `decide` do manager hoặc owner quyết định; mọi bước log activity, notify và revalidate `tags.publicTasks()` + `tags.task`.
- **approveCompletionWithSplitAction(payload)**: cho phép approver (project manager hoặc owner tùy origin) phân bổ `totalPoints` giữa workers và xử lý payouts; gửi noti tới recipients và revalidate.
- **listOpen(payload)**: trả public tasks open (paging/filters). Requires auth (current implementation uses `requireAuth: true`).

Implementation notes:
- Public tasks reuse `data/task/processors/repo.js` để tách logic DB (create/publish/claim/decide). Các thay đổi trạng thái sẽ revalidate `tags.publicTasks()` để cập nhật cache cho board.
- Quyền publish/decide/approve phụ thuộc vào origin project nếu có; tác giả của draft có quyền trên draft không gắn project.

---

## 19. Notifications (listing & marking)

- **File:** `data/noti/actions/list.js`
- **Purpose:** API cho client lấy noti của user và đánh dấu đã đọc.

Key actions:
- **getMyNotifications({ limit, unreadOnly })**: trả các notification cho user hiện tại, serialized, cùng `unreadCount` tổng.
- **markNotificationAsRead(notificationId)**: mark single notification read (only if belongs to current user).
- **markAllNotificationsAsRead()**: mark all unread as read for current user.

Implementation notes:
- Notifications được lưu trong `Notification` model; các thao tác này chỉ thao tác trên noti của user hiện hành để tránh cross-user tampering.
- Kết quả được serialize (ObjectId → string, Date → ISO string) để client dễ render.

---

## 20. Team member stats & cached helpers

- **Files:** `data/team/actions/member-stats.js`, `data/team/actions/cached.js`
- **Purpose:** cung cấp tổng hợp số liệu cho từng member trong team và helper cached để tránh N+1 / duplicate requests.

Key behaviors:
- **getMembersStats(payload)**: yêu cầu `isTeamMember`, trả stats cho mỗi member bằng `getBatchMemberStats` processor (supports optional `ym` for month).
- **getCachedTeamById(teamId)**: cached wrapper dùng `React.cache` để dedupe requests trong cùng render tree (useful for layouts/pages).

Implementation notes:
- Nên đặt logic tính toán vào `data/team/processors/*` để tận dụng cache và dễ test; actions chỉ làm nhiệm vụ access control + orchestration + serialization.

---

<!-- EOF -->
