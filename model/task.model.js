//
// 📁 model/task.model.js
// 📝 Tác dụng file: Định nghĩa Mongoose Schema và Model cho 'Task'.
//    Đây là model trung tâm, quản lý cả task nội bộ dự án (scope=PROJECT)
//    lẫn task công khai (scope=PUBLIC) và các nghiệp vụ liên quan
//    (claim, outsource, chia điểm).
//
import mongoose from 'mongoose';
import {
    TASK_STATUS, PRIORITY, APPROVAL_STATUS,
    TASK_SCOPE, CLAIM_MODE, CLAIM_STATUS
} from '@/model/common/enums.js'; // Import các hằng số enum

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
 * (Virtual) Kiểm tra xem task có phải là subtask hay không.
 * @returns {boolean} True nếu task có 'parentTask', ngược lại là false.
 */
TaskSchema.virtual('isSubtask').get(function () {
    return !!this.parentTask;
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

// Tối ưu query tìm task theo workflow
TaskSchema.index({ workflowId: 1 });

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
 * (Static) Tạo một task PUBLIC mới (không thuộc dự án).
 * Task này ban đầu sẽ ở trạng thái DRAFT và chưa published.
 *
 * @param {object} payload - Dữ liệu đầu vào để tạo task.
 * @param {string} payload.title - Tiêu đề task.
 * @param {string} [payload.description] - Mô tả.
 * @param {string} payload.postedBy - ID người đăng (externalUserId).
 * @param {string} [payload.claimMode] - Chế độ claim (AUTO hoặc REVIEW).
 * @param {number} [payload.requiredPoints] - Điểm uy tín yêu cầu.
 * @param {boolean} [payload.docsEnabled] - Có bật Google Drive không.
 * @param {string} [payload.workType] - Mã loại công việc.
 * @param {Array<string>} [payload.platforms] - Danh sách ID Platforms.
 * @param {Array<string>} [payload.tags] - Danh sách tags.
 * @param {string} [payload.priority] - Độ ưu tiên.
 * @returns {Promise<Document<Task>>} Task PUBLIC đã được tạo.
 */
TaskSchema.statics.createPublicTask = async function (payload) {
    const Task = this; // 'this' là Model
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

    return Task.create({
        scope: TASK_SCOPE.PUBLIC,
        title, description,
        createdBy: postedBy, // Người tạo cũng là người đăng
        status: TASK_STATUS.DRAFT,
        priority, tags,
        workType, platforms,
        docs: { enabled: !!docsEnabled },
        approval: { required: false, status: APPROVAL_STATUS.NONE },
        assigneeConfirm: { required: false },
        public: {
            published: false, // Mặc định là chưa đăng
            postedBy,
            claimMode,
            requiredPoints,
            claims: []
        }
    });
};

/**
 * (Static) Chuyển (outsource) một task từ PROJECT ra PUBLIC.
 * Hàm này sẽ:
 * 1. Tìm task gốc (PROJECT).
 * 2. Tạo một bản sao (PUBLIC) với các thông tin cơ bản.
 * 3. Cập nhật task gốc (PROJECT) để đánh dấu 'outsource'.
 *
 * @param {string|mongoose.Types.ObjectId} originalTaskId - ID của task gốc (scope=PROJECT).
 * @param {object} options - Tùy chọn khi đăng public.
 * @param {string} options.postedBy - ID người thực hiện hành động outsource (externalUserId).
 * @param {string} [options.claimMode] - Chế độ claim.
 * @param {number} [options.requiredPoints] - Điểm yêu cầu.
 * @param {boolean} [options.docsEnabled] - Có bật Google Drive cho task public không.
 * @returns {Promise<Document<Task>>} Task PUBLIC (bản sao) đã được tạo và publish.
 * @throws {Error} Nếu task gốc không tồn tại hoặc không phải task PROJECT.
 */
TaskSchema.statics.publishFromProjectTask = async function (originalTaskId, {
    postedBy, claimMode = CLAIM_MODE.AUTO, requiredPoints = 0, docsEnabled = false
}) {
    const Task = this;
    const original = await Task.findById(originalTaskId);

    if (!original) throw new Error('Task gốc không tồn tại.');
    if (original.scope !== TASK_SCOPE.PROJECT) throw new Error('Chỉ chuyển từ task dự án.');

    // Tạo task PUBLIC (bản sao)
    const pub = await Task.create({
        scope: TASK_SCOPE.PUBLIC,
        title: original.title,
        description: original.description,
        createdBy: postedBy,
        status: TASK_STATUS.DRAFT, // Bắt đầu ở DRAFT
        priority: original.priority,
        tags: original.tags,
        workType: original.workType,
        platforms: original.platforms,
        docs: { enabled: !!docsEnabled },
        approval: { required: false, status: APPROVAL_STATUS.NONE },
        assigneeConfirm: { required: false },
        initialPoints: original.initialPoints, // Mang điểm dự kiến từ task gốc
        public: {
            published: true, // Đăng ngay lập tức
            postedBy,
            claimMode,
            requiredPoints,
            origin: { project: original.project, task: original._id }, // Link về task gốc
            claims: []
        }
    });

    // Cập nhật task gốc
    original.outsource = { isOutsourced: true, publicTask: pub._id };
    await original.save();

    return pub;
};


/**
 * -----------------------------------------------------------------------------
 * METHODS (Hàm của đối tượng Document)
 * -----------------------------------------------------------------------------
 */

/**
 * (Method) Đăng công khai một task (scope PUBLIC).
 * Yêu cầu: task phải có scope = 'public'.
 *
 * @returns {Promise<Document<Task>>} Task instance đã cập nhật.
 * @throws {Error} Nếu task không phải scope PUBLIC.
 */
TaskSchema.methods.publishPublic = async function () {
    if (this.scope !== TASK_SCOPE.PUBLIC) throw new Error('Chỉ task công khai mới publish.');

    this.public.published = true;
    this.status = TASK_STATUS.DRAFT; // Đảm bảo status là DRAFT khi publish
    await this.save();
    return this;
};

/**
 * (Method) Gỡ publish một task PUBLIC.
 *
 * @returns {Promise<Document<Task>>} Task instance đã cập nhật.
 * @throws {Error} Nếu task không phải scope PUBLIC.
 */
TaskSchema.methods.unpublishPublic = async function () {
    if (this.scope !== TASK_SCOPE.PUBLIC) throw new Error('Chỉ task công khai mới unpublish.');

    this.public.published = false;
    await this.save();
    return this;
};

/**
 * (Method) Người dùng claim (nhận) một task PUBLIC.
 * - Chế độ AUTO: Gán thẳng worker, chuyển status sang IN_PROGRESS.
 * - Chế độ REVIEW: Thêm vào danh sách 'claims' ở trạng thái PENDING.
 *
 * @param {string} userId - ID người claim (externalUserId).
 * @param {string} [note] - Ghi chú của người claim.
 * @returns {Promise<Document<Task>>} Task instance đã cập nhật.
 * @throws {Error} Nếu task chưa công khai hoặc đã có người nhận.
 */
TaskSchema.methods.claimPublic = async function (userId, note) {
    if (this.scope !== TASK_SCOPE.PUBLIC || !this.public?.published) {
        throw new Error('Task chưa công khai.');
    }
    if (this.assignee || this.public.workerId) {
        throw new Error('Task đã có người nhận.');
    }

    if (this.public.claimMode === CLAIM_MODE.AUTO) {
        // Chế độ AUTO: Nhận ngay
        this.public.workerId = userId;
        this.assignee = userId;
        this.startedAt = new Date();
        this.status = TASK_STATUS.IN_PROGRESS;
        this.public.claims.push({ userId, status: CLAIM_STATUS.ACCEPTED, decidedAt: new Date(), note });
    } else {
        // Chế độ REVIEW: Chờ duyệt
        // TODO: Cân nhắc kiểm tra xem user này đã claim chưa
        this.public.claims.push({ userId, status: CLAIM_STATUS.PENDING, note });
    }

    await this.save();
    return this;
};

/**
 * (Method) Manager quyết định một claim (ở chế độ REVIEW).
 *
 * @param {string|mongoose.Types.ObjectId} claimId - ID của claim (trong mảng public.claims).
 * @param {string} managerId - ID của manager (externalUserId).
 * @param {boolean} [accept=true] - Quyết định (true = chấp nhận, false = từ chối).
 * @param {string} [note] - Ghi chú của manager.
 * @returns {Promise<Document<Task>>} Task instance đã cập nhật.
 * @throws {Error} Nếu không tìm thấy claim, claim đã được xử lý, hoặc task đã có người nhận.
 */
TaskSchema.methods.decideClaim = async function (claimId, managerId, accept = true, note) {
    if (this.scope !== TASK_SCOPE.PUBLIC) throw new Error('Chỉ áp dụng cho task công khai.');

    const claim = this.public?.claims?.find(c => String(c._id) === String(claimId));
    if (!claim) throw new Error('Claim không tồn tại.');
    if (claim.status !== CLAIM_STATUS.PENDING) throw new Error('Claim đã được quyết định.');

    // Cập nhật thông tin claim
    claim.status = accept ? CLAIM_STATUS.ACCEPTED : CLAIM_STATUS.REJECTED;
    claim.decidedAt = new Date();
    claim.decidedBy = managerId;
    claim.note = note || claim.note; // Ưu tiên note mới của manager

    if (accept) {
        // Nếu chấp nhận, gán task cho người này
        if (this.assignee || this.public.workerId) {
            // Trường hợp hy hữu: manager duyệt 2 người cùng lúc
            claim.status = CLAIM_STATUS.REJECTED; // Từ chối claim này
            claim.note = 'Task đã bị người khác nhận trong lúc duyệt.';
            await this.save();
            throw new Error('Task đã có người nhận.');
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
 * (Method) Duyệt hoàn thành task và chia điểm.
 * Áp dụng cho cả task PROJECT và PUBLIC.
 * - Nếu là task PUBLIC:
 * 1. Chia điểm cho worker (workerSplitPoints).
 * 2. Chia điểm cho các bên liên quan (payouts).
 * 3. Tính toán điểm còn lại (projectSplitPoints).
 * 4. Nếu task này là outsource, cập nhật 'finalPoints' cho task gốc.
 *
 * @param {string} managerUserId - ID người duyệt (externalUserId).
 * @param {object} options - Tùy chọn chia điểm.
 * @param {number} [options.totalPoints=0] - Tổng điểm cuối cùng (finalPoints) cho task.
 * @param {number} [options.workerSplitPoints=0] - (PUBLIC) Điểm chia cho người làm.
 * @param {Array<object>} [options.payouts=[]] - (PUBLIC) Điểm chia cho các bên khác.
 * @returns {Promise<Document<Task>>} Task instance đã cập nhật.
 * @throws {Error} Nếu task chưa ở trạng thái chờ duyệt, hoặc tổng điểm chia vượt quá tổng điểm.
 */
TaskSchema.methods.approveCompletionWithSplit = async function (managerUserId, {
    totalPoints = 0,
    workerSplitPoints = 0,
    payouts = [] // [{userId, points}]
}) {
    // Chỉ duyệt task đang ở trạng thái chờ review
    if (this.status !== TASK_STATUS.COMPLETED_AWAIT_REVIEW) {
        throw new Error('Task chưa ở trạng thái chờ duyệt hoàn thành.');
    }

    // Cập nhật thông tin chấm điểm
    this.finalPoints = Number(totalPoints) || 0;
    this.scoredBy = managerUserId;
    this.scoredAt = new Date();
    this.status = TASK_STATUS.COMPLETED;

    // Xử lý chia điểm cho task PUBLIC
    if (this.scope === TASK_SCOPE.PUBLIC) {
        const worker = Math.max(0, Number(workerSplitPoints) || 0);
        const payoutsTotal = Array.isArray(payouts)
            ? payouts.reduce((s, p) => s + (Number(p.points) || 0), 0)
            : 0;

        // Kiểm tra tổng chia
        if (worker + payoutsTotal > this.finalPoints) {
            // Hoàn tác status để báo lỗi
            this.status = TASK_STATUS.COMPLETED_AWAIT_REVIEW;
            await this.save();
            throw new Error('Tổng điểm chia (worker + payouts) vượt quá tổng điểm task.');
        }

        // Điểm trả về dự án (nếu có)
        const projectPart = Math.max(0, this.finalPoints - worker - payoutsTotal);

        this.public.workerSplitPoints = worker;
        this.public.projectSplitPoints = projectPart;
        this.public.payouts = Array.isArray(payouts) ? payouts : [];

        // Nếu task này là outsource, cập nhật điểm 'projectPart' về cho task gốc
        const originId = this.public?.origin?.task;
        if (originId) {
            // Dùng 'this.constructor' để gọi đến Model (VD: Task)
            await this.constructor.findByIdAndUpdate(
                originId,
                {
                    finalPoints: projectPart, // Cập nhật điểm thực tế cho task gốc
                    scoredBy: managerUserId,
                    scoredAt: new Date(),
                    // Có thể cập nhật status của task gốc (VD: 'completed') nếu cần
                },
                { lean: true } // lean: true để tăng tốc độ, không cần trả về full document
            );
        }
    }

    await this.save();
    return this;
};

// Xóa model cache (nếu có) để đảm bảo schema mới được áp dụng khi HMR (Hot Module Replacement)
if (mongoose.models.Task) {
    delete mongoose.models.Task;
}

export default mongoose.model('Task', TaskSchema);