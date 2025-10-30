# Tài liệu Model: Team

Tài liệu này mô tả cấu trúc Mongoose Schema cho `Team`, định nghĩa cách dữ liệu team và thành viên được lưu trữ trong MongoDB.

**File Path:** `@/model/team.model.js`

---

## 1. Tổng quan

Model `Team` đại diện cho một nhóm làm việc (workspace). Nó chứa thông tin cơ bản của team (như tên, mô tả) và quan trọng nhất là một mảng lồng (`embedded array`) chứa danh sách các thành viên và vai trò của họ.

Model này cũng tích hợp thông tin về thư mục Google Drive được liên kết với team.

---

## 2. Schemas

### `TeamMembershipSchema` (Schema lồng)

Đây là schema định nghĩa một thành viên trong team. Nó **không** phải là một model riêng lẻ mà được lồng bên trong `TeamSchema`.

| Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `userId` | `String` | **Có** | ID của người dùng (tham chiếu đến `externalUserId`). |
| `role` | `String` | **Có** | Vai trò của người dùng. Phải là một giá trị từ `TEAM_ROLE`. |
| `createdAt` | `Date` | Tự động | Thời điểm thành viên này được thêm vào team. |
| `updatedAt` | `Date` | Tự động | Thời điểm vai trò/thông tin thành viên cập nhật. |

### `TeamSchema` (Model chính)

Đây là model `Team` chính, được export để sử dụng trong toàn bộ ứng dụng.

| Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `name` | `String` | **Có** | Tên của team (được `trim` và `index`). |
| `description` | `String` | Không | Mô tả ngắn về mục đích của team. |
| `members` | `[TeamMembershipSchema]` | **Có** | Mảng chứa danh sách các thành viên của team. Mặc định là `[]`. |
| `isActive` | `Boolean` | **Có** | Trạng thái của team (team bị lưu trữ sẽ có `isActive: false`). Mặc định là `true`. |
| `driveFolderId` | `String` | Không | ID của thư mục Google Drive được tạo cho team này (được `index`). |
| `driveFolderName` | `String` | Không | Tên của thư mục Google Drive (lưu lại để tiện truy vấn). |
| `driveParentId` | `String` | Không | ID của thư mục cha hoặc Shared Drive chứa thư mục của team. |
| `createdAt` | `Date` | Tự động | Thời điểm team được tạo. |
| `updatedAt` | `Date` | Tự động | Thời điểm thông tin team được cập nhật lần cuối. |

---

## 3. Enums: `TEAM_ROLE`

Enum này (`@/model/common/enums.js`) định nghĩa các vai trò hợp lệ trong một team.

* **`manager`**: Quản lý. Có quyền quản lý team (sửa tên, thêm/xóa thành viên, xóa team).
* **`member`**: Thành viên. Chỉ có quyền xem và tham gia vào các project trong team.

---

## 4. Indexes (Tối ưu hiệu suất)

Schema này định nghĩa các index sau để tăng tốc độ truy vấn:

1.  **`name: 1`**: Tăng tốc độ tìm kiếm team theo tên.
2.  **`'members.userId': 1`**: **(Quan trọng)** Tăng tốc độ tìm kiếm tất cả các team mà một `userId` cụ thể tham gia. Đây là index chính cho các hàm `listMy()`.
3.  **`driveFolderId: 1`**: Tăng tốc độ tìm team bằng ID thư mục Drive.