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
        setLocal({ ...filters })
    }, [filters])

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
        <form onSubmit={onSubmit} className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
            <div className="flex gap-3">
                <input
                    className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tìm theo tiêu đề..."
                    value={local.q || ''}
                    onChange={(e) => setLocal((s) => ({ ...s, q: e.target.value }))}
                />
                <button type="submit" className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
                    Lọc
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">Trạng thái</label>
                    <div className="flex flex-wrap gap-2">
                        {statuses.map((s) => (
                            <button
                                type="button"
                                key={s}
                                onClick={() => toggleInArray('status', s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                    (local.status || []).includes(s) 
                                        ? 'bg-blue-600 text-white border-blue-600' 
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">Độ ưu tiên</label>
                    <div className="flex flex-wrap gap-2">
                        {PRIORITIES.map((p) => (
                            <button
                                type="button"
                                key={p}
                                onClick={() => toggleInArray('priority', p)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                    (local.priority || []).includes(p) 
                                        ? 'bg-blue-600 text-white border-blue-600' 
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">Người nhận</label>
                    <select
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={local.assignee || ''}
                        onChange={(e) => setLocal((s) => ({ ...s, assignee: e.target.value || undefined }))}
                    >
                        <option value="">(Tất cả)</option>
                        {(assignees || []).map((u) => (
                            <option key={u} value={u}>
                                {u}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-medium text-gray-700 mb-2 block">Từ ngày</label>
                        <input
                            type="date"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={local.plannedFrom || ''}
                            onChange={(e) => setLocal((s) => ({ ...s, plannedFrom: e.target.value || undefined }))}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-700 mb-2 block">Đến ngày</label>
                        <input
                            type="date"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={local.plannedTo || ''}
                            onChange={(e) => setLocal((s) => ({ ...s, plannedTo: e.target.value || undefined }))}
                        />
                    </div>
                </div>
            </div>
        </form>
    )
}
