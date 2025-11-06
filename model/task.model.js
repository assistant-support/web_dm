// @/model/task.model.js
/**
 * Tác dụng file: Định nghĩa Mongoose Model cho Task - Model trung tâm của hệ thống.
 * Quản lý cả task nội bộ dự án (scope=PROJECT) và task công khai (scope=PUBLIC).
 * Hỗ trợ claim, outsource, chia điểm, subtasks, collaborators, và workflow integration.
 * 
 * Các tính năng chính:
 * - Task dự án (PROJECT): Thuộc team/project, có assignee, subtasks, approval workflow
 * - Task công khai (PUBLIC): Đăng trên public board, claim mode (AUTO/REVIEW), chia điểm
 * - Outsource: Chuyển task từ PROJECT → PUBLIC, theo dõi origin và điểm
 * - Collaborators: Mời người ngoài vào task, không cần là member dự án
 * - Time tracking: plannedDueAt, startedAt, completedAt, trackedDurationSec
 * - Scoring: initialPoints (dự kiến), finalPoints (thực tế), điểm chia cho worker/payouts
 */

import mongoose from 'mongoose';
import {
    TASK_STATUS, PRIORITY, APPROVAL_STATUS,
    TASK_SCOPE, CLAIM_MODE, CLAIM_STATUS
} from '@/model/common/enums.js';
import { connectDB } from '@/lib/db.js';

/**
 * -----------------------------------------------------------------------------
 * SUB-SCHEMAS (Lược đồ con)
 * -----------------------------------------------------------------------------
 */

/**
 * @typedef {object} DocsMeta
 * @property {boolean} enabled - Trạng thái bật/tắt module Google Drive cho task này.
 * @property {string} driveFolderId - ID của folder Google Drive liên kết.
 * @property {string} driveFolderName - Tên folder Google Drive (để hiển thị).
 *
 * @description (Sub-schema) Lưu trữ thông tin metadata về folder Google Drive
 * được liên kết với task.
 */
const DocsMetaSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    driveFolderId: { type: String, index: true },
    driveFolderName: { type: String },
}, { _id: false });

/**
 * @typedef {object} Claim
 * @property {string} userId - ID của người dùng claim (external user id).
 * @property {string} status - Trạng thái claim (pending, accepted, rejected...).
 * @property {Date} appliedAt - Thời điểm người dùng nộp đơn claim.
 * @property {Date} decidedAt - Thời điểm claim được duyệt/từ chối.
 * @property {string} decidedBy - ID của manager duyệt claim (external user id).
 * @property {string} note - Ghi chú của người claim hoặc manager.
 *
 * @description (Sub-schema) Lưu trữ lịch sử một lượt claim của người dùng
 * đối với task PUBLIC ở chế độ REVIEW.
 */
const ClaimSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    status: { type: String, enum: Object.values(CLAIM_STATUS), default: CLAIM_STATUS.PENDING },
    appliedAt: { type: Date, default: () => new Date() },
    decidedAt: { type: Date },
    decidedBy: { type: String },
    note: { type: String },
}, { _id: true }); // _id: true để mỗi claim có ID riêng

/**
 * @typedef {object} PublicMeta
 * @property {boolean} published - Trạng thái có đang đăng công khai hay không.
 * @property {string} postedBy - ID người đăng (external user id).
 * @property {string} claimMode - Chế độ claim (AUTO hoặc REVIEW).
 * @property {number} requiredPoints - Mức điểm yêu cầu (uy tín) để được claim.
 * @property {Claim[]} claims - Danh sách lịch sử người dùng đã claim (cho chế độ REVIEW).
 * @property {string} workerId - ID của người được nhận làm task (external user id).
 * @property {number} workerSplitPoints - Số điểm người làm (worker) nhận được khi hoàn thành.
 * @property {number} projectSplitPoints - Số điểm trả về cho task gốc (nếu là outsource).
 * @property {Array<object>} payouts - Danh sách chia điểm cho các bên liên quan khác.
 * @property {object} origin - Nguồn gốc task (nếu là outsource từ dự án).
 *
 * @description (Sub-schema) Chứa toàn bộ thông tin dành riêng cho task PUBLIC.
 * Sẽ là 'undefined' nếu task có scope = PROJECT.
 */
const PublicMetaSchema = new mongoose.Schema({
    published: { type: Boolean, default: false },
    postedBy: { type: String, index: true },
    claimMode: { type: String, enum: Object.values(CLAIM_MODE), default: CLAIM_MODE.AUTO },
    requiredPoints: { type: Number, default: 0, min: 0 },
    claims: { type: [ClaimSchema], default: [] },
    workerId: { type: String, index: true },
    workerSplitPoints: { type: Number, default: 0, min: 0 },
    projectSplitPoints: { type: Number, default: 0, min: 0 },
    payouts: [{
        _id: false,
        userId: { type: String, required: true },
        points: { type: Number, required: true, min: 0 }
    }],
    origin: {
        project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
        task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', index: true },
    },
}, { _id: false });

/**
 * @typedef {object} OutsourceLink
 * @property {boolean} isOutsourced - Đánh dấu task này đã được đẩy ra public hay chưa.
 * @property {mongoose.Schema.Types.ObjectId} publicTask - ID của task PUBLIC (bản sao).
 *
 * @description (Sub-schema) Đánh dấu task PROJECT đã được "đẩy" ra public board.
 * Sẽ là 'undefined' nếu task có scope = PUBLIC hoặc chưa outsource.
 */
const OutsourceLinkSchema = new mongoose.Schema({
    isOutsourced: { type: Boolean, default: false },
    publicTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', index: true },
}, { _id: false });

/**
 * -----------------------------------------------------------------------------
 * TASK SCHEMA (Lược đồ chính)
 * -----------------------------------------------------------------------------
 */

/**
 * @description (Main Schema) Lược đồ chính của Task, sử dụng cho cả
 * task dự án (PROJECT) và task công khai (PUBLIC).
 */
const TaskSchema = new mongoose.Schema({
    // ====== PHẠM VI ======
    /** Phân biệt task nội bộ dự án (project) hay task công khai (public) */
    scope: { type: String, enum: Object.values(TASK_SCOPE), default: TASK_SCOPE.PROJECT, index: true },

    // ====== QUAN HỆ DỰ ÁN ======
    /** ID Dự án. Bắt buộc nếu scope = PROJECT. */
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true, required: false },
    /** ID Team. Bắt buộc nếu scope = PROJECT (để tiện query quyền). */
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true, required: false },
    /** ID của task cha (nếu đây là subtask). */
    parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', index: true, default: null },

    // ====== THÔNG TIN CƠ BẢN ======
    /** Tiêu đề task */
    title: { type: String, required: true, trim: true },
    /** Mô tả chi tiết task (HTML/Markdown) */
    description: { type: String, default: '' },

    // ====== QUẢN LÝ NGƯỜI DÙNG (Dùng externalUserId) ======
    /** Người tạo task (externalUserId) */
    createdBy: { type: String, required: true, index: true },
    /** Người thực hiện chính (externalUserId) */
    assignee: { type: String, index: true },
    /** Những người theo dõi task (externalUserId) */
    watchers: [{ type: String, index: true }],
    /**
     * Người phối hợp (Collaborators):
     * Được mời vào task (xem, cmt, ...) dù không phải member dự án.
     */
    collaborators: [{
        _id: false,
        userId: { type: String, required: true, index: true }, // externalUserId
        invitedBy: { type: String, required: true },
        invitedAt: { type: Date, default: () => new Date() },
        acceptedAt: { type: Date }, // null nếu chưa chấp nhận
        role: { type: String, enum: ['contributor', 'reviewer'], default: 'contributor' }
    }],

    // ====== PHÂN LOẠI & THUỘC TÍNH ======
    /** Mã loại công việc (VD: 'design_logo', 'video_edit') */
    workType: { type: String, index: true },
    /** Liên kết đến các Nền tảng (Platform) */
    platforms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Platform', index: true }],
    /** Độ ưu tiên (urgent, high, medium, low) */
    priority: { type: String, enum: Object.values(PRIORITY), default: PRIORITY.MEDIUM },
    /** Danh sách tags (string) */
    tags: { type: [String], default: [], index: true },

    // ====== TRẠNG THÁI & WORKFLOW ======
    /** Trạng thái chính của task (draft, in_progress, completed, ...) */
    status: { type: String, enum: Object.values(TASK_STATUS), default: TASK_STATUS.DRAFT, index: true },

    /** Thông tin quy trình duyệt task (khi member tạo task) */
    approval: {
        _id: false,
        required: { type: Boolean, default: false },
        status: { type: String, enum: Object.values(APPROVAL_STATUS), default: APPROVAL_STATUS.NONE },
        by: { type: String }, // externalUserId người duyệt
        at: { type: Date },
        note: { type: String }
    },
    fileIds: [{ type: String }],
    /** Thông tin quy trình xác nhận nhận task (khi manager gán) */
    assigneeConfirm: {
        _id: false,
        required: { type: Boolean, default: false },
        confirmedBy: { type: String }, // externalUserId người nhận
        confirmedAt: { type: Date },
    },

    /** (Workflow) Key của node hiện tại trong quy trình (nếu có) */
    workflowNodeKey: { type: String, index: true },

    // ====== THỜI GIAN & TIẾN ĐỘ ======
    /** Ngày dự kiến bắt đầu */
    plannedStartAt: Date,
    /** Ngày dự kiến kết thúc (due date) */
    plannedDueAt: Date,
    /** Ngày thực tế bắt đầu (khi chuyển sang In Progress hoặc được claim) */
    startedAt: Date,
    /** Ngày hoàn thành (khi chuyển sang Completed) */
    completedAt: Date,
    /** Tổng thời gian đã theo dõi (giây) */
    trackedDurationSec: { type: Number, default: 0 },

    // ====== ĐIỂM THƯỞNG (POINTS) ======
    /** Điểm dự kiến (do manager đặt lúc tạo/duyệt) */
    initialPoints: { type: Number, default: 0, min: 0 },
    /** Điểm thực tế (do manager chấm lúc hoàn thành) */
    finalPoints: { type: Number, default: 0, min: 0 },
    /** Người chấm điểm (externalUserId) */
    scoredBy: { type: String },
    /** Thời điểm chấm điểm */
    scoredAt: { type: Date },

    /**
     * Tự động chuyển trạng thái task cha sang 'COMPLETED'
     * khi tất cả subtasks hoàn thành (bỏ qua bước review của task cha).
     */
    autoBypassForSubtask: { type: Boolean, default: false },

    /** Tiến độ (tính toán tự động từ subtasks) */
    progress: {
        _id: false,
        total: { type: Number, default: 0 },
        completed: { type: Number, default: 0 },
        inProgress: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 }, // 0-100
    },

    /** Phân chia điểm cho các subtasks (khi task cha có điểm) */
    subtaskPointsDistribution: [{
        _id: false,
        subtaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
        assignedPoints: { type: Number, default: 0, min: 0 },
    }],

    // ====== LIÊN KẾT KHÁC ======
    /** ID của Workflow (nếu task này thuộc 1 workflow) */
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', index: true },

    /** Checklist công việc con (đơn giản) */
    checklist: [{
        _id: false,
        cid: { type: String, required: true }, // ID duy nhất (VD: UUID)
        content: { type: String, required: true },
        done: { type: Boolean, default: false },
        doneAt: Date
    }],

    /** Trường tùy chỉnh (dạng key-value) */
    custom: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },

    /** Thông tin tài liệu (Google Drive) */
    docs: { type: DocsMetaSchema, default: () => ({ enabled: false }) },

    // ====== METADATA (ĐẾM) ======
    /** Tổng số bình luận */
    commentsCount: { type: Number, default: 0 },
    /** Tổng số file đính kèm */
    attachmentsCount: { type: Number, default: 0 },

    /** Thời điểm xóa mềm (Soft delete) */
    deletedAt: { type: Date, default: null },

    // ====== MODULE PUBLIC & OUTSOURCE ======
    /** Dữ liệu task PUBLIC (chỉ tồn tại nếu scope = 'public') */
    public: { type: PublicMetaSchema, default: undefined },
    /** Dữ liệu liên kết (chỉ tồn tại nếu scope = 'project' và đã outsource) */
    outsource: { type: OutsourceLinkSchema, default: undefined },
    drive: { type: String },
    // ====== BỔ SUNG B0 (Sắp xếp, Nhắc nhở) ======
    /** Thứ tự sắp xếp trong View dạng List */
    listOrder: { type: Number, default: 0, index: true },
    /** Thứ tự sắp xếp trong View dạng Kanban (theo status) */
    kanbanOrder: { type: Number, default: 0, index: true },
    /** Thời điểm nhắc nhở */
    remindAt: { type: Date },
    /** Đánh dấu đã gửi nhắc nhở (để job-queue xử lý) */
    reminderSent: { type: Boolean, default: false },
}, {
    /** Tự động thêm createdAt và updatedAt */
    timestamps: true,
    /** Cấu hình khi chuyển sang JSON (loại bỏ __v) */
    toJSON: { transform: (_d, r) => { delete r.__v; } }
});

/**
 * -----------------------------------------------------------------------------
 * VIRTUALS (Trường ảo)
 * -----------------------------------------------------------------------------
 */

/**
 * Virtual field: Kiểm tra task có phải là subtask hay không.
 * @returns {boolean} True nếu task có parentTask
 */
TaskSchema.virtual('isSubtask').get(function () {
    return !!this.parentTask;
});

/**
 * Virtual field: Kiểm tra task có quá hạn hay không.
 * @returns {boolean} True nếu đã qua plannedDueAt và chưa hoàn thành
 */
TaskSchema.virtual('isOverdue').get(function () {
    if (!this.plannedDueAt) return false;
    if (this.status === TASK_STATUS.COMPLETED) return false;
    return new Date(this.plannedDueAt) < new Date();
});

/**
 * Virtual field: Số ngày còn lại đến deadline.
 * @returns {number|null} Số ngày còn lại (âm nếu quá hạn), null nếu không có plannedDueAt
 */
TaskSchema.virtual('daysRemaining').get(function () {
    if (!this.plannedDueAt) return null;
    const now = new Date();
    const due = new Date(this.plannedDueAt);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

/**
 * Virtual field: Trạng thái hiển thị task (active hay archived).
 * @returns {string} 'active' hoặc 'deleted'
 */
TaskSchema.virtual('archiveStatus').get(function () {
    return this.deletedAt ? 'deleted' : 'active';
});

/**
 * Virtual field: Tỷ lệ hoàn thành (dựa trên progress.percentage).
 * @returns {number} Phần trăm hoàn thành (0-100)
 */
TaskSchema.virtual('completionRate').get(function () {
    return this.progress?.percentage || 0;
});

/**
 * Virtual field: Số lượng collaborators đã chấp nhận.
 * @returns {number} Số collaborators đã acceptedAt
 */
TaskSchema.virtual('activeCollaboratorsCount').get(function () {
    if (!this.collaborators) return 0;
    return this.collaborators.filter(c => c.acceptedAt).length;
});

/**
 * Virtual field: Kiểm tra task có Drive folder hay không.
 * @returns {boolean} True nếu docs.enabled và có driveFolderId
 */
TaskSchema.virtual('hasDriveFolder').get(function () {
    return this.docs?.enabled && !!this.docs?.driveFolderId;
});

/**
 * -----------------------------------------------------------------------------
 * INDEXES (Chỉ mục tối ưu query)
 * -----------------------------------------------------------------------------
 */

// Tối ưu query cho Public Board (lọc theo scope, published, sắp xếp)
TaskSchema.index({ scope: 1, 'public.published': 1, priority: 1, createdAt: -1 });

// Tối ưu query "My Tasks" cho worker (người làm task public)
TaskSchema.index({ 'public.workerId': 1, status: 1 });

// Tối ưu query tìm các task chưa bị xóa (Soft delete)
TaskSchema.index({ deletedAt: 1 }, { partialFilterExpression: { deletedAt: { $type: 'null' } } });

// Tối ưu tìm kiếm văn bản
TaskSchema.index({ title: 'text', description: 'text' });

// Tối ưu query tìm task theo người phối hợp (collaborator)
TaskSchema.index({ 'collaborators.userId': 1, deletedAt: 1 });

// Tối ưu query Kanban View (sắp xếp theo status và kanbanOrder)
TaskSchema.index({ project: 1, status: 1, kanbanOrder: 1 });

// Tối ưu query List View (sắp xếp theo listOrder)
TaskSchema.index({ project: 1, listOrder: 1 });

// Tối ưu query subtask (sắp xếp theo listOrder)
TaskSchema.index({ parentTask: 1, listOrder: 1 });

// Tối ưu query cho Job-queue gửi nhắc nhở (chỉ tìm task chưa gửi, chưa xóa)
TaskSchema.index({ remindAt: 1, reminderSent: 1 }, {
    partialFilterExpression: { reminderSent: false, deletedAt: null }
});

/**
 * -----------------------------------------------------------------------------
 * STATICS (Hàm tĩnh của Model)
 * -----------------------------------------------------------------------------
 */

/**
 * Static: Tạo task PUBLIC mới (không thuộc dự án).
 * Task mới sẽ ở trạng thái DRAFT và chưa published.
 *
 * @param {object} payload - Dữ liệu đầu vào
 * @param {string} payload.title - Tiêu đề task (bắt buộc)
 * @param {string} [payload.description=''] - Mô tả chi tiết
 * @param {string} payload.postedBy - External User ID người đăng (bắt buộc)
 * @param {string} [payload.claimMode=AUTO] - Chế độ claim (AUTO hoặc REVIEW)
 * @param {number} [payload.requiredPoints=0] - Điểm uy tín yêu cầu để claim
 * @param {boolean} [payload.docsEnabled=false] - Có bật Google Drive không
 * @param {string} [payload.workType] - Mã loại công việc
 * @param {Array<string>} [payload.platforms=[]] - Danh sách Platform IDs
 * @param {Array<string>} [payload.tags=[]] - Danh sách tags
 * @param {string} [payload.priority] - Độ ưu tiên
 * @returns {Promise<Task>} Task PUBLIC đã tạo
 * @throws {Error} Nếu thiếu thông tin bắt buộc
 */
TaskSchema.statics.createPublicTask = async function (payload) {
    await connectDB();
    
    const {
        title, description = '',
        postedBy,
        claimMode = CLAIM_MODE.AUTO,
        requiredPoints = 0,
        docsEnabled = false,
        workType = null,
        platforms = [],
        tags = [],
        priority,
    } = payload;
    
    if (!title) {
        throw new Error('Task title is required');
    }
    if (!postedBy) {
        throw new Error('PostedBy user ID is required');
    }

    return await this.create({
        scope: TASK_SCOPE.PUBLIC,
        title, description,
        createdBy: postedBy,
        status: TASK_STATUS.DRAFT,
        priority, tags,
        workType, platforms,
        docs: { enabled: !!docsEnabled },
        approval: { required: false, status: APPROVAL_STATUS.NONE },
        assigneeConfirm: { required: false },
        public: {
            published: false,
            postedBy,
            claimMode,
            requiredPoints,
            claims: []
        }
    });
};

/**
 * Static: Chuyển (outsource) task từ PROJECT ra PUBLIC.
 * Tạo bản sao task trên public board và link origin.
 *
 * @param {string|mongoose.Types.ObjectId} originalTaskId - ID task gốc (scope=PROJECT)
 * @param {object} options - Tùy chọn khi outsource
 * @param {string} options.postedBy - External User ID người thực hiện (bắt buộc)
 * @param {string} [options.claimMode=AUTO] - Chế độ claim
 * @param {number} [options.requiredPoints=0] - Điểm yêu cầu
 * @param {boolean} [options.docsEnabled=false] - Có bật Drive không
 * @returns {Promise<Task>} Task PUBLIC (bản sao) đã tạo và publish
 * @throws {Error} Nếu task gốc không tồn tại hoặc không phải PROJECT
 */
TaskSchema.statics.publishFromProjectTask = async function (originalTaskId, {
    postedBy, claimMode = CLAIM_MODE.AUTO, requiredPoints = 0, docsEnabled = false
}) {
    await connectDB();
    
    const original = await this.findById(originalTaskId);

    if (!original) {
        throw new Error('Original task not found');
    }
    if (original.scope !== TASK_SCOPE.PROJECT) {
        throw new Error('Can only outsource PROJECT tasks');
    }
    if (original.outsource?.isOutsourced) {
        throw new Error('Task already outsourced');
    }

    // Tạo task PUBLIC (bản sao)
    const pub = await this.create({
        scope: TASK_SCOPE.PUBLIC,
        title: original.title,
        description: original.description,
        createdBy: postedBy,
        status: TASK_STATUS.DRAFT,
        priority: original.priority,
        tags: original.tags,
        workType: original.workType,
        platforms: original.platforms,
        docs: { enabled: !!docsEnabled },
        approval: { required: false, status: APPROVAL_STATUS.NONE },
        assigneeConfirm: { required: false },
        initialPoints: original.initialPoints,
        public: {
            published: true,
            postedBy,
            claimMode,
            requiredPoints,
            origin: { project: original.project, task: original._id },
            claims: []
        }
    });

    // Cập nhật task gốc
    original.outsource = { isOutsourced: true, publicTask: pub._id };
    await original.save();

    return pub;
};

/**
 * Static: Tìm tất cả task của một project.
 * @param {string|mongoose.Types.ObjectId} projectId - Project ID
 * @param {boolean} includeDeleted - Có bao gồm task đã xóa không (mặc định: false)
 * @returns {Promise<Task[]>} Danh sách task
 */
TaskSchema.statics.findByProject = async function (projectId, includeDeleted = false) {
    await connectDB();
    
    const query = { project: projectId };
    if (!includeDeleted) {
        query.deletedAt = null;
    }
    
    return await this.find(query).sort({ createdAt: -1 }).lean().exec();
};

/**
 * Static: Tìm tất cả task được assign cho một user.
 * @param {string} userId - External User ID
 * @param {boolean} includeDeleted - Có bao gồm task đã xóa không (mặc định: false)
 * @returns {Promise<Task[]>} Danh sách task
 */
TaskSchema.statics.findByAssignee = async function (userId, includeDeleted = false) {
    await connectDB();
    
    const query = { assignee: userId };
    if (!includeDeleted) {
        query.deletedAt = null;
    }
    
    return await this.find(query).sort({ createdAt: -1 }).lean().exec();
};

/**
 * Static: Tìm tất cả public task đang published.
 * @param {object} filters - Filters tùy chọn
 * @param {string} [filters.workType] - Lọc theo workType
 * @param {string} [filters.priority] - Lọc theo priority
 * @param {number} [filters.limit=50] - Giới hạn số lượng
 * @returns {Promise<Task[]>} Danh sách task public
 */
TaskSchema.statics.findPublishedTasks = async function (filters = {}) {
    await connectDB();
    
    const query = {
        scope: TASK_SCOPE.PUBLIC,
        'public.published': true,
        deletedAt: null
    };
    
    if (filters.workType) {
        query.workType = filters.workType;
    }
    if (filters.priority) {
        query.priority = filters.priority;
    }
    
    return await this.find(query)
        .sort({ priority: 1, createdAt: -1 })
        .limit(filters.limit || 50)
        .lean()
        .exec();
};

/**
 * Static: Tìm subtasks của một task cha.
 * @param {string|mongoose.Types.ObjectId} parentTaskId - Parent task ID
 * @param {boolean} includeDeleted - Có bao gồm subtask đã xóa không (mặc định: false)
 * @returns {Promise<Task[]>} Danh sách subtasks
 */
TaskSchema.statics.findSubtasks = async function (parentTaskId, includeDeleted = false) {
    await connectDB();
    
    const query = { parentTask: parentTaskId };
    if (!includeDeleted) {
        query.deletedAt = null;
    }
    
    return await this.find(query).sort({ listOrder: 1 }).lean().exec();
};


/**
 * -----------------------------------------------------------------------------
 * METHODS (Hàm của đối tượng Document)
 * -----------------------------------------------------------------------------
 */

/**
 * Method: Đăng công khai một task PUBLIC.
 * Chuyển published = true và status = DRAFT.
 *
 * @returns {Promise<Task>} Task instance đã cập nhật
 * @throws {Error} Nếu task không phải scope PUBLIC
 */
TaskSchema.methods.publishPublic = async function () {
    await connectDB();
    
    if (this.scope !== TASK_SCOPE.PUBLIC) {
        throw new Error('Only PUBLIC tasks can be published');
    }

    this.public.published = true;
    this.status = TASK_STATUS.DRAFT;
    await this.save();
    return this;
};

/**
 * Method: Gỡ publish một task PUBLIC.
 *
 * @returns {Promise<Task>} Task instance đã cập nhật
 * @throws {Error} Nếu task không phải scope PUBLIC
 */
TaskSchema.methods.unpublishPublic = async function () {
    await connectDB();
    
    if (this.scope !== TASK_SCOPE.PUBLIC) {
        throw new Error('Only PUBLIC tasks can be unpublished');
    }

    this.public.published = false;
    await this.save();
    return this;
};

/**
 * Method: Người dùng claim (nhận) task PUBLIC.
 * - AUTO mode: Gán thẳng worker, chuyển status IN_PROGRESS
 * - REVIEW mode: Thêm vào claims với status PENDING
 *
 * @param {string} userId - External User ID người claim
 * @param {string} [note=''] - Ghi chú của người claim
 * @returns {Promise<Task>} Task instance đã cập nhật
 * @throws {Error} Nếu task chưa public hoặc đã có người nhận
 */
TaskSchema.methods.claimPublic = async function (userId, note = '') {
    await connectDB();
    
    if (this.scope !== TASK_SCOPE.PUBLIC || !this.public?.published) {
        throw new Error('Task is not published');
    }
    if (this.assignee || this.public.workerId) {
        throw new Error('Task already claimed');
    }

    if (this.public.claimMode === CLAIM_MODE.AUTO) {
        // AUTO: Nhận ngay
        this.public.workerId = userId;
        this.assignee = userId;
        this.startedAt = new Date();
        this.status = TASK_STATUS.IN_PROGRESS;
        this.public.claims.push({ 
            userId, 
            status: CLAIM_STATUS.ACCEPTED, 
            decidedAt: new Date(), 
            note 
        });
    } else {
        // REVIEW: Chờ duyệt
        const alreadyClaimed = this.public.claims.some(
            c => String(c.userId) === String(userId) && c.status === CLAIM_STATUS.PENDING
        );
        if (alreadyClaimed) {
            throw new Error('You already submitted a claim for this task');
        }
        
        this.public.claims.push({ userId, status: CLAIM_STATUS.PENDING, note });
    }

    await this.save();
    return this;
};

/**
 * Method: Manager quyết định claim (REVIEW mode).
 *
 * @param {string|mongoose.Types.ObjectId} claimId - Claim ID trong public.claims
 * @param {string} managerId - External User ID của manager
 * @param {boolean} [accept=true] - True = chấp nhận, False = từ chối
 * @param {string} [note=''] - Ghi chú của manager
 * @returns {Promise<Task>} Task instance đã cập nhật
 * @throws {Error} Nếu claim không tồn tại, đã xử lý, hoặc task đã có người nhận
 */
TaskSchema.methods.decideClaim = async function (claimId, managerId, accept = true, note = '') {
    await connectDB();
    
    if (this.scope !== TASK_SCOPE.PUBLIC) {
        throw new Error('Only PUBLIC tasks have claims');
    }

    const claim = this.public?.claims?.find(c => String(c._id) === String(claimId));
    if (!claim) {
        throw new Error('Claim not found');
    }
    if (claim.status !== CLAIM_STATUS.PENDING) {
        throw new Error('Claim already decided');
    }

    // Cập nhật claim
    claim.status = accept ? CLAIM_STATUS.ACCEPTED : CLAIM_STATUS.REJECTED;
    claim.decidedAt = new Date();
    claim.decidedBy = managerId;
    claim.note = note || claim.note;

    if (accept) {
        if (this.assignee || this.public.workerId) {
            // Task đã bị claim trong lúc duyệt
            claim.status = CLAIM_STATUS.REJECTED;
            claim.note = 'Task already claimed by someone else';
            await this.save();
            throw new Error('Task already claimed');
        }

        this.public.workerId = claim.userId;
        this.assignee = claim.userId;
        this.status = TASK_STATUS.IN_PROGRESS;
        this.startedAt = new Date();
    }

    await this.save();
    return this;
};

/**
 * Method: Duyệt hoàn thành task và chia điểm.
 * Áp dụng cho cả PROJECT và PUBLIC tasks.
 * - PUBLIC: Chia điểm cho worker, payouts, và projectSplitPoints
 * - Nếu outsource: Cập nhật finalPoints cho task gốc
 *
 * @param {string} managerUserId - External User ID người duyệt
 * @param {object} options - Tùy chọn chia điểm
 * @param {number} [options.totalPoints=0] - Tổng điểm cuối (finalPoints)
 * @param {number} [options.workerSplitPoints=0] - Điểm cho worker (PUBLIC only)
 * @param {Array<object>} [options.payouts=[]] - Điểm cho các bên khác [{userId, points}]
 * @returns {Promise<Task>} Task instance đã cập nhật
 * @throws {Error} Nếu status không phải COMPLETED_AWAIT_REVIEW hoặc tổng điểm chia vượt quá
 */
TaskSchema.methods.approveCompletionWithSplit = async function (managerUserId, {
    totalPoints = 0,
    workerSplitPoints = 0,
    payouts = []
}) {
    await connectDB();
    
    if (this.status !== TASK_STATUS.COMPLETED_AWAIT_REVIEW) {
        throw new Error('Task is not awaiting review');
    }

    // Cập nhật chấm điểm
    this.finalPoints = Number(totalPoints) || 0;
    this.scoredBy = managerUserId;
    this.scoredAt = new Date();
    this.status = TASK_STATUS.COMPLETED;

    // Xử lý PUBLIC task: chia điểm
    if (this.scope === TASK_SCOPE.PUBLIC) {
        const worker = Math.max(0, Number(workerSplitPoints) || 0);
        const payoutsTotal = Array.isArray(payouts)
            ? payouts.reduce((s, p) => s + (Number(p.points) || 0), 0)
            : 0;

        if (worker + payoutsTotal > this.finalPoints) {
            this.status = TASK_STATUS.COMPLETED_AWAIT_REVIEW; // Rollback
            await this.save();
            throw new Error('Total split points exceed final points');
        }

        const projectPart = Math.max(0, this.finalPoints - worker - payoutsTotal);

        this.public.workerSplitPoints = worker;
        this.public.projectSplitPoints = projectPart;
        this.public.payouts = Array.isArray(payouts) ? payouts : [];

        // Nếu outsource: cập nhật task gốc
        const originId = this.public?.origin?.task;
        if (originId) {
            await this.constructor.findByIdAndUpdate(
                originId,
                {
                    finalPoints: projectPart,
                    scoredBy: managerUserId,
                    scoredAt: new Date(),
                },
                { lean: true }
            );
        }
    }

    await this.save();
    return this;
};

/**
 * Method: Soft delete task (đánh dấu deletedAt).
 *
 * @returns {Promise<Task>} Task instance đã cập nhật
 */
TaskSchema.methods.softDelete = async function () {
    await connectDB();
    
    this.deletedAt = new Date();
    await this.save();
    return this;
};

/**
 * Method: Khôi phục task đã xóa (xóa deletedAt).
 *
 * @returns {Promise<Task>} Task instance đã cập nhật
 */
TaskSchema.methods.restore = async function () {
    await connectDB();
    
    this.deletedAt = null;
    await this.save();
    return this;
};

/**
 * Method: Thêm collaborator vào task.
 *
 * @param {string} userId - External User ID
 * @param {string} invitedBy - External User ID người mời
 * @param {string} [role='contributor'] - Vai trò ('contributor' hoặc 'reviewer')
 * @returns {Promise<Task>} Task instance đã cập nhật
 * @throws {Error} Nếu user đã là collaborator
 */
TaskSchema.methods.addCollaborator = async function (userId, invitedBy, role = 'contributor') {
    await connectDB();
    
    const exists = this.collaborators.some(c => String(c.userId) === String(userId));
    if (exists) {
        throw new Error('User is already a collaborator');
    }
    
    this.collaborators.push({ userId, invitedBy, role });
    await this.save();
    return this;
};

/**
 * Method: Xóa collaborator khỏi task.
 *
 * @param {string} userId - External User ID
 * @returns {Promise<Task>} Task instance đã cập nhật
 * @throws {Error} Nếu user không phải collaborator
 */
TaskSchema.methods.removeCollaborator = async function (userId) {
    await connectDB();
    
    const exists = this.collaborators.some(c => String(c.userId) === String(userId));
    if (!exists) {
        throw new Error('User is not a collaborator');
    }
    
    this.collaborators = this.collaborators.filter(c => String(c.userId) !== String(userId));
    await this.save();
    return this;
};

/**
 * -----------------------------------------------------------------------------
 * MIDDLEWARE (HOOKS)
 * -----------------------------------------------------------------------------
 */

/**
 * Pre-save middleware: Tự động cập nhật progress.percentage từ subtasks.
 * Chỉ áp dụng khi task có subtasks.
 */
TaskSchema.pre('save', async function (next) {
    if (this.isModified('progress.completed') || this.isModified('progress.total')) {
        if (this.progress.total > 0) {
            this.progress.percentage = Math.round(
                (this.progress.completed / this.progress.total) * 100
            );
        } else {
            this.progress.percentage = 0;
        }
    }
    next();
});

/**
 * Pre-save middleware: Validate claim mode requirements.
 * PUBLIC task phải có claimMode nếu published.
 */
TaskSchema.pre('save', function (next) {
    if (this.scope === TASK_SCOPE.PUBLIC && this.public?.published) {
        if (!this.public.claimMode) {
            return next(new Error('Public task must have a claim mode'));
        }
    }
    next();
});

/**
 * Pre-save middleware: Tự động set startedAt khi chuyển sang IN_PROGRESS.
 */
TaskSchema.pre('save', function (next) {
    if (this.isModified('status') && this.status === TASK_STATUS.IN_PROGRESS) {
        if (!this.startedAt) {
            this.startedAt = new Date();
        }
    }
    next();
});

/**
 * Pre-save middleware: Tự động set completedAt khi chuyển sang COMPLETED.
 */
TaskSchema.pre('save', function (next) {
    if (this.isModified('status') && this.status === TASK_STATUS.COMPLETED) {
        if (!this.completedAt) {
            this.completedAt = new Date();
        }
    }
    next();
});

// ==================== MODEL EXPORT ====================

/**
 * Xóa model cũ khỏi cache để tránh lỗi HMR trong Next.js development.
 */
if (mongoose.models.Task) {
    delete mongoose.models.Task;
    delete mongoose.connection.models.Task;
}

/**
 * Export Task Model.
 * Model trung tâm quản lý task (PROJECT và PUBLIC), subtasks, collaborators, 
 * claim/outsource, timeline, và scoring system.
 */
export default mongoose.model('Task', TaskSchema);