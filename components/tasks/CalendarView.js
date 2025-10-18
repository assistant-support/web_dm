// components/tasks/CalendarView.jsx
'use client'

import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns'
import { useMemo, useRef, useState } from 'react'
import { useTaskBoardActions } from '@/app/hooks/task-board.hook'

export default function CalendarView({ tasks }) {
    const [anchor, setAnchor] = useState(new Date())
    const { onUpdatePlan } = useTaskBoardActions()

    const first = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 })
    const last = addDays(endOfMonth(anchor), 6) // ensure 5~6 rows

    const days = []
    for (let d = first; d <= last; d = addDays(d, 1)) days.push(d)

    const tasksByDay = useMemo(() => {
        const map = new Map()
        for (const day of days) map.set(format(day, 'yyyy-MM-dd'), [])
        tasks.forEach((t) => {
            const s = t.plannedStartAt ? new Date(t.plannedStartAt) : undefined
            const e = t.plannedDueAt ? new Date(t.plannedDueAt) : s
            if (!s) return
            for (const day of days) {
                if (s && e && day >= startOfDay(s) && day <= startOfDay(e)) {
                    const key = format(day, 'yyyy-MM-dd')
                    map.get(key).push(t)
                }
            }
        })
        return map
    }, [JSON.stringify(tasks), format(anchor, 'yyyy-MM')])

    const dragTask = useRef(null)
    const onDragStart = (t) => (e) => {
        dragTask.current = t
        e.dataTransfer.setData('text/plain', t._id)
    }
    const onDropTo = (day) => async (e) => {
        e.preventDefault()
        const t = dragTask.current
        dragTask.current = null
        if (!t) return
        const dur =
            (t.plannedStartAt && t.plannedDueAt
                ? Math.max(
                    0,
                    startOfDay(new Date(t.plannedDueAt)).getTime() - startOfDay(new Date(t.plannedStartAt)).getTime()
                )
                : 0) /
            (1000 * 60 * 60 * 24)
        const newStart = startOfDay(day)
        const newDue = addDays(newStart, Math.round(dur))
        await onUpdatePlan(t._id, formatISODate(newStart), formatISODate(newDue))
    }
    const onDragOver = (e) => e.preventDefault()

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">{format(anchor, 'MMMM yyyy')}</div>
                <div className="flex gap-2">
                    <button className="rounded-md border px-2 py-1 text-sm" onClick={() => setAnchor(addDays(anchor, -30))}>
                        ◀ Trước
                    </button>
                    <button className="rounded-md border px-2 py-1 text-sm" onClick={() => setAnchor(new Date())}>
                        Hôm nay
                    </button>
                    <button className="rounded-md border px-2 py-1 text-sm" onClick={() => setAnchor(addDays(anchor, +30))}>
                        Sau ▶
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                    <div key={d} className="text-xs text-muted-foreground text-center">{d}</div>
                ))}
                {days.map((day) => (
                    <div
                        key={day.toISOString()}
                        onDrop={onDropTo(day)}
                        onDragOver={onDragOver}
                        className="min-h-28 rounded-lg border p-2"
                    >
                        <div className="text-xs text-muted-foreground">{format(day, 'd')}</div>
                        <div className="mt-1 flex flex-col gap-1">
                            {(tasksByDay.get(format(day, 'yyyy-MM-dd')) || []).map((t) => (
                                <div
                                    key={`${t._id}-${format(day, 'yyyy-MM-dd')}`}
                                    draggable
                                    onDragStart={onDragStart(t)}
                                    className="rounded-md border bg-muted px-2 py-1 text-xs cursor-grab active:cursor-grabbing"
                                >
                                    {t.title}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function startOfDay(d) {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
}

function formatISODate(d) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T00:00:00.000Z`
}
