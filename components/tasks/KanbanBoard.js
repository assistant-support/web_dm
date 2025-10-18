// components/tasks/KanbanBoard.jsx
'use client'

import { useMemo, useRef } from 'react'
import { useTaskBoardActions } from '@/app/hooks/task-board.hook'

export default function KanbanBoard({ statuses, tasks }) {
    const { onUpdateStatus, onMarkDone } = useTaskBoardActions()

    const grouped = useMemo(() => {
        const map = new Map()
        statuses.forEach((s) => map.set(s, []))
        tasks.forEach((t) => {
            if (map.has(t.status)) map.get(t.status).push(t)
        })
        return map
    }, [statuses, tasks])

    const dragTask = useRef(null)

    const onDragStart = (t) => (e) => {
        dragTask.current = t
        e.dataTransfer.setData('text/plain', t._id)
        e.dataTransfer.effectAllowed = 'move'
    }

    const onDropTo = (col) => async (e) => {
        e.preventDefault()
        const t = dragTask.current
        dragTask.current = null
        if (!t) return
        if (col === 'DONE') {
            await onMarkDone(t._id)
        } else if (t.status !== col) {
            await onUpdateStatus(t._id, col)
        }
    }

    const onDragOver = (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const Column = ({ status, children }) => (
        <div
            className="flex flex-col gap-3 rounded-xl border p-3 min-h-[50vh]"
            onDrop={onDropTo(status)}
            onDragOver={onDragOver}
            aria-label={`Cột ${status}`}
        >
            <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{status}</div>
                <div className="text-xs text-muted-foreground">
                    {(grouped.get(status) || []).length} thẻ
                </div>
            </div>
            {children}
        </div>
    )

    const Card = ({ t }) => (
        <div
            draggable
            onDragStart={onDragStart(t)}
            className="cursor-grab active:cursor-grabbing rounded-lg border bg-card p-3 hover:shadow-sm transition"
            aria-label={`Task ${t.title}`}
        >
            <div className="text-sm font-medium">{t.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
                {(t.assignee ? `@${t.assignee}` : '—')} • {t.priority}
            </div>
        </div>
    )

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {statuses.map((s) => (
                <Column key={s} status={s}>
                    {(grouped.get(s) || []).map((t) => (
                        <Card key={t._id} t={t} />
                    ))}
                </Column>
            ))}
            {/* Done drop zone */}
            <div
                className="rounded-xl border border-dashed p-3 flex items-center justify-center text-sm text-muted-foreground"
                onDrop={onDropTo('DONE')}
                onDragOver={onDragOver}
                aria-label="Thả vào đây để đánh dấu Done"
            >
                Thả vào đây để đánh dấu Done
            </div>
        </div>
    )
}
