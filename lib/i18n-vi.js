// lib/i18n-vi.js
// Vietnamese translations for the application

export const vi = {
  // Common actions
  actions: {
    create: 'Tạo',
    edit: 'Sửa',
    delete: 'Xóa',
    save: 'Lưu',
    cancel: 'Hủy',
    close: 'Đóng',
    back: 'Quay lại',
    next: 'Tiếp theo',
    submit: 'Gửi',
    confirm: 'Xác nhận',
    add: 'Thêm',
    remove: 'Xóa bỏ',
    update: 'Cập nhật',
    refresh: 'Làm mới',
    search: 'Tìm kiếm',
    filter: 'Lọc',
    sort: 'Sắp xếp',
    view: 'Xem',
    download: 'Tải xuống',
    upload: 'Tải lên',
  },

  // Common labels
  common: {
    name: 'Tên',
    code: 'Mã',
    description: 'Mô tả',
    status: 'Trạng thái',
    priority: 'Độ ưu tiên',
    role: 'Vai trò',
    type: 'Loại',
    date: 'Ngày',
    time: 'Thời gian',
    createdAt: 'Ngày tạo',
    updatedAt: 'Ngày cập nhật',
    createdBy: 'Người tạo',
    assignee: 'Người phụ trách',
    dueDate: 'Hạn hoàn thành',
    startDate: 'Ngày bắt đầu',
    endDate: 'Ngày kết thúc',
    loading: 'Đang tải...',
    error: 'Lỗi',
    success: 'Thành công',
    warning: 'Cảnh báo',
    info: 'Thông tin',
    noData: 'Không có dữ liệu',
    all: 'Tất cả',
    yes: 'Có',
    no: 'Không',
  },

  // Team related
  team: {
    title: 'Team',
    teams: 'Các Team',
    myTeams: 'Team của tôi',
    createTeam: 'Tạo Team',
    editTeam: 'Sửa Team',
    deleteTeam: 'Xóa Team',
    teamName: 'Tên Team',
    teamCode: 'Mã Team',
    teamDescription: 'Mô tả Team',
    members: 'Thành viên',
    addMember: 'Thêm thành viên',
    removeMember: 'Xóa thành viên',
    changeRole: 'Đổi vai trò',
    manager: 'Quản lý',
    member: 'Thành viên',
    joined: 'Đã tham gia',
    you: 'Bạn',
    memberCount: 'Số thành viên',
    projectCount: 'Số dự án',
    emptyState: 'Chưa có team nào. Hãy tạo team đầu tiên!',
    deleteConfirm: 'Bạn có chắc muốn xóa team này?',
    removeMemberConfirm: 'Bạn có chắc muốn xóa thành viên này khỏi team?',
  },

  // Project related
  project: {
    title: 'Dự án',
    projects: 'Các Dự án',
    myProjects: 'Dự án của tôi',
    createProject: 'Tạo Dự án',
    editProject: 'Sửa Dự án',
    deleteProject: 'Xóa Dự án',
    projectName: 'Tên Dự án',
    projectCode: 'Mã Dự án',
    projectDescription: 'Mô tả Dự án',
    members: 'Thành viên',
    addMember: 'Thêm thành viên',
    removeMember: 'Xóa thành viên',
    changeRole: 'Đổi vai trò',
    owner: 'Chủ sở hữu',
    manager: 'Quản lý',
    member: 'Thành viên',
    viewer: 'Người xem',
    taskCount: 'Số nhiệm vụ',
    emptyState: 'Chưa có dự án nào. Hãy tạo dự án đầu tiên!',
    deleteConfirm: 'Bạn có chắc muốn xóa dự án này?',
    removeMemberConfirm: 'Bạn có chắc muốn xóa thành viên này khỏi dự án?',
    noDescription: 'Chưa có mô tả',
  },

  // Task related
  task: {
    title: 'Nhiệm vụ',
    tasks: 'Các Nhiệm vụ',
    myTasks: 'Nhiệm vụ của tôi',
    createTask: 'Tạo Nhiệm vụ',
    editTask: 'Sửa Nhiệm vụ',
    deleteTask: 'Xóa Nhiệm vụ',
    quickCreate: 'Tạo nhanh nhiệm vụ',
    taskTitle: 'Tiêu đề nhiệm vụ',
    taskDescription: 'Mô tả nhiệm vụ',
    assignee: 'Người phụ trách',
    unassigned: 'Chưa gán',
    priority: 'Độ ưu tiên',
    status: 'Trạng thái',
    dueDate: 'Hạn hoàn thành',
    noDueDate: 'Không có hạn',
    tags: 'Thẻ',
    attachments: 'Tệp đính kèm',
    comments: 'Bình luận',
    emptyState: 'Chưa có nhiệm vụ nào.',
    deleteConfirm: 'Bạn có chắc muốn xóa nhiệm vụ này?',
    overdue: 'Quá hạn',
    
    // Task views
    listView: 'Xem danh sách',
    kanbanView: 'Xem Kanban',
    calendarView: 'Xem lịch',
    
    // Task filters
    filters: 'Bộ lọc',
    filterByStatus: 'Lọc theo trạng thái',
    filterByPriority: 'Lọc theo độ ưu tiên',
    filterByAssignee: 'Lọc theo người phụ trách',
    clearFilters: 'Xóa bộ lọc',
  },

  // Task statuses
  taskStatus: {
    draft: 'Nháp',
    pending_approval: 'Chờ phê duyệt',
    waiting_confirm: 'Chờ xác nhận',
    in_progress: 'Đang thực hiện',
    on_hold: 'Tạm dừng',
    completed_await_review: 'Chờ review',
    completed: 'Hoàn thành',
    rejected: 'Từ chối',
    cancelled: 'Đã hủy',
  },

  // Task priorities
  taskPriority: {
    low: 'Thấp',
    normal: 'Bình thường',
    high: 'Cao',
    urgent: 'Khẩn cấp',
  },

  // Task stats
  taskStats: {
    open: 'Mở',
    inProgress: 'Đang làm',
    awaitReview: 'Chờ review',
    completed: 'Hoàn thành',
    overdue: 'Quá hạn',
  },

  // Form validation messages
  validation: {
    required: 'Trường này là bắt buộc',
    minLength: 'Tối thiểu {min} ký tự',
    maxLength: 'Tối đa {max} ký tự',
    email: 'Email không hợp lệ',
    url: 'URL không hợp lệ',
    number: 'Phải là số',
    date: 'Ngày không hợp lệ',
    nameRequired: 'Tên là bắt buộc',
    codeRequired: 'Mã là bắt buộc',
    titleRequired: 'Tiêu đề là bắt buộc',
    userIdRequired: 'User ID là bắt buộc',
    roleRequired: 'Vai trò là bắt buộc',
  },

  // Success messages
  success: {
    created: 'Tạo thành công',
    updated: 'Cập nhật thành công',
    deleted: 'Xóa thành công',
    saved: 'Lưu thành công',
    memberAdded: 'Đã thêm thành viên',
    memberRemoved: 'Đã xóa thành viên',
    roleChanged: 'Đã đổi vai trò',
    statusChanged: 'Đã đổi trạng thái',
  },

  // Error messages
  error: {
    general: 'Có lỗi xảy ra',
    unexpected: 'Lỗi không mong muốn',
    notFound: 'Không tìm thấy',
    unauthorized: 'Không có quyền truy cập',
    forbidden: 'Không được phép',
    serverError: 'Lỗi server',
    networkError: 'Lỗi kết nối',
    timeout: 'Hết thời gian chờ',
    createFailed: 'Không thể tạo',
    updateFailed: 'Không thể cập nhật',
    deleteFailed: 'Không thể xóa',
    loadFailed: 'Không thể tải dữ liệu',
    saveFailed: 'Không thể lưu',
    addMemberFailed: 'Không thể thêm thành viên',
    removeMemberFailed: 'Không thể xóa thành viên',
    changeRoleFailed: 'Không thể đổi vai trò',
    changeStatusFailed: 'Không thể đổi trạng thái',
  },

  // Auth
  auth: {
    signIn: 'Đăng nhập',
    signOut: 'Đăng xuất',
    signUp: 'Đăng ký',
    profile: 'Hồ sơ',
    settings: 'Cài đặt',
  },

  // Navigation
  nav: {
    home: 'Trang chủ',
    dashboard: 'Bảng điều khiển',
    teams: 'Teams',
    projects: 'Dự án',
    tasks: 'Nhiệm vụ',
    calendar: 'Lịch',
    reports: 'Báo cáo',
    settings: 'Cài đặt',
  },
};

// Helper function to get translation
export function t(key, params = {}) {
  const keys = key.split('.');
  let value = vi;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }
  
  // Replace parameters
  if (typeof value === 'string' && Object.keys(params).length > 0) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? params[paramKey] : match;
    });
  }
  
  return value;
}

export default vi;
