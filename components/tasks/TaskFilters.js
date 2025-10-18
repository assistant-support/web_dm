// components/tasks/TaskFilters.jsx
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

export default function TaskFilters({ assignees, filters }) {
    const [local, setLocal] = useState(filters)
    const router = useRouter()
    const pathname = usePathname()
    const params = useSearchParams()

    useEffect(() => {
        setLocal(filters)
    }, [JSON.stringify(filters)])

    const onSubmit = (e) => {
        e.preventDefault()
        const sp = new URLSearchParams(params?.toString())

        const writeArray = (key, arr) => {
            sp.delete(key)
            if (arr && arr.length) arr.forEach((v) => sp.append(key, v))
        }

        local.q ? sp.set('q', local.q) : sp.delete('q')
        writeArray('status', local.status)
        writeArray('priority', local.priority)
        local.assignee ? sp.set('assignee', local.assignee) : sp.delete('assignee')
        local.plannedFrom ? sp.set('plannedFrom', local.plannedFrom) : sp.delete('plannedFrom')
        local.plannedTo ? sp.set('plannedTo', local.plannedTo) : sp.delete('plannedTo')
        local.tag ? sp.set('tag', local.tag) : sp.delete('tag')
        local.platform ? sp.set('platform', local.platform) : sp.delete('platform')
        local.workType ? sp.set('workType', local.workType) : sp.delete('workType')

        router.push(`${pathname}?${sp.toString()}`)
    }

    const toggleInArray = (key, val) => {
        setLocal((prev) => {
            const set = new Set(prev[key] || [])
            set.has(val) ? set.delete(val) : set.add(val)
            return { ...prev, [key]: Array.from(set) }
        })
    }

    const statuses = useMemo(
        () => [
            'DRAFT',
            'PENDING_APPROVAL',
            'WAITING_ASSIGNEE_CONFIRM',
            'IN_PROGRESS',
            'ON_HOLD',
            'COMPLETED_AWAIT_REVIEW',
            'COMPLETED',
            'REJECTED',
            'CANCELLED',
        ],
        []
    )

    const PRIORITIES = ['URGENT', 'HIGH', 'NORMAL', 'LOW']

    return (
        <form onSubmit={onSubmit} className="rounded-xl border p-3 space-y-3">
            <div className="flex gap-2">
                <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Tìm theo tiêu đề..."
                    value={local.q || ''}
                    onChange={(e) => setLocal((s) => ({ ...s, q: e.target.value }))}
                />
                <button type="submit" className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm">
                    Lọc
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div>
                    <label className="text-xs font-medium">Trạng thái</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                        {statuses.map((s) => (
                            <button
                                type="button"
                                key={s}
                                onClick={() => toggleInArray('status', s)}
                                className={`px-2 py-1 rounded-md text-xs border ${(local.status || []).includes(s) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium">Độ ưu tiên</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                        {PRIORITIES.map((p) => (
                            <button
                                type="button"
                                key={p}
                                onClick={() => toggleInArray('priority', p)}
                                className={`px-2 py-1 rounded-md text-xs border ${(local.priority || []).includes(p) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium">Người nhận</label>
                    <select
                        className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                        value={local.assignee || ''}
                        onChange={(e) => setLocal((s) => ({ ...s, assignee: e.target.value || undefined }))}
                    >
                        <option value="">(Tất cả)</option>
                        {assignees.map((u) => (
                            <option key={u} value={u}>
                                {u}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-medium">Từ ngày</label>
                        <input
                            type="date"
                            className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                            value={local.plannedFrom || ''}
                            onChange={(e) => setLocal((s) => ({ ...s, plannedFrom: e.target.value || undefined }))}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium">Đến ngày</label>
                        <input
                            type="date"
                            className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                            value={local.plannedTo || ''}
                            onChange={(e) => setLocal((s) => ({ ...s, plannedTo: e.target.value || undefined }))}
                        />
                    </div>
                </div>
            </div>
        </form>
    )
}
