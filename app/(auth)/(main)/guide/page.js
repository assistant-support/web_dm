/*
 * Đường dẫn: @/app/(auth)/(main)/guide/page.js
 * Mô tả: Dữ liệu hướng dẫn TOÀN DIỆN - Bao gồm Task, Team (Admin-only) và Project (Admin-only).
 */

import GuideViewer from './GuideViewer.client';

/**
 * KHO DỮ LIỆU THAM CHIẾU (GLOSSARY)
 */
const SYSTEM_GLOSSARY = {
    'auto-add': {
        title: 'Cơ chế Tự động thêm thành viên (Auto-add)',
        content: `Hệ thống tự động xử lý quyền truy cập để giảm thao tác thừa:
    
    1. Khi bạn **Giao việc (Assign)** cho một người chưa có trong dự án.
    2. Server sẽ kiểm tra và **tự động thêm** người đó vào danh sách thành viên dự án.
    3. Người đó nhận được thông báo và quyền truy cập ngay lập tức.
    
    -> Không cần vào cài đặt mời thủ công trước khi giao việc.`
    },
    'safe-fields': {
        title: 'Phân quyền Chỉnh sửa (Safe Fields)',
        content: `Để đảm bảo kỷ luật, hệ thống phân quyền chặt chẽ:
    
    - **Manager:** Sửa được TẤT CẢ (bao gồm Deadline, Points, Approve).
    - **Member:** Chỉ sửa được Tiêu đề, Mô tả, Attachments, % Tiến độ.
    
    -> Deadline và Điểm là cam kết cứng, nhân viên không được tự ý sửa.`
    },
    'task-status': {
        title: 'Các trạng thái Công việc',
        content: `Ý nghĩa màu sắc và trạng thái:
        
    - ⬜ **Pending Approval:** Task do nhân viên tự tạo, chờ sếp duyệt để bắt đầu.
    - 🟦 **In Progress:** Đang thực hiện.
    - 🟨 **Waiting Confirm:** Vừa chuyển người làm, chờ người mới bấm "Nhận".
    - 🟧 **Completed:** Đã làm xong, chờ sếp nghiệm thu.
    - 🟩 **Approved (Done):** Sếp đã duyệt, điểm đã về ví.`
    },
    'best-effort': {
        title: 'Cơ chế Best-effort (Nỗ lực tốt nhất)',
        content: `Hệ thống ưu tiên dữ liệu công việc (Critical Data) lên hàng đầu:
    
    - Nếu upload Google Drive hoặc gửi Zalo bị lỗi kết nối -> Hệ thống **VẪN LƯU** Task thành công.
    - Các lỗi phụ trợ sẽ được ghi log để xử lý sau, đảm bảo bạn không bao giờ mất nội dung đã nhập.`
    },
    'final-points': {
        title: 'Quy tắc Chốt & Chia điểm (Point Split)',
        content: `Điểm số chỉ được cộng khi Task hoàn thành quy trình duyệt:
    
    1. **Initial Points:** Điểm dự kiến ban đầu.
    2. **Final Points:** Điểm thực tế Manager chốt khi duyệt (có thể thưởng/phạt).
    3. **Point Split:** Manager phân bổ Final Points cho người làm chính và các [Cộng tác viên](ref:collaborator).`
    },
    'collaborator': {
        title: 'Cộng tác viên (Collaborator)',
        content: `Người hỗ trợ thực hiện Task nhưng không phải người chịu trách nhiệm chính.
        - Phải được mời và chấp nhận lời mời.
        - Được chia điểm từ quỹ điểm của Task cha khi hoàn thành.`
    },
    'public-claim': {
        title: 'Cơ chế Claim & Decide',
        content: `Quy trình cho việc công khai (Public Board):
        1. **Publish:** Manager đăng việc lên bảng chung.
        2. **Claim:** Ứng viên bấm "Nhận việc".
        3. **Decide:** Manager chọn ứng viên phù hợp nhất để giao việc.`
    },
    'team-roles': {
        title: 'Quyền hạn trong Team',
        content: `Ai làm được gì?
        
        1. **Owner (Chủ team):** Quyền cao nhất trong Team. Có thể xóa Team hoặc chuyển chức Chủ team cho người khác.
        2. **Manager (Quản lý):** Người vận hành chính. Được thêm/bớt thành viên, tạo dự án, chỉnh sửa tên Team.
        3. **Member (Thành viên):** Chỉ được xem thông tin, xem báo cáo và làm việc trong các dự án được giao.`
    },
    'project-roles': {
        title: 'Quyền hạn trong Dự án',
        content: `Tương tự như Team, Dự án cũng có phân cấp:
        
        1. **Manager (Quản lý dự án):** Có quyền mời thành viên, sửa Deadline, Duyệt bài (Approve) và lưu trữ dự án.
        2. **Member (Thành viên):** Thực hiện Task, báo cáo tiến độ. Không được sửa các thông tin nhạy cảm (Deadline/Điểm).`
    },
    'adminsys': {
        title: 'Admin hệ thống',
        content: `Trong hệ thống sẽ có những người dùng đặc biệt - Admin hệ thống:
        
        1. **Quyền hạn:** Có mọi quyền để quan sát và quản lý toàn bộ hệ thống.
        2. **Bao gồm:** 
        - Thầy **Nguyễn Minh Sơn**
        - Cô **Phan Thị Hường**`
    },
    'archive-vs-delete': {
        title: 'Phân biệt Lưu trữ & Xóa',
        content: `Khác nhau như thế nào?
        
        - **Lưu trữ (Archive):** Chỉ là "cất đi" cho gọn. Dữ liệu vẫn còn đó, có thể khôi phục lại sau này. (Khuyên dùng).
        - **Xóa vĩnh viễn (Delete):** Mất hoàn toàn. Không thể lấy lại. Chỉ xóa được khi Team/Dự án đã dọn sạch dữ liệu.`
    },
    'project-outsider': {
        title: 'Thành viên Ngoài luồng (Outsider)',
        content: `Tính năng đặc biệt cho phép cộng tác chéo:
        
        - Bạn có thể mời một người **KHÔNG** thuộc Team vào làm việc trong Dự án cụ thể.
        - Người này chỉ thấy được Dự án đó, không thấy được các dữ liệu khác của Team.
        -> Thích hợp để mời Freelancer hoặc nhân sự từ phòng ban khác hỗ trợ.`
    }
};

/**
 * NỘI DUNG HƯỚNG DẪN CHÍNH
 */
const SYSTEM_GUIDE_DATA = [
    {
        id: 'overview',
        title: '1. Tổng quan Hệ thống',
        updatedAt: new Date().toISOString(),
        sections: [
            {
                type: 'text',
                content: `Chào mừng bạn đến với hệ thống Quản lý công việc (web_dm). Đây là nền tảng quản lý tập trung vào tính kỷ luật, tự động hóa và minh bạch điểm thưởng.
                
                Hệ thống được thiết kế để giảm thiểu thao tác thủ công thông qua các cơ chế thông minh như [Cơ chế Tự động thêm thành viên](ref:auto-add) và tích hợp sâu với Google Drive.`
            },
            {
                type: 'steps',
                title: 'Các đặc điểm nổi bật',
                items: [
                    {
                        title: 'Lưu trữ tự động',
                        content: 'Mỗi Dự án và Task đều có folder Google Drive riêng. File upload sẽ tự động được sắp xếp vào đúng chỗ.'
                    },
                    {
                        title: 'Gamification (Điểm thưởng)',
                        content: 'Mọi công việc đều quy ra điểm số. Điểm được chốt minh bạch qua quy trình [Quy tắc Chốt & Chia điểm](ref:final-points).'
                    },
                    {
                        title: 'Hoạt động ổn định',
                        content: 'Nhờ [Cơ chế Best-effort](ref:best-effort), công việc của bạn luôn được lưu trữ an toàn kể cả khi các dịch vụ bên thứ 3 gặp sự cố.'
                    }
                ]
            }
        ]
    },
    {
        id: 'lifecycle',
        title: '2. Vòng đời Công việc (Quy trình)',
        updatedAt: new Date().toISOString(),
        sections: [
            {
                type: 'text',
                content: `Để làm việc hiệu quả, bạn cần hiểu một Task sẽ đi qua những giai đoạn nào. Hệ thống quản lý chặt chẽ thông qua [Các trạng thái Công việc](ref:task-status).`
            },
            {
                type: 'image',
                src: 'https://placehold.co/1000x300/e2e8f0/1e293b?text=Pending+->+In+Progress+->+Completed+->+Approved',
                caption: 'Sơ đồ luồng đi chuẩn của một Task'
            },
            {
                type: 'steps',
                title: 'Giải thích các giai đoạn',
                items: [
                    {
                        title: 'Giai đoạn 1: Khởi tạo',
                        content: '- **Manager tạo:** Task vào ngay trạng thái "Đang làm".\n- **Nhân viên tạo:** Task ở trạng thái "Chờ duyệt" (Pending) -> Cần Manager xác nhận mới được bắt đầu.'
                    },
                    {
                        title: 'Giai đoạn 2: Thực hiện',
                        content: 'Cập nhật tiến độ, upload file. Nếu chuyển người làm (Re-assign), Task sẽ tạm dừng ở trạng thái "Waiting Confirm".'
                    },
                    {
                        title: 'Giai đoạn 3: Báo cáo',
                        content: 'Khi xong việc, bấm nút **"Hoàn thành"**. Task chuyển màu cam (Completed). Lúc này điểm chưa được cộng.'
                    },
                    {
                        title: 'Giai đoạn 4: Nghiệm thu',
                        content: 'Manager kiểm tra kết quả. Nếu đạt -> Duyệt (Approve). Nếu chưa đạt -> Trả về (Reject).'
                    }
                ]
            }
        ]
    },
    {
        id: 'create_edit',
        title: '3. Tạo mới & Thao tác',
        updatedAt: new Date().toISOString(),
        sections: [
            {
                type: 'text',
                content: `Hướng dẫn chi tiết từng bước để tạo và quản lý một đầu việc.`
            },
            {
                type: 'steps',
                title: 'Cách tạo công việc mới',
                items: [
                    {
                        title: 'B1: Mở form tạo',
                        content: 'Bấm nút **Thêm mới** trong trang Dự án hoặc biểu tượng dấu (+) trên thanh Header.'
                    },
                    {
                        title: 'B2: Nhập thông tin',
                        content: '- **Assignee:** Gõ tên người nhận. Hệ thống sẽ tự kích hoạt [Cơ chế Tự động thêm thành viên](ref:auto-add).\n- **Deadline:** Bắt buộc phải có.'
                    },
                    {
                        title: 'B3: Thiết lập (Dành cho Manager)',
                        content: 'Nhập điểm thưởng (Points) dự kiến và gắn nhãn (Tags) nếu cần.'
                    }
                ]
            },
            {
                type: 'steps',
                title: 'Các thao tác khi làm việc',
                items: [
                    { title: 'Cập nhật tiến độ', content: 'Kéo thanh trượt % Progress để báo cáo mức độ hoàn thành hàng ngày.' },
                    { title: 'Upload tài liệu', content: 'Kéo thả file vào khu vực Attachments. File tự động lên Drive.' },
                    { title: 'Trao đổi', content: 'Dùng tính năng Bình luận (Comment) và @tag tên để nhắc đồng nghiệp.' }
                ]
            },
            {
                type: 'note',
                variant: 'warning',
                content: 'Nếu bạn không phải Manager, các trường Deadline và Điểm số sẽ bị khóa theo quy tắc [Phân quyền Chỉnh sửa (Safe Fields)](ref:safe-fields).'
            }
        ]
    },
    {
        id: 'advanced_features',
        title: '4. Tính năng nâng cao',
        updatedAt: new Date().toISOString(),
        sections: [
            {
                type: 'text',
                content: 'Các công cụ hỗ trợ cho việc quản lý phức tạp và cộng tác nhóm.'
            },
            {
                type: 'steps',
                title: 'Mở rộng khả năng quản lý',
                items: [
                    {
                        title: 'Task con (Subtasks)',
                        content: 'Chia nhỏ việc lớn. **Quy tắc:** Tổng điểm các task con không được vượt quá điểm task cha.'
                    },
                    {
                        title: 'Cộng tác viên (Collaborators)',
                        content: 'Assignee có thể mời người khác hỗ trợ. Người được mời (Invitee) cần bấm **Accept** để tham gia và nhận quyền upload/comment.'
                    },
                    {
                        title: 'Public Board',
                        content: 'Dùng cho task thuê ngoài hoặc tìm người xung phong. Sử dụng quy trình [Cơ chế Claim & Decide](ref:public-claim).'
                    }
                ]
            }
        ]
    },
    {
        id: 'approval_flow',
        title: '5. Nghiệm thu & Chia điểm',
        updatedAt: new Date().toISOString(),
        sections: [
            {
                type: 'text',
                content: `Bước quan trọng nhất để ghi nhận thành quả. Quy trình này đảm bảo công sức được ghi nhận công bằng.`
            },
            {
                type: 'image',
                src: 'https://placehold.co/1200x500?text=Giao+dien+Duyet+va+Chia+Diem',
                caption: 'Giao diện Manager duyệt bài'
            },
            {
                type: 'steps',
                title: 'Quy trình Duyệt bài (Manager)',
                items: [
                    {
                        title: '1. Kiểm tra',
                        content: 'Xem file đính kèm, link kết quả. Nếu chưa đạt, bấm **Reject** để yêu cầu làm lại.'
                    },
                    {
                        title: '2. Duyệt (Approve)',
                        content: 'Nếu kết quả tốt, bấm **Approve**. Popup chia điểm sẽ hiện ra.'
                    },
                    {
                        title: '3. Chốt & Chia điểm',
                        content: 'Nhập **Final Points** (Điểm thực tế). Hệ thống cho phép chia điểm này cho Assignee và Collaborators theo đóng góp.'
                    }
                ]
            }
        ]
    },
    {
        id: 'troubleshooting',
        title: '6. Hỏi đáp & Xử lý lỗi',
        updatedAt: new Date().toISOString(),
        sections: [
            {
                type: 'steps',
                title: 'Các vấn đề thường gặp',
                items: [
                    {
                        title: 'Upload file bị lỗi?',
                        content: 'Do mạng hoặc Drive quá tải. Nhờ [Cơ chế Best-effort](ref:best-effort), Task vẫn được lưu. Bạn hãy thử upload file lại sau hoặc gửi link qua comment.'
                    },
                    {
                        title: 'Giao nhầm người?',
                        content: 'Chỉ cần chọn lại người mới ở ô Assignee. Task sẽ chuyển sang trạng thái "Chờ xác nhận" để người mới accept.'
                    },
                    {
                        title: 'Không thấy tên trong dự án?',
                        content: 'Hãy nhờ Manager giao cho bạn 1 task bất kỳ. Hệ thống sẽ tự động thêm bạn vào dự án ngay lập tức.'
                    },
                    {
                        title: 'Điểm thực nhận khác điểm ban đầu?',
                        content: 'Manager có quyền thưởng thêm hoặc trừ điểm khi duyệt bài dựa trên chất lượng công việc.'
                    }
                ]
            }
        ]
    },
    {
        id: 'teams_management',
        title: '7. Quản lý Đội nhóm (Teams)',
        updatedAt: new Date().toISOString(),
        sections: [
            {
                type: 'text',
                content: `Team (Đội nhóm) là "ngôi nhà chung" của dự án. Đây là nơi bạn tập hợp nhân sự, tạo ra không gian lưu trữ chung trên Google Drive và xem ai đang làm việc hiệu quả nhất.`
            },
            {
                type: 'steps',
                title: 'Phần 1: Tạo & Cài đặt Team',
                items: [
                    {
                        title: 'Tạo Nhóm mới (Chỉ Admin Hệ thống)',
                        content: 'Để đảm bảo việc quản lý chặt chẽ, chỉ có [Admin hệ thống](ref:adminsys) mới có quyền tạo Team mới. Nếu bạn cần lập nhóm, vui lòng liên hệ Admin.'
                    },
                    {
                        title: 'Cập nhật thông tin',
                        content: 'Sau khi Team được tạo, Quản lý/Chủ sở hữu có thể vào phần Cài đặt để chỉnh sửa Tên hoặc Mô tả team bất cứ lúc nào.'
                    }
                ]
            },
            {
                type: 'video',
                src: '13Xn0G0FaSHq35a3d7e8icXqlS_1xtVUy',
                caption: 'Video: Hướng dẫn tạo và cập nhập thông tin Team'
            },
            {
                type: 'steps',
                title: 'Phần 2: Quản lý Thành viên',
                items: [
                    {
                        title: 'Thêm người vào Team',
                        content: 'Nhập tên hoặc ID người dùng -> Chọn vai trò (Manager hoặc Member) -> Bấm Thêm.'
                    },
                    {
                        title: 'Phân quyền (Đổi vai trò)',
                        content: 'Bạn có thể thăng chức cho Member lên làm Manager để cùng quản lý, hoặc hạ chức Manager xuống Member. Xem kỹ [Quyền hạn trong Team](ref:team-roles).'
                    },
                    {
                        title: 'Mời ra khỏi Team',
                        content: 'Bấm nút Xóa bên cạnh tên thành viên để mời họ rời nhóm.'
                    }
                ]
            },
            {
                type: 'video',
                src: '/videos/tutorials/manage-members.mp4',
                caption: 'Video: Cách thêm người và phân chia quyền hạn'
            },
            {
                type: 'steps',
                title: 'Phần 3: Xem Báo cáo & Thống kê',
                items: [
                    {
                        title: 'Truy cập Dashboard',
                        content: 'Vào chi tiết Team -> Chọn tab **"Thống kê"**.'
                    },
                    {
                        title: 'Đọc dữ liệu',
                        content: 'Hệ thống tự động tổng hợp số Task đã làm, tổng điểm thưởng của từng thành viên. Bạn có thể xem ai đang dẫn đầu bảng xếp hạng.'
                    }
                ]
            },
            {
                type: 'video',
                src: '/videos/tutorials/team-analytics.mp4',
                caption: 'Video: Hướng dẫn xem Thống kê và Bảng xếp hạng'
            },
            {
                type: 'steps',
                title: 'Phần 4: Lưu trữ & Xóa (Vùng nguy hiểm)',
                items: [
                    {
                        title: 'Lưu trữ (Archive)',
                        content: 'Dùng khi Team ngừng hoạt động. Team và các dự án con sẽ được cất vào kho "Đã lưu trữ". Bạn có thể khôi phục lại bất cứ lúc nào.'
                    },
                    {
                        title: 'Chuyển quyền Chủ team',
                        content: 'Nếu bạn (Owner) muốn rời đi, hãy chuyển quyền Owner cho một Manager khác trước.'
                    },
                    {
                        title: 'Xóa vĩnh viễn',
                        content: 'Chỉ xóa được khi Team **trống rỗng** (đã xóa hết dự án). Hành động này không thể hoàn tác. Xem [Phân biệt Lưu trữ & Xóa](ref:archive-vs-delete).'
                    }
                ]
            },
            {
                type: 'video',
                src: '/videos/tutorials/archive-delete.mp4',
                caption: 'Video: Cách Lưu trữ, Khôi phục và Xóa Team an toàn'
            }
        ]
    },
    {
        id: 'projects_management',
        title: '8. Quản lý Dự án (Projects)',
        updatedAt: new Date().toISOString(),
        sections: [
            {
                type: 'text',
                content: `Dự án là nơi công việc thực tế diễn ra. Mỗi dự án được liên kết trực tiếp với 1 Team và có không gian lưu trữ tài liệu riêng biệt.`
            },
            {
                type: 'video',
                src: '/videos/tutorials/project-intro.mp4',
                caption: 'Video: Giới thiệu về quản lý Dự án'
            },
            {
                type: 'steps',
                title: 'Phần 1: Tạo & Thiết lập Dự án',
                items: [
                    {
                        title: 'Tạo Dự án (Admin Only)',
                        content: 'Tương tự như Team, việc tạo Dự án mới được kiểm soát bởi [Admin hệ thống](ref:adminsys). để đảm bảo cấu trúc lưu trữ (Folder) được khởi tạo chuẩn xác. Vui lòng liên hệ Admin để cấp dự án mới.'
                    },
                    {
                        title: 'Cập nhật thông tin',
                        content: 'Manager của dự án có quyền cập nhật Tên, Mô tả, Thời gian (Start/Due Date) và Độ ưu tiên (Priority).'
                    }
                ]
            },
            {
                type: 'video',
                src: '/videos/tutorials/project-settings.mp4',
                caption: 'Video: Cập nhật thông tin và tiến độ dự án'
            },
            {
                type: 'steps',
                title: 'Phần 2: Quản lý Thành viên',
                items: [
                    {
                        title: 'Thêm thành viên',
                        content: 'Vào tab Thành viên -> Bấm Thêm. Bạn có thể thêm người đã có trong Team hoặc mời người mới.'
                    },
                    {
                        title: 'Mời người ngoài (Outsider)',
                        content: 'Điểm đặc biệt: Bạn có thể mời một người **KHÔNG** thuộc Team vào làm việc trong Dự án này. Xem [Thành viên Ngoài luồng](ref:project-outsider).'
                    },
                    {
                        title: 'Phân quyền',
                        content: 'Chọn vai trò Manager hoặc Member. Manager có quyền duyệt bài và chỉnh sửa thông tin dự án. Xem [Quyền hạn trong Dự án](ref:project-roles).'
                    }
                ]
            },
            {
                type: 'video',
                src: '/videos/tutorials/project-members.mp4',
                caption: 'Video: Mời thành viên và Outsider vào dự án'
            },
            {
                type: 'steps',
                title: 'Phần 3: Lưu trữ & Drive',
                items: [
                    {
                        title: 'Hệ thống Drive',
                        content: 'Mỗi dự án tự động có 12 folder tương ứng với 12 tháng làm việc. File upload từ Task sẽ tự động chạy vào folder tháng tương ứng.'
                    },
                    {
                        title: 'Lưu trữ (Archive)',
                        content: 'Khi dự án kết thúc, Manager có thể bấm Archive. Dự án sẽ ẩn đi khỏi danh sách chính nhưng dữ liệu và file Drive vẫn được giữ nguyên.'
                    }
                ]
            },
            {
                type: 'video',
                src: '/videos/tutorials/project-drive-archive.mp4',
                caption: 'Video: Quản lý File và Lưu trữ Dự án'
            }
        ]
    }
];

export default function Page() {
    return <GuideViewer data={SYSTEM_GUIDE_DATA} glossary={SYSTEM_GLOSSARY} />;
}