// MỤC ĐÍCH: Lưu sơ đồ workflow của 1 Project (đồ thị DAG đơn giản).
// - Node: có loại, label, toạ độ, màu, optional link tới Task.
// - Edge: nối 2 node (có type: normal/blocker/conditional).
// - 1 Project có thể có nhiều workflow (phiên bản/kịch bản khác nhau).

import mongoose from 'mongoose';

export const WORKFLOW_NODE_TYPE = Object.freeze({
    TASK: 'task',          // nút đại diện 1 task cụ thể
    GROUP: 'group',        // nhóm nhiệm vụ / giai đoạn
    MILESTONE: 'milestone',
    DECISION: 'decision',  // điểm rẽ nhánh
});

export const WORKFLOW_EDGE_TYPE = Object.freeze({
    NORMAL: 'normal',
    BLOCKER: 'blocker',
    CONDITIONAL: 'conditional',
});

const NodeSchema = new mongoose.Schema({
    key: { type: String, required: true },      // unique trong workflow (client có thể dùng nanoid)
    type: { type: String, enum: Object.values(WORKFLOW_NODE_TYPE), default: 'group' },
    label: { type: String, required: true },
    color: { type: String },
    x: { type: Number, default: 0 },            // vị trí để render
    y: { type: Number, default: 0 },
    // liên kết Task (tuỳ chọn)
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    // metadata thêm (workType/platform…)
    meta: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const EdgeSchema = new mongoose.Schema({
    from: { type: String, required: true },     // node.key
    to: { type: String, required: true },     // node.key
    type: { type: String, enum: Object.values(WORKFLOW_EDGE_TYPE), default: 'normal' },
    label: { type: String },
}, { _id: false });

const WorkflowSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true, trim: true },
    version: { type: Number, default: 1 },
    nodes: { type: [NodeSchema], default: [] },
    edges: { type: [EdgeSchema], default: [] },
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
    toJSON: { transform: (_d, r) => { delete r.__v; } }
});

WorkflowSchema.index({ project: 1, isActive: 1 });

export default mongoose.models.Workflow || mongoose.model('Workflow', WorkflowSchema);
