// lib/serialize.js
// Tác dụng file: Chuyển Mongo/Mongoose docs thành Plain JSON an toàn cho Client Components.
// - Chuẩn hoá ObjectId → string, Date → ISO string, Map → plain object.
// - Dùng trong server actions để tránh lỗi: “Only plain objects can be passed to Client Components...”.

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

/** Chuẩn hoá Task doc (chỉ trả field cần thiết và an toàn) */
export function asPlainTask(doc) {
    if (!doc) return null;
    return {
        _id: toPlainId(doc._id),
        project: toPlainId(doc.project),
        parentTask: toPlainId(doc.parentTask),
        team: toPlainId(doc.team),
        scope: doc.scope,
        title: doc.title,
        description: doc.description ?? '',
        createdBy: doc.createdBy ?? null,
        assignee: doc.assignee ?? null,
        watchers: Array.isArray(doc.watchers) ? doc.watchers.map(String) : [],
        workType: toPlainId(doc.workType),
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
        createdAt: toPlainDate(doc.createdAt),
        updatedAt: toPlainDate(doc.updatedAt),
    };
}

/** Chuẩn hoá Project doc (an toàn cho client) */
export function asPlainProject(doc) {
    if (!doc) return null;
    return {
        _id: toPlainId(doc._id),
        team: toPlainId(doc.team),
        name: doc.name,
        code: doc.code ?? null,
        description: doc.description ?? '',
        priority: doc.priority ?? null,
        startDate: toPlainDate(doc.startDate),
        dueDate: toPlainDate(doc.dueDate),
        isActive: doc.isActive !== false,
        driveFolderId: doc.driveFolderId ?? null,
        driveFolderName: doc.driveFolderName ?? null,
        driveParentId: doc.driveParentId ?? null,
        platforms: Array.isArray(doc.platforms) ? doc.platforms.map(toPlainId) : [],
        workTypes: Array.isArray(doc.workTypes) ? doc.workTypes.map(toPlainId) : [],
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        members: Array.isArray(doc.members)
            ? doc.members.map((m) => ({ userId: String(m.userId), role: m.role }))
            : [],
        createdAt: toPlainDate(doc.createdAt),
        updatedAt: toPlainDate(doc.updatedAt),
    };
}
