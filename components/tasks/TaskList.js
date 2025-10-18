// components/tasks/TaskList.jsx
'use client'

import { useMemo, useState } from 'react'
import { useTaskBoardActions } from '@/app/hooks/task-board.hook'

export default function TaskList({ tasks, statuses }) {
    const { onAssign, onUpdateStatus, onMarkDone, onUpdatePlan, onCancel } = useTaskBoardActions()
    const [assignTo, setAssignTo] = useState({})

    const fmt = (d) =>
        d ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(d)) : '—'

    const rows = useMemo(() => tasks, [tasks])

    const toggleStartOnHold = (t) => {
        if (t.status === 'ON_HOLD') return onUpdateStatus(t._id, 'IN_PROGRESS')
        if (t.status === 'IN_PROGRESS') return onUpdateStatus(t._id, 'ON_HOLD')
        return onUpdateStatus(t._id, 'IN_PROGRESS')
    }

    return (
        <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
                <thead className="bg-muted">
                    <tr>
                        <th className="px-3 py-2 text-left">Tiêu đề</th>
                        <th className="px-3 py-2">Assignee</th>
                        <th className="px-3 py-2">Trạng thái</th>
                        <th className="px-3 py-2">Ưu tiên</th>
                        <th className="px-3 py-2">Kế hoạch</th>
                        <th className="px-3 py-2">Điểm</th>
                        <th className="px-3 py-2">Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((t) => (
                        <tr key={t._id} className="border-t">
                            <td className="px-3 py-2">
                                <div className="font-medium">{t.title}</div>
                                <div className="text-xs text-muted-foreground">{fmt(t.createdAt)}</div>
                            </td>
                            <td className="px-3 py-2">
                                <div className="flex gap-2">
                                    <input
                                        className="w-36 rounded-md border px-2 py-1 text-xs"
                                        placeholder="userId"
                                        value={assignTo[t._id] ?? t.assignee ?? ''}
                                        onChange={(e) => setAssignTo((s) => ({ ...s, [t._id]: e.target.value }))}
                                    />
                                    <button
                                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                                        onClick={() => onAssign(t._id, assignTo[t._id] || '')}
                                        aria-label="Giao việc"
                                    >
                                        Giao
                                    </button>
                                </div>
                            </td>
                            <td className="px-3 py-2">
                                <span className="inline-flex rounded-md border px-2 py-1 text-xs">{t.status}</span>
                            </td>
                            <td className="px-3 py-2">{t.priority || '—'}</td>
                            <td className="px-3 py-2">
                                <div className="text-xs">
                                    {fmt(t.plannedStartAt)} → {fmt(t.plannedDueAt)}
                                </div>
                                <div className="mt-1 flex gap-1">
                                    <input
                                        type="date"
                                        className="rounded-md border px-2 py-1 text-xs"
                                        onChange={(e) => onUpdatePlan(t._id, e.target.value || null, t.plannedDueAt || null)}
                                    />
                                    <input
                                        type="date"
                                        className="rounded-md border px-2 py-1 text-xs"
                                        onChange={(e) => onUpdatePlan(t._id, t.plannedStartAt || null, e.target.value || null)}
                                    />
                                </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                                {(t.finalPoints ?? t.initialPoints ?? 0) || 0}
                            </td>
                            <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                                        onClick={() => toggleStartOnHold(t)}
                                    >
                                        {t.status === 'IN_PROGRESS' ? 'Tạm dừng' : 'Bắt đầu'}
                                    </button>
                                    <button
                                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                                        onClick={() => onMarkDone(t._id)}
                                    >
                                        Done
                                    </button>
                                    <button
                                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                                        onClick={() => onCancel(t._id)}
                                    >
                                        Huỷ
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {!rows.length && (
                        <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                                Không có dữ liệu
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
