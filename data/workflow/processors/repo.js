// /data/workflow/processors/repo.js
// Cấu trúc: /data/workflow/processors/*
// Mục đích: Repository thuần (KHÔNG 'use server') thao tác Workflow + logic unlock blockers.
// - createWorkflow / updateWorkflow / attachTask / activateWorkflow / deactivateWorkflow / getByProject
// - markNodeCompletedByTask: gọi từ task actions sau approve completion
// Trả về PlainWorkflow qua asPlainWorkflow; không trả Mongoose raw.

import mongoose from 'mongoose';
import Workflow from '@/model/workflow.model.js';
import { asPlainWorkflow } from '@/lib/serialize.js';
import { AppError } from '@/lib/errors.js';

const O = (v) => new mongoose.Types.ObjectId(String(v));

/** Kiểm tra mảng nodes có key trùng lặp hay không */
function ensureUniqueNodeKeys(nodes) {
    const set = new Set();
    for (const n of nodes) {
        if (set.has(n.key)) return false;
        set.add(n.key);
    }
    return true;
}

/** Xác thực edges: from/to tồn tại & không self-loop */
function validateEdges(nodes, edges = []) {
    const keySet = new Set(nodes.map((n) => n.key));
    for (const e of edges || []) {
        if (!keySet.has(e.from) || !keySet.has(e.to)) {
            return { ok: false, reason: 'EDGE_REF_INVALID' };
        }
        if (e.from === e.to) {
            return { ok: false, reason: 'EDGE_SELF_LOOP' };
        }
    }
    return { ok: true };
}

/** Tính incoming blocker count cho từng node */
function computeIncomingBlockersMap(nodes, edges = []) {
    const incoming = new Map(nodes.map((n) => [n.key, 0]));
    for (const e of edges || []) {
        if (e.rule === 'BLOCKER') {
            incoming.set(e.to, (incoming.get(e.to) || 0) + 1);
        }
    }
    return incoming;
}

/**
 * Chuẩn hoá status ban đầu:
 * - Node chưa completed:
 *   + incoming BLOCKER = 0 => 'unlocked'
 *   + ngược lại => 'locked'
 * - Giữ nguyên 'completed'
 */
function normalizeStatuses(nodes, edges) {
    const incoming = computeIncomingBlockersMap(nodes, edges);
    return nodes.map((n) => {
        if (n.status === 'completed') return n;
        const inc = incoming.get(n.key) || 0;
        const base = inc === 0 ? 'unlocked' : 'locked';
        return { ...n, status: n.status ?? base };
    });
}

/** Lấy node theo key (tham chiếu) */
function getNodeByKey(doc, key) {
    return (doc.nodes || []).find((n) => n.key === key) || null;
}

/** Kiểm tra tất cả blockers vào node đã completed hay chưa */
function allBlockersCompleted(doc, nodeKey) {
    const incoming = (doc.edges || []).filter((e) => e.rule === 'BLOCKER' && e.to === nodeKey);
    if (!incoming.length) return true;
    return incoming.every((e) => getNodeByKey(doc, e.from)?.status === 'completed');
}

/** Tìm các node có outgoing từ key với rule=BLOCKER */
function getBlockeeKeys(doc, fromKey) {
    return (doc.edges || [])
        .filter((e) => e.rule === 'BLOCKER' && e.from === fromKey)
        .map((e) => e.to);
}

/** Plain hoá doc workflow */
function toPlain(doc) {
    return asPlainWorkflow(doc);
}

/** Map lỗi validateEdges → AppError nhất quán UI */
function raiseEdgeError(reason) {
    if (reason === 'EDGE_REF_INVALID') {
        throw new AppError('VALIDATION', {
            issues: [{ field: 'edges', message: 'Edge from/to không hợp lệ' }],
        });
    }
    if (reason === 'EDGE_SELF_LOOP') {
        throw new AppError('VALIDATION', {
            issues: [{ field: 'edges', message: 'Edge không được from==to' }],
        });
    }
    // Fallback
    throw new AppError('VALIDATION', {
        issues: [{ field: 'edges', message: 'Edge không hợp lệ' }],
    });
}

/**
 * createWorkflow
 * - Validate keys/edges
 * - Normalize status theo blockers
 */
export async function createWorkflow({ projectId, name, description, nodes, edges = [], active = false }) {
    if (!ensureUniqueNodeKeys(nodes)) {
        throw new AppError('VALIDATION', {
            issues: [{ field: 'nodes', message: 'Trùng node.key' }],
        });
    }
    const vEdges = validateEdges(nodes, edges);
    if (!vEdges.ok) raiseEdgeError(vEdges.reason);

    const normalized = normalizeStatuses(nodes, edges);
    const created = await Workflow.create({
        project: O(projectId),
        name,
        description: description || '',
        nodes: normalized.map((n) => ({
            key: n.key,
            title: n.title,
            type: n.type,
            taskId: n.taskId ? O(n.taskId) : null,
            status: n.status,
            meta: n.meta || undefined,
        })),
        edges: (edges || []).map((e) => ({ from: e.from, to: e.to, rule: e.rule })),
        active: !!active,
    });

    return toPlain(created);
}

/**
 * updateWorkflow
 * - Cho phép sửa name/description/nodes/edges/active
 * - Recompute status cho nodes chưa completed
 */
export async function updateWorkflow({ workflowId, patch }) {
    const wf = await Workflow.findById(workflowId);
    if (!wf) throw new AppError('NOT_FOUND', { status: 404 });

    // tên/mô tả/active
    if (patch.name != null) wf.name = patch.name;
    if (patch.description != null) wf.description = patch.description;
    if (typeof patch.active === 'boolean') wf.active = patch.active;

    // nodes/edges
    if (patch.nodes) {
        if (!ensureUniqueNodeKeys(patch.nodes)) {
            throw new AppError('VALIDATION', {
                issues: [{ field: 'nodes', message: 'Trùng node.key' }],
            });
        }
        wf.nodes = patch.nodes.map((n) => ({
            key: n.key,
            title: n.title,
            type: n.type,
            taskId: n.taskId ? O(n.taskId) : null,
            status: n.status, // sẽ chuẩn hoá bên dưới
            meta: n.meta || undefined,
        }));
    }
    if (patch.edges) {
        wf.edges = patch.edges.map((e) => ({ from: e.from, to: e.to, rule: e.rule }));
    }

    // Validate edges trỏ tới nodes hợp lệ
    const vEdges = validateEdges(wf.nodes, wf.edges);
    if (!vEdges.ok) raiseEdgeError(vEdges.reason);

    // Recompute status cơ bản cho nodes chưa completed
    wf.nodes = normalizeStatuses(
        wf.nodes.map((n) => (n.status === 'completed' ? n : { ...n, status: undefined })),
        wf.edges
    );

    await wf.save();
    return toPlain(wf);
}

/**
 * attachTask
 * - Gán taskId cho node type='task' và chưa completed
 */
export async function attachTask({ workflowId, nodeKey, taskId }) {
    const wf = await Workflow.findById(workflowId);
    if (!wf) throw new AppError('NOT_FOUND', { status: 404 });

    const node = getNodeByKey(wf, nodeKey);
    if (!node) throw new AppError('BAD_REQUEST', { status: 400 });
    if (node.type !== 'task') throw new AppError('BAD_REQUEST', { status: 400 });
    if (node.status === 'completed') throw new AppError('BAD_REQUEST', { status: 400 });

    node.taskId = O(taskId);
    await wf.save();
    return toPlain(wf);
}

/** Toggle active=true + (tuỳ chọn) recompute status cho nodes chưa completed */
export async function activateWorkflow(workflowId) {
    const wf = await Workflow.findById(workflowId);
    if (!wf) throw new AppError('NOT_FOUND', { status: 404 });

    wf.active = true;
    // Recompute cho nodes chưa completed để đồng bộ nếu có thay đổi khi inactive
    wf.nodes = normalizeStatuses(
        wf.nodes.map((n) => (n.status === 'completed' ? n : { ...n, status: undefined })),
        wf.edges
    );

    await wf.save();
    return toPlain(wf);
}

/** Toggle active=false */
export async function deactivateWorkflow(workflowId) {
    const wf = await Workflow.findByIdAndUpdate(
        workflowId,
        { $set: { active: false } },
        { new: true }
    );
    if (!wf) throw new AppError('NOT_FOUND', { status: 404 });
    return toPlain(wf);
}

/** Lấy danh sách theo project */
export async function getByProject(projectId) {
    const items = await Workflow.find({ project: O(projectId) }).lean();
    return items.map(toPlain);
}

/**
 * markNodeCompletedByTask({ taskId })
 * - Tìm mọi workflow active có node.taskId = taskId
 * - Đặt node.status='completed' (idempotent)
 * - Với mỗi outgoing BLOCKER, nếu tất cả incoming BLOCKER của 'to' đã completed → unlock 'to'
 * - Trả mảng kết quả [{ workflowId, projectId, completedNodeKey, unlockedKeys: [] }]
 */
export async function markNodeCompletedByTask({ taskId }) {
    const tid = O(taskId);
    const workflows = await Workflow.find({ active: true, 'nodes.taskId': tid });
    if (!workflows?.length) return [];

    const results = [];
    for (const wf of workflows) {
        const node = (wf.nodes || []).find((n) => String(n.taskId) === String(tid));
        if (!node) continue;

        const completedNodeKey = node.key;
        let changed = false;

        if (node.status !== 'completed') {
            node.status = 'completed';
            changed = true;
        }

        const candidates = getBlockeeKeys(wf, completedNodeKey);
        const unlocked = [];
        for (const key of candidates) {
            const toNode = getNodeByKey(wf, key);
            if (!toNode) continue;
            if (toNode.status === 'completed') continue; // không downgrade
            const ready = allBlockersCompleted(wf, key);
            if (ready && toNode.status !== 'unlocked') {
                toNode.status = 'unlocked';
                unlocked.push(key);
                changed = true;
            }
        }

        if (changed) await wf.save();

        results.push({
            workflowId: String(wf._id),
            projectId: String(wf.project),
            completedNodeKey,
            unlockedKeys: unlocked,
        });
    }
    return results;
}
