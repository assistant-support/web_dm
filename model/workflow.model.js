// @/model/workflow.model.js
/**
 * Tác dụng file: Định nghĩa Mongoose Model cho Workflow (Sơ đồ quy trình).
 * Quản lý DAG (Directed Acyclic Graph) đơn giản cho project workflow.
 * Mỗi workflow gồm nodes (task/group/milestone/decision) và edges (dependencies).
 * 
 * Tính năng:
 * - Nodes: Đại diện task, nhóm, milestone, hoặc decision point với toạ độ UI
 * - Edges: Kết nối giữa nodes với type (normal/blocker/conditional)
 * - Link với Task: Node có thể link tới task cụ thể
 * - Status tracking: Theo dõi tiến độ từng node
 * - Versioning: Hỗ trợ nhiều phiên bản workflow cho cùng một project
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db.js';

/**
 * Enum định nghĩa các loại Node trong workflow.
 */
export const WORKFLOW_NODE_TYPE = Object.freeze({
    TASK: 'task',           // Node đại diện 1 task cụ thể
    GROUP: 'group',         // Nhóm nhiệm vụ / giai đoạn
    MILESTONE: 'milestone', // Mốc quan trọng
    DECISION: 'decision',   // Điểm rẽ nhánh / quyết định
});

/**
 * Enum định nghĩa các loại Edge (kết nối) trong workflow.
 */
export const WORKFLOW_EDGE_TYPE = Object.freeze({
    NORMAL: 'normal',           // Kết nối thông thường
    BLOCKER: 'blocker',         // Phải hoàn thành trước khi tiếp tục
    CONDITIONAL: 'conditional', // Kết nối có điều kiện
});

/**
 * @typedef {Object} WorkflowNode
 * @property {string} key - Unique key trong workflow (VD: nanoid)
 * @property {string} type - Loại node (TASK/GROUP/MILESTONE/DECISION)
 * @property {string} label - Nhãn hiển thị
 * @property {string} color - Màu sắc (hex code)
 * @property {number} x - Toạ độ X để render
 * @property {number} y - Toạ độ Y để render
 * @property {mongoose.Types.ObjectId} task - Link tới Task (tùy chọn)
 * @property {string} status - Trạng thái node (pending/in_progress/completed/blocked)
 * @property {Date} completedAt - Thời điểm hoàn thành
 * @property {Map} meta - Metadata bổ sung (workType, platform, ...)
 */
const NodeSchema = new mongoose.Schema({
    // Unique key trong workflow
    key: { 
        type: String, 
        required: true,
        trim: true
    },
    
    // Loại node
    type: { 
        type: String, 
        enum: Object.values(WORKFLOW_NODE_TYPE), 
        default: WORKFLOW_NODE_TYPE.GROUP 
    },
    
    // Nhãn hiển thị
    label: { 
        type: String, 
        required: true,
        trim: true
    },
    
    // Màu sắc hiển thị (hex code)
    color: { 
        type: String,
        match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    },
    
    // Vị trí để render trên canvas
    x: { 
        type: Number, 
        default: 0 
    },
    
    y: { 
        type: Number, 
        default: 0 
    },
    
    // Liên kết Task (tùy chọn)
    task: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Task' 
    },
    
    // Status tracking cho node
    status: { 
        type: String, 
        enum: ['pending', 'in_progress', 'completed', 'blocked'], 
        default: 'pending' 
    },
    
    // Thời điểm hoàn thành
    completedAt: { 
        type: Date 
    },
    
    // Metadata bổ sung
    meta: { 
        type: Map, 
        of: mongoose.Schema.Types.Mixed, 
        default: () => new Map()
    },
}, { _id: false });

/**
 * @typedef {Object} WorkflowEdge
 * @property {string} from - Node key nguồn
 * @property {string} to - Node key đích
 * @property {string} type - Loại edge (normal/blocker/conditional)
 * @property {string} label - Nhãn kết nối (tùy chọn)
 */
const EdgeSchema = new mongoose.Schema({
    // Node nguồn (key)
    from: { 
        type: String, 
        required: true,
        trim: true
    },
    
    // Node đích (key)
    to: { 
        type: String, 
        required: true,
        trim: true
    },
    
    // Loại kết nối
    type: { 
        type: String, 
        enum: Object.values(WORKFLOW_EDGE_TYPE), 
        default: WORKFLOW_EDGE_TYPE.NORMAL 
    },
    
    // Nhãn hiển thị trên edge (tùy chọn)
    label: { 
        type: String,
        trim: true
    },
}, { _id: false });

/**
 * Schema chính cho Workflow.
 * Lưu trữ DAG đơn giản cho project workflow.
 */
const WorkflowSchema = new mongoose.Schema({
    // Project sở hữu workflow (bắt buộc)
    project: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project', 
        required: true, 
        index: true 
    },
    
    // Parent task (nếu workflow thuộc về một task cha)
    parentTask: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Task', 
        index: true 
    },
    
    // Tên workflow
    name: { 
        type: String, 
        required: true, 
        trim: true,
        index: true
    },
    
    // Phiên bản workflow (để hỗ trợ multiple versions)
    version: { 
        type: Number, 
        default: 1,
        min: 1
    },
    
    // Danh sách nodes
    nodes: { 
        type: [NodeSchema], 
        default: [] 
    },
    
    // Danh sách edges
    edges: { 
        type: [EdgeSchema], 
        default: [] 
    },
    
    // Trạng thái hoạt động (soft-delete)
    isActive: { 
        type: Boolean, 
        default: true,
        index: true
    },
}, {
    timestamps: true, // createdAt, updatedAt
    toJSON: { 
        transform: (_doc, ret) => { 
            delete ret.__v; 
        } 
    }
});

// ==================== INDEXES ====================

/**
 * Index hợp chất để tối ưu truy vấn workflow của project.
 * Ứng dụng: Lấy tất cả workflow hoạt động của một project.
 */
WorkflowSchema.index({ project: 1, isActive: 1 });

/**
 * Index để tối ưu truy vấn theo version.
 * Ứng dụng: Lấy workflow version cụ thể.
 */
WorkflowSchema.index({ project: 1, version: 1 });

// ==================== VIRTUALS ====================

/**
 * Virtual field: Số lượng nodes trong workflow.
 * @returns {number} Số lượng nodes
 */
WorkflowSchema.virtual('nodeCount').get(function () {
    return this.nodes?.length || 0;
});

/**
 * Virtual field: Số lượng edges trong workflow.
 * @returns {number} Số lượng edges
 */
WorkflowSchema.virtual('edgeCount').get(function () {
    return this.edges?.length || 0;
});

/**
 * Virtual field: Số lượng nodes đã hoàn thành.
 * @returns {number} Số node có status = 'completed'
 */
WorkflowSchema.virtual('completedNodeCount').get(function () {
    if (!this.nodes) return 0;
    return this.nodes.filter(n => n.status === 'completed').length;
});

/**
 * Virtual field: Tỷ lệ hoàn thành workflow (%).
 * @returns {number} Phần trăm hoàn thành (0-100)
 */
WorkflowSchema.virtual('completionPercentage').get(function () {
    const total = this.nodeCount;
    if (total === 0) return 0;
    const completed = this.completedNodeCount;
    return Math.round((completed / total) * 100);
});

// ==================== STATICS ====================

/**
 * Static: Tìm tất cả workflow của một project.
 * @param {string|mongoose.Types.ObjectId} projectId - Project ID
 * @param {boolean} activeOnly - Chỉ lấy workflow hoạt động (mặc định: true)
 * @returns {Promise<Workflow[]>} Danh sách workflow
 */
WorkflowSchema.statics.findByProject = async function (projectId, activeOnly = true) {
    await connectDB();
    
    const query = { project: projectId };
    if (activeOnly) {
        query.isActive = true;
    }
    
    return await this.find(query).sort({ version: -1 }).lean().exec();
};

/**
 * Static: Tìm workflow theo version.
 * @param {string|mongoose.Types.ObjectId} projectId - Project ID
 * @param {number} version - Version number
 * @returns {Promise<Workflow|null>} Workflow hoặc null
 */
WorkflowSchema.statics.findByVersion = async function (projectId, version) {
    await connectDB();
    
    return await this.findOne({ project: projectId, version }).lean().exec();
};

/**
 * Static: Tạo workflow mới với version tự động.
 * @param {object} data - Dữ liệu workflow
 * @param {string} data.project - Project ID (bắt buộc)
 * @param {string} data.name - Tên workflow (bắt buộc)
 * @returns {Promise<Workflow>} Workflow đã tạo
 * @throws {Error} Nếu thiếu thông tin bắt buộc
 */
WorkflowSchema.statics.createWorkflow = async function (data) {
    await connectDB();
    
    if (!data.project) {
        throw new Error('Project ID is required');
    }
    if (!data.name) {
        throw new Error('Workflow name is required');
    }
    
    // Tìm version cao nhất hiện tại
    const latestWorkflow = await this.findOne({ project: data.project })
        .sort({ version: -1 })
        .lean()
        .exec();
    
    const nextVersion = latestWorkflow ? latestWorkflow.version + 1 : 1;
    
    return await this.create({
        ...data,
        version: nextVersion
    });
};

// ==================== METHODS ====================

/**
 * Method: Thêm node vào workflow.
 * @param {object} nodeData - Dữ liệu node
 * @returns {Promise<Workflow>} Workflow đã cập nhật
 * @throws {Error} Nếu key đã tồn tại
 */
WorkflowSchema.methods.addNode = async function (nodeData) {
    await connectDB();
    
    if (!nodeData.key) {
        throw new Error('Node key is required');
    }
    
    const exists = this.nodes.some(n => n.key === nodeData.key);
    if (exists) {
        throw new Error(`Node with key "${nodeData.key}" already exists`);
    }
    
    this.nodes.push(nodeData);
    return await this.save();
};

/**
 * Method: Xóa node khỏi workflow.
 * @param {string} nodeKey - Node key
 * @returns {Promise<Workflow>} Workflow đã cập nhật
 * @throws {Error} Nếu node không tồn tại
 */
WorkflowSchema.methods.removeNode = async function (nodeKey) {
    await connectDB();
    
    const exists = this.nodes.some(n => n.key === nodeKey);
    if (!exists) {
        throw new Error(`Node with key "${nodeKey}" not found`);
    }
    
    // Xóa node
    this.nodes = this.nodes.filter(n => n.key !== nodeKey);
    
    // Xóa tất cả edges liên quan
    this.edges = this.edges.filter(e => e.from !== nodeKey && e.to !== nodeKey);
    
    return await this.save();
};

/**
 * Method: Thêm edge vào workflow.
 * @param {object} edgeData - Dữ liệu edge
 * @returns {Promise<Workflow>} Workflow đã cập nhật
 * @throws {Error} Nếu from/to node không tồn tại
 */
WorkflowSchema.methods.addEdge = async function (edgeData) {
    await connectDB();
    
    if (!edgeData.from || !edgeData.to) {
        throw new Error('Edge must have from and to nodes');
    }
    
    const fromExists = this.nodes.some(n => n.key === edgeData.from);
    const toExists = this.nodes.some(n => n.key === edgeData.to);
    
    if (!fromExists || !toExists) {
        throw new Error('Both from and to nodes must exist');
    }
    
    this.edges.push(edgeData);
    return await this.save();
};

/**
 * Method: Xóa edge khỏi workflow.
 * @param {string} fromKey - From node key
 * @param {string} toKey - To node key
 * @returns {Promise<Workflow>} Workflow đã cập nhật
 */
WorkflowSchema.methods.removeEdge = async function (fromKey, toKey) {
    await connectDB();
    
    this.edges = this.edges.filter(
        e => !(e.from === fromKey && e.to === toKey)
    );
    
    return await this.save();
};

/**
 * Method: Cập nhật status của một node.
 * @param {string} nodeKey - Node key
 * @param {string} newStatus - New status
 * @returns {Promise<Workflow>} Workflow đã cập nhật
 * @throws {Error} Nếu node không tồn tại
 */
WorkflowSchema.methods.updateNodeStatus = async function (nodeKey, newStatus) {
    await connectDB();
    
    const node = this.nodes.find(n => n.key === nodeKey);
    if (!node) {
        throw new Error(`Node with key "${nodeKey}" not found`);
    }
    
    node.status = newStatus;
    
    if (newStatus === 'completed' && !node.completedAt) {
        node.completedAt = new Date();
    }
    
    return await this.save();
};

/**
 * Method: Deactivate workflow (soft delete).
 * @returns {Promise<Workflow>} Workflow đã cập nhật
 */
WorkflowSchema.methods.deactivate = async function () {
    await connectDB();
    
    this.isActive = false;
    return await this.save();
};

// ==================== MIDDLEWARE ====================

/**
 * Pre-save middleware: Validate không có duplicate node keys.
 */
WorkflowSchema.pre('save', function (next) {
    if (this.nodes && this.nodes.length > 0) {
        const keys = this.nodes.map(n => n.key);
        const uniqueKeys = [...new Set(keys)];
        
        if (keys.length !== uniqueKeys.length) {
            return next(new Error('Duplicate node keys detected'));
        }
    }
    next();
});

/**
 * Pre-save middleware: Validate edges reference existing nodes.
 */
WorkflowSchema.pre('save', function (next) {
    if (this.edges && this.edges.length > 0 && this.nodes) {
        const nodeKeys = this.nodes.map(n => n.key);
        
        for (const edge of this.edges) {
            if (!nodeKeys.includes(edge.from) || !nodeKeys.includes(edge.to)) {
                return next(new Error('Edge references non-existent node'));
            }
        }
    }
    next();
});

// ==================== MODEL EXPORT ====================

/**
 * Xóa model cũ khỏi cache để tránh lỗi HMR trong Next.js development.
 */
if (mongoose.models.Workflow) {
    delete mongoose.models.Workflow;
    delete mongoose.connection.models.Workflow;
}

/**
 * Export Workflow Model.
 * Model này quản lý DAG workflow cho project với nodes và edges.
 */
export default mongoose.model('Workflow', WorkflowSchema);
