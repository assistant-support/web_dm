// app/components/project/list/TaskRow.client.js
// Cấu trúc: /app/components/project/list/*  (Client Component)
// Mục đích: Hàng task với inline edit assignee/priority/tags (+ optional checklist).
// - Gọi Server Actions: updateMeta(), toggleChecklist().
// - Trạng thái saving để disable control; notify qua useAsyncNotifier().

"use client";

import React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatTask, formatDate } from "@/data/_shared/formatters.js";
import { updateMeta, toggleChecklist } from "@/data/task/actions/server.js";
import { useAsyncNotifier } from "@/app/hooks/useAsyncNotifier.js";

/**
 * @param {{
 *   projectId: string,
 *   task: {
 *     _id:string, title:string, assignee?:string|null,
 *     priority?: 'LOW'|'MEDIUM'|'HIGH'|'URGENT'|'CRITICAL'|string,
 *     status:string, plannedDueAt?:string|null, tags?:string[],
 *     commentsCount?:number, attachmentsCount?:number,
 *     checklist?: Array<{ cid:string, content:string, done:boolean }>
 *   },
 *   members: Array<{ userId:string, role:string }>,
 *   onAfterChange?: (msg?:string)=>void,
 *   onError?: (msg?:string)=>void
 * }} props
 */
export default function TaskRow({ projectId, task, members, onAfterChange, onError }) {
    const router = useRouter();
    const notify = useAsyncNotifier();
    const [saving, setSaving] = React.useState(false);
    const [isPending, startTransition] = useTransition();

    // local state for tags input (comma-separated)
    const [tagsInput, setTagsInput] = React.useState(() => (task.tags || []).join(", "));

    const fv = formatTask(task);
    const dueTxt = formatDate(task?.plannedDueAt);

    async function safeUpdate(patch, successMsg = "Đã cập nhật") {
        try {
            setSaving(true);
            await updateMeta({ taskId: task._id, patch });
            // refresh SSR data
            startTransition(() => router.refresh());
            notify.success(successMsg);
            onAfterChange?.(successMsg);
        } catch (err) {
            const msg = err?.message || "Không thể cập nhật";
            notify.error(msg);
            onError?.(msg);
        } finally {
            setSaving(false);
        }
    }

    function parseTagsInput(raw) {
        const arr = String(raw || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        // dedupe
        return Array.from(new Set(arr));
    }

    async function handleAssigneeChange(e) {
        const val = e.target.value;
        const assignee = val || null;
        await safeUpdate({ assignee }, "Đã đổi assignee");
    }

    async function handlePriorityChange(e) {
        const p = String(e.target.value || "").toUpperCase();
        await safeUpdate({ priority: p }, "Đã đổi priority");
    }

    async function commitTags() {
        const tags = parseTagsInput(tagsInput);
        await safeUpdate({ tags }, "Đã cập nhật tags");
    }

    async function handleChecklistToggle(cid, checked) {
        try {
            setSaving(true);
            await toggleChecklist({ taskId: task._id, itemId: cid, checked: !!checked });
            startTransition(() => router.refresh());
            notify.success("Đã cập nhật checklist");
            onAfterChange?.("Đã cập nhật checklist");
        } catch (err) {
            const msg = err?.message || "Không thể cập nhật checklist";
            notify.error(msg);
            onError?.(msg);
        } finally {
            setSaving(false);
        }
    }

    return (
        <tr className="align-top">
            {/* Col: Task + meta */}
            <td className="px-3 py-3">
                <div className="font-medium">{task.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                    #{task._id} · {fv.statusLabel}{" "}
                    <span
                        className="ml-1 inline-block rounded px-1.5 py-0.5 text-[10px]"
                        style={{ backgroundColor: `${fv.priorityColor}1A`, color: fv.priorityColor }}
                    >
                        {fv.priorityLabel}
                    </span>
                    <span className="ml-2">
                        💬 {task.commentsCount ?? 0} · 📎 {task.attachmentsCount ?? 0}
                    </span>
                </div>

                {/* Optional: Checklist */}
                {Array.isArray(task.checklist) && task.checklist.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {task.checklist.map((it) => (
                            <label key={it.cid} className="flex items-center gap-2 text-xs">
                                <input
                                    type="checkbox"
                                    className="h-3.5 w-3.5"
                                    disabled={saving || isPending}
                                    defaultChecked={!!it.done}
                                    onChange={(e) => handleChecklistToggle(it.cid, e.target.checked)}
                                />
                                <span className={it.done ? "line-through text-slate-400" : ""}>{it.content}</span>
                            </label>
                        ))}
                    </div>
                )}

                {/* Tags editor */}
                <div className="mt-2 text-xs">
                    <label className="flex items-center gap-2">
                        <span className="text-slate-500">Tags:</span>
                        <input
                            disabled={saving || isPending}
                            className="min-w-[220px] flex-1 rounded border px-2 py-1"
                            placeholder="tag1, tag2"
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            onBlur={commitTags}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    commitTags();
                                }
                            }}
                        />
                    </label>
                </div>
            </td>

            {/* Col: Assignee */}
            <td className="px-3 py-3">
                <label className="sr-only">Assignee</label>
                <select
                    disabled={saving || isPending}
                    className="w-full rounded border px-2 py-1 text-sm"
                    value={task.assignee || ""}
                    onChange={handleAssigneeChange}
                >
                    <option value="">(Chưa gán)</option>
                    {members.map((m) => (
                        <option key={m.userId} value={m.userId}>
                            {m.userId} {m.role ? `· ${m.role}` : ""}
                        </option>
                    ))}
                </select>
            </td>

            {/* Col: Due */}
            <td className="px-3 py-3">{dueTxt}</td>

            {/* Col: Actions (priority) */}
            <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                    <label className="sr-only">Priority</label>
                    <select
                        disabled={saving || isPending}
                        className="rounded border px-2 py-1 text-sm"
                        value={String(task.priority || "").toUpperCase() || ""}
                        onChange={handlePriorityChange}
                    >
                        <option value="">(—)</option>
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                        <option value="CRITICAL">CRITICAL</option>
                    </select>

                    {saving || isPending ? (
                        <span className="text-xs text-slate-400">Đang lưu…</span>
                    ) : null}
                </div>
            </td>
        </tr>
    );
}
