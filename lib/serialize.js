// /lib/serialize.js
// Mục đích: Chuyển Mongo/Mongoose docs thành Plain JSON an toàn cho Client Components.
// - Chuẩn hoá ObjectId → string, Date → ISO string, Map → plain object.
// - Dùng trong server actions để tránh lỗi: “Only plain objects can be passed to Client Components...”.
// - Bổ sung asPlainComment cho model /model/comment.model.js hiện hữu (task-only).

/** @returns {string|null} */
export function toPlainId(v) {
    if (v == null) return null;
    try {
        return String(v);
    } catch {
        return v?.toString?.() ?? null;
    }
}

/** @returns {string|null} ISO8601 or null */
export function toPlainDate(v) {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Map -> object; passthrough others */
export function toPlainMap(m) {
    if (!m) return undefined;
    if (m instanceof Map) return Object.fromEntries(m);
    return m;
}

/** Chuẩn hoá Task doc (an toàn cho client) */
export function asPlainTask(doc) {
    if (!doc) return null;
    return {
        _id: toPlainId(doc._id),
        project: toPlainId(doc.project),
        projectName: doc.project?.name || doc.projectName || null, // Support both populated and plain
        parentTask: toPlainId(doc.parentTask),
        team: toPlainId(doc.team),
        scope: doc.scope,
        title: doc.title,
        description: doc.description ?? '',
        createdBy: doc.createdBy ?? null,
        assignee: doc.assignee ?? null,
        watchers: Array.isArray(doc.watchers) ? doc.watchers.map(String) : [],
        workType: doc.workType ?? null, // Mã loại công việc (string)
        platforms: Array.isArray(doc.platforms) ? doc.platforms.map(toPlainId) : [],
        priority: doc.priority ?? null,
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        status: doc.status,
        approval: doc.approval
            ? {
                required: !!doc.approval.required,
                status: doc.approval.status ?? 'none',
                by: doc.approval.by ?? null,
                at: toPlainDate(doc.approval.at),
                note: doc.approval.note ?? undefined,
            }
            : undefined,
        assigneeConfirm: doc.assigneeConfirm
            ? {
                required: !!doc.assigneeConfirm.required,
                confirmedBy: doc.assigneeConfirm.confirmedBy ?? null,
                confirmedAt: toPlainDate(doc.assigneeConfirm.confirmedAt),
            }
            : undefined,
        workflowNodeKey: doc.workflowNodeKey ?? null,
        plannedStartAt: toPlainDate(doc.plannedStartAt),
        plannedDueAt: toPlainDate(doc.plannedDueAt),
        startedAt: toPlainDate(doc.startedAt),
        completedAt: toPlainDate(doc.completedAt),
        trackedDurationSec: doc.trackedDurationSec ?? 0,
        initialPoints: doc.initialPoints ?? 0,
        finalPoints: doc.finalPoints ?? 0,
        scoredBy: doc.scoredBy ?? null,
        scoredAt: toPlainDate(doc.scoredAt),
        
        // Computed fields for points display logic
        displayPoints: (() => {
            // 1. If finalized, use finalPoints
            if ((doc.status === 'completed' || doc.status === 'closed') && doc.finalPoints > 0) {
                return doc.finalPoints;
            }
            
            // 2. If parent task with distribution, show remaining points
            const distributedPoints = Array.isArray(doc.subtaskPointsDistribution)
                ? doc.subtaskPointsDistribution.reduce((sum, item) => sum + (item.assignedPoints || 0), 0)
                : 0;
            
            if (distributedPoints > 0) {
                const initial = doc.initialPoints || 0;
                return Math.max(0, initial - distributedPoints);
            }

            // 3. Default to initialPoints
            return doc.initialPoints || 0;
        })(),
        isPointsFinalized: (doc.status === 'completed' || doc.status === 'closed') && doc.finalPoints > 0,
        autoBypassForSubtask: !!doc.autoBypassForSubtask,
        checklist: Array.isArray(doc.checklist)
            ? doc.checklist.map((i) => ({
                cid: i.cid,
                content: i.content,
                done: !!i.done,
                doneAt: toPlainDate(i.doneAt),
            }))
            : [],
        custom: doc.custom ? toPlainMap(doc.custom) : undefined,
        docs: doc.docs
            ? {
                enabled: !!doc.docs.enabled,
                driveFolderId: doc.docs.driveFolderId ?? null,
                driveFolderName: doc.docs.driveFolderName ?? null,
            }
            : undefined,
        commentsCount: doc.commentsCount ?? 0,
        attachmentsCount: doc.attachmentsCount ?? 0,
        deletedAt: toPlainDate(doc.deletedAt),
        listOrder: doc.listOrder ?? 0,
        kanbanOrder: doc.kanbanOrder ?? 0,
        remindAt: toPlainDate(doc.remindAt),
        reminderSent: !!doc.reminderSent,
        
        // NEW: Collaborators, Progress, Point distribution, Workflow
        collaborators: Array.isArray(doc.collaborators) 
            ? doc.collaborators.map(c => ({
                userId: String(c.userId),
                invitedBy: String(c.invitedBy),
                invitedAt: toPlainDate(c.invitedAt),
                acceptedAt: toPlainDate(c.acceptedAt),
                role: c.role || 'contributor',
            }))
            : [],
        
        progress: doc.progress ? {
            total: doc.subtaskCount ?? doc.progress.total ?? 0, // Ưu tiên subtaskCount từ aggregation
            completed: doc.progress.completed || 0,
            inProgress: doc.progress.inProgress || 0,
            percentage: doc.progress.percentage || 0,
        } : { 
            total: doc.subtaskCount ?? 0, // Sử dụng subtaskCount nếu không có progress
            completed: 0, 
            inProgress: 0, 
            percentage: 0 
        },
        
        subtaskPointsDistribution: Array.isArray(doc.subtaskPointsDistribution)
            ? doc.subtaskPointsDistribution.map(d => ({
                subtaskId: toPlainId(d.subtaskId),
                assignedPoints: d.assignedPoints || 0,
            }))
            : [],
        
        workflowId: toPlainId(doc.workflowId),
        
        createdAt: toPlainDate(doc.createdAt),
        updatedAt: toPlainDate(doc.updatedAt),
    };
}

/** Chuẩn hoá Attachment doc (an toàn cho client) — bám theo model hiện tại của bạn */
export function asPlainAttachment(doc) {
    if (!doc) return null;
    return {
        id: toPlainId(doc._id),
        project: toPlainId(doc.project),
        task: toPlainId(doc.task),
        createdBy: doc.author ? String(doc.author) : null,
        lastModifiedBy: doc.lastModifiedBy ? String(doc.lastModifiedBy) : null,
        deletedBy: doc.deletedBy ? String(doc.deletedBy) : null,
        storage: doc.storage ?? 'google_drive',
        driveFileId: doc.driveFileId ?? null,
        driveFolderId: doc.driveFolderId ?? null,
        name: doc.driveName ?? null,
        mime: doc.mimeType ?? null,
        size: typeof doc.size === 'number' ? doc.size : null,
        webViewLink: doc.webViewLink ?? null,
        webContentLink: doc.webContentLink ?? null,
        kind: doc.kind ?? 'other',
        label: doc.label ?? null,
        deletedAt: toPlainDate(doc.deletedAt),
        createdAt: toPlainDate(doc.createdAt),
        updatedAt: toPlainDate(doc.updatedAt),
        publicToken: doc.publicToken ?? null,
    };
}

/** Chuẩn hoá Comment doc (task-only: /model/comment.model.js) */
export function asPlainComment(doc) {
    if (!doc) return null;
    return {
        id: toPlainId(doc._id),
        task: toPlainId(doc.task),
        author: doc.author ? String(doc.author) : null, // externalUserId
        body: doc.body ?? '',
        mentions: Array.isArray(doc.mentions) ? doc.mentions.map(String) : [],
        createdAt: toPlainDate(doc.createdAt),
        updatedAt: toPlainDate(doc.updatedAt),
    };
}

/** Chuẩn hoá Team doc */
export function asPlainTeam(doc) {
    if (!doc) return null;
    const plainId = toPlainId(doc._id);
    return {
        _id: plainId,
        id: plainId, // Alias for REST API compatibility
        name: doc.name ?? '',
        description: doc.description ?? '',
        members: Array.isArray(doc.members)
            ? doc.members.map((m) => ({
                  userId: String(m.userId),
                  role: m.role,
                  createdAt: toPlainDate(m.createdAt),
                  updatedAt: toPlainDate(m.updatedAt),
              }))
            : [],
        isActive: doc.isActive ?? true,
        createdAt: toPlainDate(doc.createdAt),
        updatedAt: toPlainDate(doc.updatedAt),
    };
}

/** Chuẩn hoá Workflow doc */
export function asPlainWorkflow(doc) {
    if (!doc) return null;
    return {
        _id: toPlainId(doc._id),
        project: toPlainId(doc.project),
        parentTask: toPlainId(doc.parentTask),
        name: doc.name ?? '',
        version: doc.version ?? 1,
        nodes: Array.isArray(doc.nodes)
            ? doc.nodes.map(n => ({
                key: n.key,
                type: n.type,
                label: n.label,
                color: n.color ?? null,
                x: n.x ?? 0,
                y: n.y ?? 0,
                task: toPlainId(n.task),
                status: n.status ?? 'pending',
                completedAt: toPlainDate(n.completedAt),
                meta: n.meta ? toPlainMap(n.meta) : {},
            }))
            : [],
        edges: Array.isArray(doc.edges)
            ? doc.edges.map(e => ({
                from: e.from,
                to: e.to,
                type: e.type ?? 'normal',
                label: e.label ?? null,
            }))
            : [],
        isActive: doc.isActive ?? true,
        createdAt: toPlainDate(doc.createdAt),
        updatedAt: toPlainDate(doc.updatedAt),
    };
}

/** Chuẩn hoá Project doc */
export function asPlainProject(doc) {
    if (!doc) return null;
    
    // Handle team - nếu là object thì giữ { _id, name }, nếu là ID thì convert sang string
    let teamValue = null;
    if (doc.team) {
        if (typeof doc.team === 'object' && doc.team._id) {
            // Team đã được populated
            teamValue = {
                _id: toPlainId(doc.team._id),
                name: doc.team.name ?? ''
            };
        } else {
            // Team chỉ là ID
            teamValue = toPlainId(doc.team);
        }
    }
    
    return {
        _id: toPlainId(doc._id),
        name: doc.name ?? '',
        code: doc.code ?? null,
        description: doc.description ?? '',
        team: teamValue,
        members: Array.isArray(doc.members)
            ? doc.members.map((m) => ({
                  userId: String(m.userId),
                  role: m.role,
                  createdAt: toPlainDate(m.createdAt),
                  updatedAt: toPlainDate(m.updatedAt),
              }))
            : [],
        statuses: Array.isArray(doc.statuses) ? doc.statuses : [],
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        startDate: toPlainDate(doc.startDate),
        dueDate: toPlainDate(doc.dueDate),
        priority: doc.priority ?? null,
        isActive: doc.isActive ?? true,
        driveFolderId: doc.driveFolderId ?? null,
        driveFolderName: doc.driveFolderName ?? null,
        driveParentId: doc.driveParentId ?? null,
        platforms: Array.isArray(doc.platforms) ? doc.platforms.map(toPlainId) : [],
        workTypes: Array.isArray(doc.workTypes) ? doc.workTypes.map(toPlainId) : [],
        assetsCount: doc.assetsCount ?? 0,
        custom: toPlainMap(doc.custom),
        createdAt: toPlainDate(doc.createdAt),
        updatedAt: toPlainDate(doc.updatedAt),
    };
}

/** Chuẩn hoá AppUser doc */
export function asPlainAppUser(doc) {
    if (!doc) return null;
    return {
        _id: toPlainId(doc._id),
        externalUserId: String(doc.externalUserId),
        jobTitle: doc.jobTitle ?? null,
        capacityHoursPerWeek: doc.capacityHoursPerWeek ?? 40,
        color: doc.color ?? null,
        preferences: toPlainMap(doc.preferences),
        isEnabled: doc.isEnabled ?? true,
        createdAt: toPlainDate(doc.createdAt),
        updatedAt: toPlainDate(doc.updatedAt),
    };
}

/**
 * Sanitize arbitrary metadata object for storage or server->client passing.
 * - Convert ObjectId-like and Buffer-like values to strings
 * - Convert Date values to ISO strings
 * - Preserve primitive values
 */
export function sanitizeMetadata(obj) {
    if (obj == null) return undefined;
    if (typeof obj !== 'object') return obj;

    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v == null) {
            out[k] = v;
            continue;
        }

        // Date -> ISO
        if (v instanceof Date) {
            out[k] = toPlainDate(v);
            continue;
        }

        // Buffer-like (ArrayBuffer / Buffer) -> base64 string
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) {
            out[k] = v.toString('base64');
            continue;
        }
        if (v instanceof ArrayBuffer) {
            try {
                out[k] = Buffer.from(v).toString('base64');
            } catch {
                out[k] = null;
            }
            continue;
        }

        // ObjectId-like: try String()
        try {
            // Many ObjectId implementations stringify sensibly
            const s = String(v);
            out[k] = s;
            continue;
        } catch (e) {
            // Fallback: deep clone primitives / objects
        }

        // If value is an object/array, recurse shallowly
        if (Array.isArray(v)) {
            out[k] = v.map(item => (item == null ? item : typeof item === 'object' ? String(item) : item));
        } else if (typeof v === 'object') {
            out[k] = {};
            for (const [kk, vv] of Object.entries(v)) {
                out[k][kk] = vv == null ? vv : (typeof vv === 'object' ? String(vv) : vv);
            }
        } else {
            out[k] = v;
        }
    }
    return out;
}

/**
 * Safe JSON serialization cho client components
 * Xử lý Mongoose objects, ObjectIds, và các toJSON methods
 * @param {any} data
 * @returns {any}
 */
export function safeSerialize(data) {
    try {
        // JSON.stringify sẽ gọi toJSON() và gây lỗi
        // Nên ta phải convert toObject() trước
        if (data && typeof data === 'object') {
            if (typeof data.toObject === 'function') {
                data = data.toObject();
            } else if (Array.isArray(data)) {
                data = data.map(item => 
                    (item && typeof item.toObject === 'function') ? item.toObject() : item
                );
            }
        }
        
        // Bây giờ JSON.stringify an toàn
        return JSON.parse(JSON.stringify(data));
    } catch (error) {
        console.warn('Serialization error:', error);
        return data;
    }
}
