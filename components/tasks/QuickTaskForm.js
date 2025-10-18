// components/tasks/QuickTaskForm.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAsyncNotifier } from '@/lib/useAsyncNotifier'
import { createTask } from '@/data/actions.server'

export default function QuickTaskForm({ projectId, defaultAssignee, onCreated }) {
    const [title, setTitle] = useState('')
    const [priority, setPriority] = useState('NORMAL')
    const [assignee, setAssignee] = useState(defaultAssignee || '')
    const [docsEnabled, setDocsEnabled] = useState(false)
    const [requiresApproval, setRequiresApproval] = useState(false)
    const [requiresAssigneeConfirm, setRequiresAssigneeConfirm] = useState(false)

    const router = useRouter()
    const { run, loading } = useAsyncNotifier({ enableNoti: true })

    const onSubmit = async (e) => {
        e.preventDefault()
        if (!title.trim()) return

        await run(
            () =>
                createTask({
                    projectId,
                    title: title.trim(),
                    priority,
                    assignee: assignee || undefined,
                    docsEnabled,
                    requiresApproval,
                    requiresAssigneeConfirm,
                }),
            {
                successMessage: 'Tạo công việc thành công',
                errorMessage: 'Không thể tạo công việc',
            }
        )
        setTitle('')
        onCreated && onCreated()
        router.refresh()
    }

    return (
        <form onSubmit={onSubmit} className="rounded-xl border p-3 space-y-3">
            <div className="text-sm font-medium">Tạo nhanh</div>
            <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Tiêu đề công việc..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
                <select
                    className="rounded-md border px-2 py-2 text-sm"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                >
                    <option value="URGENT">URGENT</option>
                    <option value="HIGH">HIGH</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="LOW">LOW</option>
                </select>
                <input
                    className="rounded-md border px-3 py-2 text-sm"
                    placeholder="Assignee userId (tuỳ chọn)"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                />
            </div>

            <div className="flex items-center gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={docsEnabled} onChange={(e) => setDocsEnabled(e.target.checked)} />
                    Tạo Docs
                </label>
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
                    Cần duyệt
                </label>
                <label className="inline-flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={requiresAssigneeConfirm}
                        onChange={(e) => setRequiresAssigneeConfirm(e.target.checked)}
                    />
                    Xác nhận bởi assignee
                </label>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm"
            >
                {loading ? 'Đang tạo...' : 'Tạo'}
            </button>
        </form>
    )
}
