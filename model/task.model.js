// cấu trúc thư mục hiện tại: /model/task.model.js
// Tác dụng file: Định nghĩa Mongoose Schema/Model cho Task (kiểu ClickUp).
// - Giữ nguyên dữ liệu cũ (externalUserId là String) và toàn bộ methods/statics cũ.
// - ĐÃ bổ sung các trường B0: listOrder, kanbanOrder, remindAt, reminderSent + index tối ưu.
// - Dùng trong toàn bộ luồng: nội bộ Project, Public board, claim/review/split điểm.

import mongoose from 'mongoose';
import {
    TASK_STATUS, PRIORITY, APPROVAL_STATUS,
    TASK_SCOPE, CLAIM_MODE, CLAIM_STATUS
} from '@/model/common/enums.js';

const DocsMetaSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    driveFolderId: { type: String, index: true },
    driveFolderName: { type: String },
}, { _id: false });

// Claim info cho chế độ PUBLIC (lưu lịch sử người dùng claim)
const ClaimSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },     // external user id
    status: { type: String, enum: Object.values(CLAIM_STATUS), default: CLAIM_STATUS.PENDING },
    appliedAt: { type: Date, default: () => new Date() },
    decidedAt: { type: Date },
    decidedBy: { type: String },                                // manager (external user id)
    note: { type: String },
}, { _id: true });

// Thông tin công khai (public board)
const PublicMetaSchema = new mongoose.Schema({
    published: { type: Boolean, default: false },               // có đang đăng công khai không
    postedBy: { type: String, index: true },                    // external user id
    claimMode: { type: String, enum: Object.values(CLAIM_MODE), default: CLAIM_MODE.AUTO },
    requiredPoints: { type: Number, default: 0, min: 0 },       // mức điểm đề nghị

    claims: { type: [ClaimSchema], default: [] },               // danh sách claim

    workerId: { type: String, index: true },                    // người làm đã được nhận

    workerSplitPoints: { type: Number, default: 0, min: 0 },    // điểm cho người làm
    projectSplitPoints: { type: Number, default: 0, min: 0 },   // điểm trả về task gốc của dự án

    payouts: [{
        _id: false,
        userId: { type: String, required: true },                 // external user id
        points: { type: Number, required: true, min: 0 }
    }],

    origin: {
        project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
        task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', index: true },
    },
}, { _id: false });

// Đánh dấu task dự án đã "đẩy ra" public
const OutsourceLinkSchema = new mongoose.Schema({
    isOutsourced: { type: Boolean, default: false },
    publicTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', index: true },
}, { _id: false });

const TaskSchema = new mongoose.Schema({
    // ====== PHẠM VI ======
    scope: { type: String, enum: Object.values(TASK_SCOPE), default: TASK_SCOPE.PROJECT, index: true },

    // ====== QUAN HỆ DỰ ÁN ======
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true, required: false },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true, required: false },

    parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', index: true, default: null },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    // Dùng externalUserId (String) theo kiến trúc Auth 2.0
    createdBy: { type: String, required: true, index: true },
    assignee: { type: String, index: true },
    watchers: [{ type: String, index: true }],

    // Collaborators: người được mời vào task (không cần là member project)
    collaborators: [{
        _id: false,
        userId: { type: String, required: true, index: true }, // externalUserId
        invitedBy: { type: String, required: true },
        invitedAt: { type: Date, default: () => new Date() },
        acceptedAt: { type: Date },
        role: { type: String, enum: ['contributor', 'reviewer'], default: 'contributor' }
    }],

    // Liên kết danh mục
    workType: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkType', index: true },
    platforms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Platform', index: true }],

    priority: { type: String, enum: Object.values(PRIORITY), default: PRIORITY.NORMAL },
    tags: { type: [String], default: [], index: true },

    status: { type: String, enum: Object.values(TASK_STATUS), default: TASK_STATUS.DRAFT, index: true },

    approval: {
        required: { type: Boolean, default: false },
        status: { type: String, enum: Object.values(APPROVAL_STATUS), default: APPROVAL_STATUS.NONE },
        by: { type: String },
        at: { type: Date },
        note: { type: String }
    },

    assigneeConfirm: {
        required: { type: Boolean, default: false },
        confirmedBy: { type: String },
        confirmedAt: { type: Date },
    },

    workflowNodeKey: { type: String, index: true },

    plannedStartAt: Date,
    plannedDueAt: Date,

    startedAt: Date,
    completedAt: Date,
    trackedDurationSec: { type: Number, default: 0 },

    initialPoints: { type: Number, default: 0, min: 0 },
    finalPoints: { type: Number, default: 0, min: 0 },
    scoredBy: { type: String },
    scoredAt: { type: Date },

    autoBypassForSubtask: { type: Boolean, default: false },

    // Progress tracking (auto-calculate từ subtasks)
    progress: {
        _id: false,
        total: { type: Number, default: 0 },
        completed: { type: Number, default: 0 },
        inProgress: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 }, // 0-100
    },

    // Point distribution cho các subtasks
    subtaskPointsDistribution: [{
        _id: false,
        subtaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
        assignedPoints: { type: Number, default: 0, min: 0 },
    }],

    // Workflow reference
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', index: true },

    checklist: [{
        _id: false,
        cid: { type: String, required: true },
        content: { type: String, required: true },
        done: { type: Boolean, default: false },
        doneAt: Date
    }],

    custom: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },

    // Tài liệu (Drive)
    docs: { type: DocsMetaSchema, default: () => ({ enabled: false }) },

    commentsCount: { type: Number, default: 0 },
    attachmentsCount: { type: Number, default: 0 },

    deletedAt: { type: Date, default: null },

    // Công khai & outsource
    public: { type: PublicMetaSchema, default: undefined },
    outsource: { type: OutsourceLinkSchema, default: undefined },

    // ====== BỔ SUNG B0 ======
    listOrder: { type: Number, default: 0, index: true },       // sort List
    kanbanOrder: { type: Number, default: 0, index: true },     // sort Kanban
    remindAt: { type: Date },                                   // thời điểm nhắc
    reminderSent: { type: Boolean, default: false },            // đã gửi nhắc chưa
}, {
    timestamps: true,
    toJSON: { transform: (_d, r) => { delete r.__v; } }
});

// ===== Virtuals =====
/** Virtual: task có phải là subtask hay không */
TaskSchema.virtual('isSubtask').get(function () { return !!this.parentTask; });

// ===== Indexes (GIỮ CŨ, THÊM MỚI) =====
TaskSchema.index({ scope: 1, 'public.published': 1, priority: 1, createdAt: -1 });
TaskSchema.index({ 'public.workerId': 1, status: 1 });
TaskSchema.index({ deletedAt: 1 }, { partialFilterExpression: { deletedAt: { $type: 'null' } } });

// New B0+: text search, collaborators, workflow
TaskSchema.index({ title: 'text', description: 'text' });
TaskSchema.index({ 'collaborators.userId': 1, deletedAt: 1 });
TaskSchema.index({ workflowId: 1 });

// New: sắp xếp/nhắc hạn
TaskSchema.index({ project: 1, status: 1, kanbanOrder: 1 });
TaskSchema.index({ project: 1, listOrder: 1 });
TaskSchema.index({ parentTask: 1, listOrder: 1 });
TaskSchema.index({ remindAt: 1, reminderSent: 1 }, { partialFilterExpression: { reminderSent: false, deletedAt: null } });

// ===== Methods & Statics (GIỮ NGUYÊN hành vi) =====

/**
 * static createPublicTask(payload)
 * - Tạo task PUBLIC mới (không thuộc project).
 */
TaskSchema.statics.createPublicTask = async function (payload) {
    const Task = this;
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
 * instance publishPublic()
 * - Publish task PUBLIC (bắt buộc scope=public).
 */
TaskSchema.methods.publishPublic = async function () {
    if (this.scope !== TASK_SCOPE.PUBLIC) throw new Error('Chỉ task công khai mới publish.');
    this.public.published = true;
    this.status = TASK_STATUS.DRAFT;
    await this.save();
    return this;
};

/**
 * instance unpublishPublic()
 * - Gỡ publish task PUBLIC.
 */
TaskSchema.methods.unpublishPublic = async function () {
    if (this.scope !== TASK_SCOPE.PUBLIC) throw new Error('Chỉ task công khai mới unpublish.');
    this.public.published = false;
    await this.save();
    return this;
};

/**
 * instance claimPublic(userId, note)
 * - Người dùng claim task PUBLIC (AUTO thì nhận ngay; REVIEW thì vào hàng đợi).
 */
TaskSchema.methods.claimPublic = async function (userId, note) {
    if (this.scope !== TASK_SCOPE.PUBLIC || !this.public?.published) {
        throw new Error('Task chưa công khai.');
    }
    if (this.assignee || this.public.workerId) {
        throw new Error('Task đã có người nhận.');
    }

    if (this.public.claimMode === CLAIM_MODE.AUTO) {
        this.public.workerId = userId;
        this.assignee = userId;
        this.startedAt = new Date();
        this.status = TASK_STATUS.IN_PROGRESS;
        this.public.claims.push({ userId, status: CLAIM_STATUS.ACCEPTED, decidedAt: new Date(), note });
    } else {
        this.public.claims.push({ userId, status: CLAIM_STATUS.PENDING, note });
    }

    await this.save();
    return this;
};

/**
 * instance decideClaim(claimId, managerId, accept, note)
 * - Manager quyết định claim PENDING (ACCEPT/REJECT).
 */
TaskSchema.methods.decideClaim = async function (claimId, managerId, accept = true, note) {
    if (this.scope !== TASK_SCOPE.PUBLIC) throw new Error('Chỉ áp dụng cho task công khai.');
    const claim = this.public?.claims?.find(c => String(c._id) === String(claimId));
    if (!claim) throw new Error('Claim không tồn tại.');
    if (claim.status !== CLAIM_STATUS.PENDING) throw new Error('Claim đã được quyết định.');

    claim.status = accept ? CLAIM_STATUS.ACCEPTED : CLAIM_STATUS.REJECTED;
    claim.decidedAt = new Date();
    claim.decidedBy = managerId;
    claim.note = note || claim.note;

    if (accept) {
        if (this.assignee || this.public.workerId) throw new Error('Task đã có người nhận.');
        this.public.workerId = claim.userId;
        this.assignee = claim.userId;
        this.status = TASK_STATUS.IN_PROGRESS;
        this.startedAt = new Date();
    }

    await this.save();
    return this;
};

/**
 * static publishFromProjectTask(originalTaskId, options)
 * - Chuyển task PROJECT ra PUBLIC (tạo bản sao và link outsource).
 */
TaskSchema.statics.publishFromProjectTask = async function (originalTaskId, {
    postedBy, claimMode = CLAIM_MODE.AUTO, requiredPoints = 0, docsEnabled = false
}) {
    const Task = this;
    const original = await Task.findById(originalTaskId);
    if (!original) throw new Error('Task gốc không tồn tại.');
    if (original.scope !== TASK_SCOPE.PROJECT) throw new Error('Chỉ chuyển từ task dự án.');

    const pub = await Task.create({
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

    original.outsource = { isOutsourced: true, publicTask: pub._id };
    await original.save();

    return pub;
};

/**
 * instance approveCompletionWithSplit(managerUserId, { totalPoints, workerSplitPoints, payouts })
 * - Duyệt hoàn tất và chia điểm (PUBLIC có cập nhật chia & link về task gốc nếu có).
 */
TaskSchema.methods.approveCompletionWithSplit = async function (managerUserId, {
    totalPoints = 0,
    workerSplitPoints = 0,
    payouts = [] // [{userId, points}]
}) {
    if (this.status !== TASK_STATUS.COMPLETED_AWAIT_REVIEW) {
        throw new Error('Task chưa ở trạng thái chờ duyệt hoàn thành.');
    }

    this.finalPoints = Number(totalPoints) || 0;
    this.scoredBy = managerUserId;
    this.scoredAt = new Date();
    this.status = TASK_STATUS.COMPLETED;

    if (this.scope === TASK_SCOPE.PUBLIC) {
        const worker = Math.max(0, Number(workerSplitPoints) || 0);
        const payoutsTotal = Array.isArray(payouts) ? payouts.reduce((s, p) => s + (Number(p.points) || 0), 0) : 0;
        if (worker + payoutsTotal > this.finalPoints) {
            throw new Error('Tổng điểm chia vượt quá tổng điểm.');
        }
        const projectPart = Math.max(0, this.finalPoints - worker - payoutsTotal);

        this.public.workerSplitPoints = worker;
        this.public.projectSplitPoints = projectPart;
        this.public.payouts = Array.isArray(payouts) ? payouts : [];

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

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
