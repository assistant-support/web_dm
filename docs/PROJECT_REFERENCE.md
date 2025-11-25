````markdown
# Project reference — Mô tả model, processors và server actions

Tài liệu này tổng hợp mọi hành vi liên quan tới `Project` trong kho: model (`model/project.model.js`), enum liên quan, repository/processors (`data/project/processors/repo.js`), validators (`data/project/processors/validators.js`) và tất cả server actions dưới `data/project/actions/*.js`.

Mục đích: cung cấp tài liệu tham chiếu cho developer để hiểu các invariants, quyền, side-effects (Drive, noti), và ví dụ gọi action.

---

## 1. Vị trí file chính

- Model: `model/project.model.js`
- Enums: `model/common/enums.js` (khai báo `PROJECT_ROLE`, `PRIORITY`)
- Repo / processors: `data/project/processors/repo.js`
- Validators: `data/project/processors/validators.js`
- Actions (server):
  - `data/project/actions/server.js` (main CRUD + members)
  - `data/project/actions/list.js` (list, get detail wrappers)
  - `data/project/actions/analytics.js` (project analytics)

---

## 2. Enum liên quan

- `PROJECT_ROLE`:
  - `owner` — OWNER
  - `manager` — MANAGER
  - `member` — MEMBER

- `PRIORITY`: định nghĩa mức ưu tiên (LOW, MEDIUM, HIGH, v.v.)

Sử dụng `PROJECT_ROLE` làm nguồn xác thực cho role trong toàn hệ thống.

---

## 3. Project model (chi tiết)

File: `model/project.model.js`

- Fields chính:
  - `name` (String, required)
  - `description` (String)
  - `team` (ObjectId ref `Team`, optional) — project có thể độc lập hoặc thuộc team
  - `members` (Array of ProjectMembership): `{ userId: externalUserId, role }`
  - `statuses` (Array of String) — custom workflow states
  - `tags` (Array)
  - `startDate`, `dueDate`, `priority`
  - `isActive` (Boolean) — soft flag
  - `monthlyDriveFolders` — array `{ year, month, folderId, folderName }` (12 folders for a year)
  - `driveFolderId`, `driveFolderName`, `rootDriveFolderId`, `rootDriveFolderName`
  - `platforms`, `workTypes`, `assetsCount`, `custom` (Map)

- Indexes:
  - `{ team: 1, isActive: 1 }`
  - `{ 'monthlyDriveFolders.year': 1, 'monthlyDriveFolders.month': 1 }`
  - `{ 'members.userId': 1, isActive: 1 }`
  - `{ isActive: 1, dueDate: 1 }`, `{ priority: 1, isActive: 1 }`

- Virtuals:
  - `memberCount`, `isOverdue`, `daysRemaining`, `hasDriveFolders`

- Instance methods:
  - `isMember(userId)` → boolean
  - `canManage(userId)` → boolean (owner or manager)
  - `getMemberRole(userId)` → role | null
  - `getDriveFolderForMonth(year, month)` → folderId|null
  - `setDriveFolderForMonth(year, month, folderId, folderName)` → updates monthlyDriveFolders
  - `addMember(userId, role)` — throws if already member
  - `removeMember(userId)`, `changeMemberRole` handled in repo (preferred)

Notes:
 - Model enforces no duplicate subdocs via repo/save patterns. Pre-save hooks enforce at least one owner/manager invariant via repo checks.

---

## 4. Repo / Processors (DB logic) — `data/project/processors/repo.js`

Các hàm chính và mô tả:

 - `listByTeam(teamId, { activeOnly = true })`
   - Trả danh sách project thuộc team (populate team).

 - `_getDetail(projectId, { lean = true })` & `getDetail` (cached)
   - Lấy detail project, populate team, được bọc bằng `cache` để tái sử dụng.

 - `createProject(payload, creatorUserId)`
   - Tạo project record và tạo Drive folder cho project (`createProjectFolder`) và 12 thư mục tháng (`createProjectMonthlyFolders`) — lưu metadata `monthlyDriveFolders` và drive folder ids.
   - Khởi tạo `members` với creator là `OWNER`.
   - Trả về document đã populate (dùng `getDetail`).

 - `updateProject(projectId, patch)`
   - Cập nhật các trường cơ bản (name, description, priority, dates, tags, statuses, platforms, workTypes).
   - Trả về document đã populate.

 - `archiveProject(projectId)`
   - Soft-delete (set `isActive = false`) và trả về document đã populate.

 - `addMember(projectId, { userId, role })`
   - Idempotent: nếu thành viên có sẵn thì cập nhật role; nếu chưa có thì push vào mảng.

 - `removeMember(projectId, userId)`
   - Không cho remove nếu điều đó làm mất quản trị cuối cùng; ném `LAST_MANAGER` AppError.

 - `changeMemberRole(projectId, userId, role)`
   - Không cho đổi role làm mất quản trị cuối cùng; ném `LAST_MANAGER` nếu vi phạm.

Important:
 - Repo giữ business invariants (LAST_MANAGER) để tránh mất quyền quản trị.
 - Drive operations diễn ra trong `createProject` và có thể throw/log — Drive errors là side-effect quan trọng.

---

## 5. Validators — `data/project/processors/validators.js`

 - `projectIdSchema`, `teamIdSchema` — simple string checks.
 - `projectCreateSchema` — fields: `team?`, `name`(2..160), `description`, `priority`, `startDate`, `dueDate`, `platforms`, `workTypes`, `tags`.
 - `projectUpdateSchema` — optional fields for patch.
 - `memberAddSchema` — `userId` transform async: accepts Mongo `_id` (24 hex) and resolves to `externalUserId` via `AppUser.findById(_id)` when a mongo id is provided; `role` uses `PROJECT_ROLE`.
 - `memberRemoveSchema`, `memberChangeRoleSchema`.
 - Helpers: `validate(schema, payload)` and `validateAsync(schema, payload)` which throw `AppError('VALIDATION', ...)` on failure.

Notes:
 - `memberAddSchema` async transform is convenient for UI/backoffice where user may pass either `_id` or `externalUserId`.

---

## 6. Server actions (tất cả) — `data/project/actions/*`

Tập trung các hành vi từ action files found in `data/project/actions/`.

1) `data/project/actions/server.js` (main)

 - `listByTeamAction(teamId)`
   - Quyền: caller phải là member của team hoặc admin.
   - Hành động: kiểm tra team tồn tại, assert member|admin, gọi `listByTeam` repo và trả `asPlainProject`.

 - `getDetailAction(projectId)`
   - Quyền: member của project hoặc admin.

 - `create(payload)`
  - Quyền: **Nếu `team` được cung cấp** → người gọi phải là quản lý/owner của team (team manager/creator). **Nếu không có `team`** (project độc lập) → chỉ Global Admin (`user.role === 'admin'`) mới được tạo.
  - Hành động: validate payload, nếu `team` được cung cấp thì ensure team exists và kiểm tra quyền team manager, gọi `createProject`, log activity `project.created`, revalidate tags (team/project).

 - `update(projectId, patch)`
   - Quyền: `canManageProject(raw, user)` (repo + `lib/permissions.js`).

 - `archive(projectId)`
   - Quyền: `canManageProject`.

 - `addMemberAction(projectId, payload)`
   - Quyền: `canManageProject`.
   - Hành động: repo `addMember` (idempotent). Nếu user không thuộc team (outsider) thì code logs a warning but allows adding (deliberate behavior to allow cross-team collaboration). Sends `notifyProjectMemberAdded` (best-effort) and revalidates `tags.team`, `tags.project`, `tags.userInbox`.

 - `removeMemberAction(projectId, payload)`
   - Quyền: `canManageProject`.
   - Hành động: `removeMember` repo (protects LAST_MANAGER), log activity, send `notifyProjectMemberRemoved`.

 - `changeRole(projectId, payload)`
   - Quyền: `canManageProject`.
   - Hành động: `changeMemberRole` repo (protects LAST_MANAGER), log, notify managers.

 - `deleteProjectAction(projectId)`
   - Quyền: project owner OR global admin.
   - Hành động: call `archiveProject` (soft delete), log `project.deleted`, revalidate tags.

2) `data/project/actions/list.js`

 - `listMyProjects({ search, teamId })`
   - Quyền: requireAuth. Admin sees all; non-admin sees only projects where `members.userId === user.externalUserId`.
   - Returns list and count (limited to 100 by default).

 - `getProjectDetail(projectId)`
   - Wrapper over cached repo `getDetail`, enforce `isMember || isAdmin`.

3) `data/project/actions/analytics.js` (if present)
   - Provides analytics/metrics for project. Enforce membership or admin, delegate to processors.

---

## 6.1. Mã nguồn — tham chiếu hàm (file + dòng)

Dưới đây là tham chiếu trực tiếp tới các hàm chính trong mã nguồn để bạn có thể mở nhanh file và dòng tương ứng.

- Repo / processors: `data/project/processors/repo.js`
  - `getDetail` (cached wrapper): ~line 37
  - `createProject(payload, creatorUserId)`: ~line 43
  - `updateProject(projectId, patch)`: ~line 89
  - `archiveProject(projectId)`: ~line 113
  - `addMember(projectId, { userId, role })`: ~line 125
  - `removeMember(projectId, userId)`: ~line 148
  - `changeMemberRole(projectId, userId, role)`: ~line 173

- Actions: `data/project/actions/server.js`
  - `listByTeamAction(teamId)`: ~line 38
  - `getDetailAction(projectId)`: ~line 59
  - `create(payload)`: ~line 77
  - `update(projectId, patch)`: ~line 104
  - `archive(projectId)`: ~line 130
  - `addMemberAction(projectId, payload)`: ~line 145
  - `removeMemberAction(projectId, payload)`: ~line 195
  - `changeRole(projectId, payload)`: ~line 230
  - `updateProjectAction(projectId, updates)`: ~line 266
  - `deleteProjectAction(projectId)`: ~line 271

- Validators: `data/project/processors/validators.js`
  - `projectCreateSchema`: ~line 15
  - `projectUpdateSchema`: ~line 27
  - `memberAddSchema` (async transform for `_id` → `externalUserId`): ~line 44
  - `validate(schema, payload)`: ~line 81
  - `validateAsync(schema, payload)`: ~line 106

Ghi chú: các vị trí dòng có dấu `~` là gần đúng theo bản hiện tại của kho; nếu bạn cần con trỏ chính xác, mở file trong editor IDE/VSCode và tìm tên hàm để nhảy đến dòng.


## 7. Activity log types liên quan Project

 - `project.created`
 - `project.updated`
 - `project.archived`
 - `project.member.added` / `.added.outsider`
 - `project.member.removed`
 - `project.member.role_changed`
 - `project.deleted`

Payload thường bao gồm `project` (id), `team` (id), `actor` (externalUserId), và chi tiết action.

---

## 8. Invariants & chú ý

 - **LAST_MANAGER**: không được để project không có OWNER/MANAGER — enforced in repo `removeMember` / `changeMemberRole` (throws `AppError('LAST_MANAGER')`).
 - **Idempotency**: `addMember` is idempotent (update role if exists).
 - **Outsider members**: repo allows adding users not present in the parent team; actions log a warning and notifications are best-effort.
 - **Drive integration**: `createProject` creates project root folder and monthly folders — Drive failures are side-effects and may require operator attention.

---

## 9. Examples / snippets

1) Create project (server action) — now admin-only:

```js
await createProjectAction({ name: 'New Project', team: 'TEAM_ID', priority: 'MEDIUM' });
```

2) Add project member (client calls server action):

```js
await addMemberAction(projectId, { userId: 'u_12345', role: 'manager' });
```

Server flow: `validateAsync(memberAddSchema)` → `getDetail(projectId)` → assert `canManageProject` → repo `addMember` → `logActivity` → `notifyProjectMemberAdded` → `revalidateMany`.

3) Archive project:

```js
await archive(projectId);
```

Server flow: assert `canManageProject` → `archiveProject` (repo) → log → revalidate.

---

## 10. Recommendations / next steps

 - Add unit tests for repo invariants (`removeMember` / `changeMemberRole` LAST_MANAGER cases).
 - Consider moving dangerous side-effects (Drive folder creation) to a background job or add compensating operations if Drive creation fails after DB insert.
 - Consider adding a failable/transactional wrapper for Drive + DB for higher consistency.
 - Add more coverage for `addMember` outsider flows in integration tests.

---

File này được sinh tự động bởi trợ lý; bạn muốn tôi commit file này lên branch `main` không? Gõ `viết` nếu đồng ý, tôi sẽ tạo commit `docs: add PROJECT_REFERENCE.md` và push.

<!-- EOF -->
````
