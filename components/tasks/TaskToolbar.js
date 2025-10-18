// components/tasks/TaskToolbar.jsx
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'

export default function TaskToolbar({ view }) {
    const router = useRouter()
    const pathname = usePathname()
    const params = useSearchParams()

    const tabs = [
        { key: 'list', label: 'Danh sách' },
        { key: 'kanban', label: 'Kanban' },
        { key: 'calendar', label: 'Lịch' },
    ]

    const setView = (v) => {
        const sp = new URLSearchParams(params?.toString())
        sp.set('view', v)
        router.push(`${pathname}?${sp.toString()}`)
    }

    return (
        <div className="inline-flex items-center rounded-xl border bg-background p-1">
            {tabs.map((t) => (
                <button
                    key={t.key}
                    onClick={() => setView(t.key)}
                    aria-label={`Chuyển sang ${t.label}`}
                    className={clsx(
                        'px-3 py-1.5 rounded-lg text-sm',
                        view === t.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )}
                >
                    {t.label}
                </button>
            ))}
        </div>
    )
}
