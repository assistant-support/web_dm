// app/components/project/list/ListView.client.js
// Cấu trúc: /app/components/project/list/*  (Client Component)
// Mục đích: Bảng danh sách Task chạy client (island) với filter/search/sort và inline edit (assignee/priority/tags).
// - Sau mỗi cập nhật -> router.refresh() để đồng bộ SSR (B14).
// - Dùng useAsyncNotifier() để báo trạng thái.
// - KHÔNG import model/DB trực tiếp. Chỉ gọi Server Actions đã có.

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatTask } from "@/data/_shared/formatters.js";
import { TASK_STATUS } from "@/model/common/enums.js";
import { useAsyncNotifier } from "@/hooks/loading.hook";
import TaskRow from "@/components/project/list/TaskRow.client.js";

// Rank priority để sort: CRITICAL > URGENT > HIGH > MEDIUM > LOW
const PRIORITY_RANK = {
    CRITICAL: 5,
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
};

const DEFAULT_OPEN_STATUSES = new Set([
    TASK_STATUS.DRAFT,
    TASK_STATUS.PENDING_APPROVAL,
    TASK_STATUS.WAITING_ASSIGNEE_CONFIRM,
    TASK_STATUS.IN_PROGRESS,
    TASK_STATUS.ON_HOLD,
    TASK_STATUS.COMPLETED_AWAIT_REVIEW,
]);

const ALL_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT", "CRITICAL"]);

/** Nút chip toggle đơn giản cho filter */
function ToggleChip({ active, onClick, children, className = "" }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full border px-2 py-1 text-xs transition ${active
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                } ${className}`}
        >
            {children}
        </button>
    );
}

/**
 * ListView (client)
 * @param {{
 *   projectId: string,
 *   tasks: Array<{
 *     _id: string, title: string, assignee?: string|null,
 *     priority?: 'LOW'|'MEDIUM'|'HIGH'|'URGENT'|'CRITICAL'|string,
 *     status: string, plannedDueAt?: string|null,
 *     createdAt?: string, commentsCount?: number, attachmentsCount?: number,
 *     tags?: string[], checklist?: Array<{ cid:string, content:string, done:boolean }>
 *   }>,
 *   members: Array<{ userId:string, role:string }>
 * }} props
 */
export default function ListView({ projectId, tasks = [], members = [] }) {
    const router = useRouter();
    const notify = useAsyncNotifier();

    // ======== Filters/Sort/Search state ========
    const [statusFilter, setStatusFilter] = React.useState(() => new Set(DEFAULT_OPEN_STATUSES));
    const [assigneeFilter, setAssigneeFilter] = React.useState(""); // "" = All
    const [priorityFilter, setPriorityFilter] = React.useState(() => new Set(ALL_PRIORITIES));
    const [q, setQ] = React.useState("");
    const [sortBy, setSortBy] = React.useState("created_desc"); // 'created_desc'|'due_asc'|'due_desc'|'priority_desc'|'priority_asc'

    // Helpers: toggle in Set
    const toggleStatus = (s) =>
        setStatusFilter((prev) => {
            const next = new Set(prev);
            if (next.has(s)) next.delete(s);
            else next.add(s);
            return next;
        });

    const togglePriority = (p) =>
        setPriorityFilter((prev) => {
            const next = new Set(prev);
            if (next.has(p)) next.delete(p);
            else next.add(p);
            return next;
        });

    // ======== Derived items (filter + search + sort) ========
    const viewItems = React.useMemo(() => {
        const term = q.trim().toLowerCase();
        const isIdSearch = term.startsWith("#");
        const idTerm = isIdSearch ? term.slice(1) : "";

        let filtered = tasks.filter((t) => {
            // status
            if (statusFilter.size && !statusFilter.has(t.status)) return false;

            // assignee
            if (assigneeFilter && String(t.assignee || "") !== assigneeFilter) return false;

            // priority
            const p = String(t.priority || "").toUpperCase();
            if (priorityFilter.size && !priorityFilter.has(p)) return false;

            // search (title or #id contains)
            if (term) {
                if (isIdSearch) {
                    if (!String(t._id || "").toLowerCase().includes(idTerm)) return false;
                } else {
                    const title = String(t.title || "").toLowerCase();
                    if (!title.includes(term)) return false;
                }
            }
            return true;
        });

        // sort
        const cmpCreatedDesc = (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();

        const getDue = (x) => (x?.plannedDueAt ? new Date(x.plannedDueAt).getTime() : null);

        const cmpDueAsc = (a, b) => {
            const da = getDue(a);
            const db = getDue(b);
            if (da === null && db === null) return 0;
            if (da === null) return 1; // Không có due -> xếp sau
            if (db === null) return -1;
            return da - db;
        };

        const cmpDueDesc = (a, b) => {
            const da = getDue(a);
            const db = getDue(b);
            if (da === null && db === null) return 0;
            if (da === null) return -1; // Không có due -> xếp trước
            if (db === null) return 1;
            return db - da;
        };

        const pr = (x) => PRIORITY_RANK[String(x.priority || "").toUpperCase()] || 0;
        const cmpPriorityDesc = (a, b) => pr(b) - pr(a);
        const cmpPriorityAsc = (a, b) => pr(a) - pr(b);

        switch (sortBy) {
            case "due_asc":
                filtered.sort(cmpDueAsc);
                break;
            case "due_desc":
                filtered.sort(cmpDueDesc);
                break;
            case "priority_desc":
                filtered.sort(cmpPriorityDesc);
                break;
            case "priority_asc":
                filtered.sort(cmpPriorityAsc);
                break;
            case "created_desc":
            default:
                filtered.sort(cmpCreatedDesc);
        }

        return filtered;
    }, [tasks, statusFilter, assigneeFilter, priorityFilter, q, sortBy]);

    // Callbacks từ hàng con: refresh sau update
    const handleAfterChange = (msg = "Đã cập nhật") => {
        notify.success(msg);
        router.refresh();
    };
    const handleError = (msg = "Không thể cập nhật") => {
        notify.error(msg);
    };

    // ======== UI ========
    return (
        <div className="space-y-3">
            {/* FILTER BAR */}
            <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-1">
                    <span className="mr-1 text-xs font-medium text-slate-500">Trạng thái:</span>
                    {[
                        [TASK_STATUS.DRAFT, "Draft"],
                        [TASK_STATUS.PENDING_APPROVAL, "Pending"],
                        [TASK_STATUS.WAITING_ASSIGNEE_CONFIRM, "Waiting"],
                        [TASK_STATUS.IN_PROGRESS, "In progress"],
                        [TASK_STATUS.ON_HOLD, "On hold"],
                        [TASK_STATUS.COMPLETED_AWAIT_REVIEW, "Await review"],
                    ].map(([key, label]) => (
                        <ToggleChip key={key} active={statusFilter.has(key)} onClick={() => toggleStatus(key)}>
                            {label}
                        </ToggleChip>
                    ))}
                </div>

                <div className="mx-2 hidden h-5 w-px bg-slate-200 sm:block" />

                <div className="flex flex-wrap items-center gap-1">
                    <span className="mr-1 text-xs font-medium text-slate-500">Priority:</span>
                    {["LOW", "MEDIUM", "HIGH", "URGENT", "CRITICAL"].map((p) => {
                        const fv = formatTask({ priority: p });
                        return (
                            <ToggleChip
                                key={p}
                                active={priorityFilter.has(p)}
                                onClick={() => togglePriority(p)}
                                className="flex items-center gap-1"
                            >
                                <span
                                    className="inline-block h-2 w-2 rounded-full"
                                    style={{ backgroundColor: fv.priorityColor }}
                                />
                                {fv.priorityLabel}
                            </ToggleChip>
                        );
                    })}
                </div>

                <div className="mx-2 hidden h-5 w-px bg-slate-200 sm:block" />

                <label className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-slate-500">Assignee:</span>
                    <select
                        className="rounded border px-2 py-1 text-sm"
                        value={assigneeFilter}
                        onChange={(e) => setAssigneeFilter(e.target.value)}
                    >
                        <option value="">Tất cả</option>
                        <option value="__UNASSIGNED__" disabled>
                            {/* giữ chỗ nếu sau cần filter "Không ai" */}
                        </option>
                        {members.map((m) => (
                            <option key={m.userId} value={m.userId}>
                                {m.userId} {m.role ? `· ${m.role}` : ""}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="mx-2 hidden h-5 w-px bg-slate-200 sm:block" />

                <label className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-slate-500">Sort:</span>
                    <select
                        className="rounded border px-2 py-1 text-sm"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="created_desc">Created (newest)</option>
                        <option value="due_asc">Due ↑</option>
                        <option value="due_desc">Due ↓</option>
                        <option value="priority_desc">Priority ↓</option>
                        <option value="priority_asc">Priority ↑</option>
                    </select>
                </label>

                <div className="mx-2 hidden h-5 w-px bg-slate-200 sm:block" />

                <div className="ml-auto flex-1 sm:flex-none">
                    <input
                        className="w-full rounded border px-2 py-1 text-sm"
                        placeholder="Tìm theo tiêu đề hoặc #id (ví dụ #64f...)"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>
            </div>

            {/* TABLE */}
            {!viewItems.length ? (
                <div className="rounded-lg border p-6 text-center text-slate-500">
                    Không có task nào khớp filter
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr className="text-left">
                                <th className="px-3 py-2">Task</th>
                                <th className="px-3 py-2">Assignee</th>
                                <th className="px-3 py-2">Due</th>
                                <th className="px-3 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {viewItems.map((t) => (
                                <TaskRow
                                    key={t._id}
                                    projectId={projectId}
                                    task={t}
                                    members={members}
                                    onAfterChange={handleAfterChange}
                                    onError={handleError}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
