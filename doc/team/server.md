# Tài liệu Server Logic: Team

Tài liệu này mô tả kiến trúc và các chức năng phía server (Server Actions, Processors) để quản lý và truy vấn dữ liệu `Team`.

---

## 1. Kiến trúc chung (Separation of Concerns)

Logic của module `Team` được chia làm 3 lớp rõ rệt:

1.  **Actions (`@/data/team/actions/`)**:
    * Đây là "API Layer", bao gồm các Server Actions (`'use server'`) được gọi từ Client.
    * **Nhiệm vụ:** Xác thực (auth), Phân quyền (authorization), Validate input (dùng Zod), gọi lớp Processors, và Revalidate Cache (Next.js).

2.  **Processors (`@/data/team/processors/`)**:
    * Đây là "Business Logic Layer".
    * **`repo.js`**: Repository Pattern. Chứa logic CSDL thuần túy (CRUD, thêm/xóa member) và các ràng buộc (vd: không cho xóa manager cuối cùng).
    * **`*.js` (khác)**: Chứa các logic nghiệp vụ phức tạp, đặc biệt là các pipeline Aggregation nặng (ví dụ: `team-analytics.js`, `member-stats.js`).

3.  **Model (`@/model/team.model.js`)**:
    * Lớp định nghĩa Schema (xem file `team.model.md`).

---

## 2. Danh sách Server Actions (Client-Facing)

Đây là các hàm mà Client Components có thể gọi.

### `actions/server.js` (CRUD và Quản lý Member)

File này chứa các chức năng CRUD và quản lý thành viên cơ bản.

* `listMy()`
    * **Mô tả:** Lấy danh sách các team mà user hiện tại là thành viên (và `isActive: true`).
    * **Quyền:** Bất kỳ user đã đăng nhập.
* `listManagedTeams()`
    * **Mô tả:** Lấy danh sách các team mà user hiện tại là **Manager**.
    * **Quyền:** Bất kỳ user đã đăng nhập.
* `getByIdAction(teamId)`
    * **Mô tả:** Lấy thông tin chi tiết của 1 team.
    * **Quyền:** Phải là **Member** của team đó.
* `create(payload: { name, description })`
    * **Mô tả:** Tạo một team mới. User tạo team tự động là **Manager**. Tự động tạo Google Drive Folder.
    * **Quyền:** Bất kỳ user đã đăng nhập.
* `update(teamId, patch: { name, description })`
    * **Mô tả:** Cập nhật tên hoặc mô tả của team.
    * **Quyền:** Phải là **Manager** của team.
* `archive(teamId)`
    * **Mô tả:** Lưu trữ team (set `isActive: false`).
    * **Quyền:** Phải là **Manager** của team.
* `addMemberAction(teamId, payload: { userId, role })`
    * **Mô tả:** Thêm một thành viên mới vào team (hoặc cập nhật role nếu đã tồn tại).
    * **Quyền:** Phải là **Manager** của team.
* `removeMemberAction(teamId, payload: { userId })`
    * **Mô tả:** Xóa một thành viên khỏi team.
    * **Quyền:** Phải là **Manager** của team.
* `changeRole(teamId, payload: { userId, role })`
    * **Mô tả:** Thay đổi vai trò (member/manager) của một thành viên.
    * **Quyền:** Phải là **Manager** của team.

### `actions/management.js` (Quản lý nâng cao)

File này chứa các hành động "nguy hiểm" hoặc mang tính quản trị cao.

* `toggleArchive(payload: { teamId })`
    * **Mô tả:** Bật/tắt trạng thái lưu trữ (`isActive`).
    * **Quyền:** Phải là **Manager** của team.
* `deleteTeam(payload: { teamId, confirmText })`
    * **Mô tả:** Xóa vĩnh viễn team. Yêu cầu nhập đúng tên team (`confirmText`).
    * **Ràng buộc:** Chỉ xóa được khi team không còn `Project` hoặc `Task` nào.
    * **Quyền:** Phải là **Manager** của team.
* `transferOwnership(payload: { teamId, newManagerUserId })`
    * **Mô tả:** Chuyển quyền **Manager** (owner) cho một thành viên khác. User hiện tại sẽ bị giáng xuống làm **Member**.
    * **Quyền:** Phải là **Manager** của team.

### `actions/activities.js` (Báo cáo)

* `getActivities(payload: { teamId, limit, skip })`
    * **Mô tả:** Lấy danh sách nhật ký hoạt động (`ActivityLog`) của team, có phân trang.
    * **Quyền:** Phải là **Member** của team.

### `actions/analytics.js` (Báo cáo)

* `getAnalytics(payload: { teamId })`
    * **Mô tả:** Lấy dữ liệu analytics tổng quan cho dashboard của team (số project, tổng point, trend 6 tháng...).
    * **Quyền:** Phải là **Member** của team.

### `actions/member-stats.js` (Báo cáo)

* `getMembersStats(payload: { teamId, ym? })`
    * **Mô tả:** Lấy thống kê (số project tham gia, số task, tổng điểm) cho *tất cả* thành viên trong team.
    * **Quyền:** Phải là **Member** của team.

---

## 3. Processors (Internal Logic)

Đây là các file logic nội bộ, **không** được gọi trực tiếp từ Client.

### `processors/repo.js`

* **Mô tả:** "Repository" pattern. Cung cấp các hàm CSDL thuần túy (ví dụ: `getById`, `createTeam`, `addMember`).
* **Chi tiết:**
    * Hàm `createTeam` tích hợp logic gọi `createTeamFolder` của Google Drive.
    * Các hàm `removeMember` và `changeMemberRole` chứa logic kiểm tra ràng buộc **"LAST_MANAGER"** (không cho phép team không có manager nào).

### `processors/team-analytics.js`

* **Mô tả:** Chứa hàm `getTeamAnalytics` thực hiện các truy vấn **MongoDB Aggregation Pipeline** phức tạp để tổng hợp dữ liệu cho dashboard từ nhiều collection (Project, Task).

### `processors/member-stats.js`

* **Mô tả:** Chứa hàm `getMemberStats` (tính cho 1 user) và `getBatchMemberStats` (tính cho nhiều user).
* **Chi tiết:** Sử dụng Aggregation Pipeline để tính toán điểm (`finalPoints`, `payouts`...) và số lượng task/project cho từng user.

### `processors/validators.js`

* **Mô tả:** Chứa các schema của `zod` để định nghĩa và kiểm tra (validate) dữ liệu đầu vào cho tất cả các Server Actions.