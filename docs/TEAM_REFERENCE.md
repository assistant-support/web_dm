# Team reference — Mô tả model, processors và server actions

Tài liệu này mô tả chi tiết mọi thứ liên quan tới `Team` trong dự án: model (`model/team.model.js`), enum liên quan, repository/processors (`data/team/processors/repo.js`), validators (`data/team/processors/validators.js`) và tất cả server actions dưới `data/team/actions/*.js`.

Mục đích: giúp bạn nhanh hiểu mọi API/hàm liên quan tới Team, invariants (vòng sống team, role), quyền (permission), side-effects (Drive, noti, revalidate) và ví dụ gọi action.

---

## 1. Vị trí file chính

- Model: `model/team.model.js`
- Enums: `model/common/enums.js` (khai báo `TEAM_ROLE`)
- Repo / processors: `data/team/processors/repo.js`
- Validators: `data/team/processors/validators.js`
- Actions (server):
  - `data/team/actions/server.js`
  - `data/team/actions/management.js`
  - `data/team/actions/cached.js`
  - `data/team/actions/analytics.js`
  - `data/team/actions/activities.js`
  - `data/team/actions/member-stats.js`

---

## 2. Enum liên quan

- `TEAM_ROLE` (từ `model/common/enums.js`):
  - `owner` — OWNER
  - `manager` — MANAGER
  - `member` — MEMBER

Sử dụng `TEAM_ROLE` làm nguồn xác thực cho role trong toàn hệ thống.

---

## 3. Team model (chi tiết)

File: `model/team.model.js`

- Fields chính:
  - `name` (String) — required, trim, indexed
  - `description` (String) — optional
  - `members` (Array of TeamMembership)
    - TeamMembership:
      - `userId` (String) — externalUserId từ Auth provider
      - `role` (String) — enum `TEAM_ROLE` (default `member`)
      - timestamps per-subdoc
  - `isActive` (Boolean) — soft flag (default `true`)
  - `driveFolderId`, `driveFolderName`, `driveParentId` — metadata Google Drive
  - `createdAt`, `updatedAt` — timestamps

- Indexes:
  - `{ isActive: 1, createdAt: -1 }`
  - `{ 'members.userId': 1, isActive: 1 }`
  - `{ 'members.userId': 1, 'members.role': 1 }`

- Virtuals:
  - `memberCount` — số lượng members
  - `hasDriveFolder` — boolean nếu có `driveFolderId`

- Instance methods (một số hàm quan trọng):
  - `isMember(userId)` → boolean
  - `isManager(userId)` → boolean (manager || owner)
  - `getMemberRole(userId)` → role | null
  - `addMember(userId, role = TEAM_ROLE.MEMBER)` → async, thêm member (throws nếu đã có)
  - `removeMember(userId)` → async, xóa member (throws nếu không phải member)
  - `updateMemberRole(userId, newRole)` → async, update role (throws nếu invalid)

- Static methods:
  - `findByMember(userId, activeOnly = true)`
  - `findByManager(userId, activeOnly = true)`
  - `createWithOwner(teamData, ownerId)`

- Middlewares / invariants (pre-save hooks):
  - Luôn có ít nhất 1 manager/owner nếu có members (ngăn xóa manager cuối cùng)
  - Không cho duplicate members (unique userId)

---

## 4. Repo / Processors (DB logic) — `data/team/processors/repo.js`

Các hàm chính (đã tồn tại trong file):

- `getById(teamId, { lean = true })` — cached via `React.cache`.
- `listByUser(userId, { activeOnly = true })` — cached.
- `createTeam({ name, description }, creatorUserId)`
  - Tạo Google Drive folder (gọi `createTeamFolder`) rồi tạo Team doc với `creatorUserId` là OWNER.
- `updateTeam(teamId, patch)` — update name/description.
- `archiveTeam(teamId)` — set `isActive=false`.
- `addMember(teamId, { userId, role })` — idempotent: nếu user tồn tại thì cập nhật role; nếu không thì thêm.
- `removeMember(teamId, userId)` — không cho remove nếu là LAST_MANAGER (throw `'LAST_MANAGER'`).
- `changeMemberRole(teamId, userId, role)` — enforce LAST_MANAGER invariant.

Lưu ý:
- Repo layer giữ business invariants như LAST_MANAGER và idempotency.
- `getById` / `listByUser` dùng cache để dedupe; khi cập nhật cần chú ý cache invalidation nếu cần.

---

## 5. Validators — `data/team/processors/validators.js`

- `teamIdSchema` — required string
- `teamCreateSchema` — name (trim, 2..120), description optional
- `teamUpdateSchema` — optional name, description, isActive
- `memberAddSchema`:
  - `userId`: transform async: nếu chuỗi có dạng Mongo ObjectId (24 hex) thì lookup `User.findById(_id)` để convert sang `externalUserId` — hỗ trợ client truyền `_id` hoặc `externalUserId`.
  - `role`: enum [MANAGER, MEMBER], default MEMBER
- `memberRemoveSchema`, `memberChangeRoleSchema`
- Helpers: `validate(schema, payload)` và `validateAsync(schema, payload)` — ném `AppError('VALIDATION', 'VALIDATION', 400, issues)` nếu không hợp lệ.

Lưu ý: transform async trong `memberAddSchema` rất tiện để chấp nhận `_id` của User hoặc externalId.

---

## 6. Server actions (tất cả) — danh sách hàm, quyền, side-effects

Tập trung ở `data/team/actions/*.js`. Dưới đây là danh sách hàm cùng mô tả ngắn, permission, side-effects (log, noti, revalidate).

1) `data/team/actions/server.js` (main)

- `listMy()`
  - Mô tả: trả teams mà user tham gia; nếu `user.role === 'admin'` trả tất cả teams active.
  - Quyền: `requireAuth`.

- `listManagedTeams()`
  - Mô tả: trả teams mà user là manager.

- `getByIdAction(teamId)`
  - Quyền: user phải là member hoặc admin.
  - Trả `asPlainTeam`.

- `create(payload)`
  - Quyền: **chỉ admin** (`user.role === 'admin`).
  - Hành động: validate -> `createTeam` (repo) -> `logActivity('team.created')` -> `revalidateMany([tags.team(teamId)])`.

- `update(teamId, patch)`
  - Quyền: `isTeamManager(team, user.externalUserId)`.
  - Hành động: `updateTeam` -> `logActivity('team.updated')` -> revalidate.

- `archive(teamId)`
  - Quyền: `isTeamManager`.
  - Hành động: `archiveTeam`, archive projects liên quan (`listProjectsByTeam` -> `archiveProject`), log, revalidate team + projects.

- `addMemberAction(teamId, payload)`
  - Quyền: `isTeamManager`.
  - Hành động: validateAsync(memberAddSchema) -> `addMember(repo)` -> `logActivity('team.member.added')` -> `notifyTeamMemberAdded(...)` (best-effort) -> revalidate `tags.team`.

- `removeMemberAction(teamId, payload)`
  - Quyền: `isTeamManager`.
  - Hành động: `removeMember(repo)` -> log `team.member.removed` -> `notifyTeamMemberRemoved(...)` -> revalidate `tags.team`, `tags.userInbox(userId)`.

- `changeRole(teamId, payload)`
  - Quyền: `isTeamManager`.
  - Hành động: `changeMemberRole(repo)` -> log `team.member.role_changed` -> notify managers -> revalidate.

2) `data/team/actions/management.js` (admin-like tasks)

- `toggleArchive(payload)`
  - Quyền: `isTeamManager`.
  - Hành động: toggle `team.isActive`, save, revalidate `tags.team`.

- `deleteTeam(payload)`
  - Quyền: `isTeamManager`.
  - Hành động: require `confirmText` matches team.name (case-insensitive), kiểm tra dependencies: `Project.countDocuments({ team }) === 0` và `Task.countDocuments({ team, project: null }) === 0`; nếu OK -> `Team.findByIdAndDelete(teamId)` -> revalidate.

- `transferOwnership(payload)`
  - Quyền: `isTeamManager`.
  - Hành động: set current manager -> member, set `newManagerUserId` -> manager, save, revalidate.

3) `data/team/actions/cached.js`

- `getCachedTeamById(teamId)` — wrapper cached (React.cache) gọi `getByIdAction`.

4) `data/team/actions/analytics.js`

- `getAnalytics(payload)` — requires `isTeamMember`, delegates to `getTeamAnalytics(teamId)` processor.

5) `data/team/actions/activities.js`

- `getActivities(payload)` — requires `isTeamMember`, page activity log from `ActivityLog` model for the team.

6) `data/team/actions/member-stats.js`

- `getMembersStats(payload)` — requires `isTeamMember`; calls `getBatchMemberStats(teamId, userIds, ym)` processor.

---

## 7. Activity log types liên quan Team

- `team.created`
- `team.updated`
- `team.archived`
- `team.member.added`
- `team.member.added.outsider` (nếu add user không thuộc team)
- `team.member.removed`
- `team.member.role_changed`

Activity payload thường bao gồm `team` (id), `actor` (externalUserId), và `payload` chi tiết (ví dụ `userId`, `role`).

---

## 8. Invariants & chú ý khi thay đổi

- **Không được để team không có manager/owner** — enforced ở pre-save hook và ở repo (remove/change role) bằng lỗi `LAST_MANAGER`.
- **Không duplicate members** — pre-save hook chặn duplicate `members.userId`.
- **addMember is idempotent** — nếu user có sẵn, cập nhật role thay vì duplicate.
- **memberAddSchema** hỗ trợ cả `_id` (ObjectId) và `externalUserId` (transform async) — tiện cho UI/backoffice.
- **Drive integration**: `createTeam` tạo folder Drive; kiểm tra kỹ nếu Drive lỗi để tránh inconsistent state (folder tạo nhưng record fail, hoặc ngược lại).

---

## 9. Ví dụ gọi action / snippets

1) Thêm member (client gọi server action):

```js
// payload có thể truyền externalUserId hoặc Mongo _id của user
await addMemberAction(teamId, { userId: 'u_12345', role: 'manager' });
```

Server flow: `validateAsync(memberAddSchema)` → `getById(teamId)` → assert `isTeamManager` → `addMember(repo)` → `logActivity` → `notifyTeamMemberAdded` → `revalidateMany([tags.team(teamId)])`.

2) Xóa team (cẩn trọng):

```js
await deleteTeam({ teamId, confirmText: 'Team Name Exact' });
```

Server checks: confirmText => match team.name (case-insensitive) → ensure no projects/tasks depend → `findByIdAndDelete`.

---

## 10. Đề xuất / next steps

- Viết unit tests cho invariants: `removeMember` / `changeMemberRole` (LAST_MANAGER), `memberAddSchema` transform logic.
- Chuẩn hoá lỗi repo → `AppError` thay vì ném Error strings để action dễ map sang HTTP codes.
- Cân nhắc queue/retry cho notifications nếu muốn đảm bảo deliverability (hiện là best-effort).
- Bổ sung script CI để chạy build + lint trước khi merge.

---

File này được sinh tự động bởi trợ lý; bạn muốn tôi commit file này lên branch `main` không? Gõ `viết` nếu đồng ý, tôi sẽ tạo commit `docs: add TEAM_REFERENCE.md` và push.

<!-- EOF -->