// components/tasks/CalendarView.jsx
'use client'

import { addDays, endOfMonth, format, startOfDay, startOfMonth, startOfWeek, isToday, isSameMonth } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useMemo, useRef, useState, useTransition } from 'react'
import { updateTaskPlan } from '@/actions/task.actions'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

export default function CalendarView({ tasks }) {
    const [anchor, setAnchor] = useState(new Date())
    const [isPending, startTransition] = useTransition()

    const first = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 })
    const last = addDays(endOfMonth(anchor), 6)

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
        
        // Call server action with optimistic update
        startTransition(async () => {
            const result = await updateTaskPlan(t._id, formatISODate(newStart), formatISODate(newDue))
            if (result.error) {
                console.error('Failed to update task plan:', result.error)
                // Optionally show a toast notification
            }
        })
    }
    const onDragOver = (e) => e.preventDefault()

    // Priority color mapping
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 border-red-300 text-red-800'
            case 'high': return 'bg-orange-100 border-orange-300 text-orange-800'
            case 'normal': return 'bg-blue-100 border-blue-300 text-blue-800'
            case 'low': return 'bg-gray-100 border-gray-300 text-gray-700'
            default: return 'bg-gray-100 border-gray-300 text-gray-700'
        }
    }

    return (
        <div className="w-full space-y-4 overflow-x-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">
                            {format(anchor, 'MMMM yyyy', { locale: vi })}
                        </h3>
                        <p className="text-sm text-gray-600">
                            {tasks.length} nhiệm vụ trong tháng
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        onClick={() => setAnchor(addDays(anchor, -30))}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Trước
                    </button>
                    <button 
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                        onClick={() => setAnchor(new Date())}
                    >
                        Hôm nay
                    </button>
                    <button 
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        onClick={() => setAnchor(addDays(anchor, +30))}
                    >
                        Sau
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs bg-white rounded-lg p-3 border border-gray-100">
                <span className="font-semibold text-gray-700">Độ ưu tiên:</span>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-red-400"></div>
                    <span className="text-gray-600">Khẩn cấp</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-orange-400"></div>
                    <span className="text-gray-600">Cao</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-blue-400"></div>
                    <span className="text-gray-600">Bình thường</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-gray-400"></div>
                    <span className="text-gray-600">Thấp</span>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm min-w-[640px]">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map((d, idx) => (
                        <div 
                            key={d} 
                            className={`py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold ${
                                idx >= 5 ? 'text-blue-600' : 'text-gray-700'
                            }`}
                        >
                            <span className="hidden sm:inline">{d === 'CN' ? 'Chủ nhật' : d}</span>
                            <span className="sm:hidden">{d}</span>
                        </div>
                    ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7">
                    {days.map((day, idx) => {
                        const dayTasks = tasksByDay.get(format(day, 'yyyy-MM-dd')) || []
                        const isCurrentDay = isToday(day)
                        const isCurrentMonth = isSameMonth(day, anchor)
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6
                        
                        return (
                            <div
                                key={day.toISOString()}
                                onDrop={onDropTo(day)}
                                onDragOver={onDragOver}
                                className={`min-h-32 p-2 border-b border-r border-gray-100 transition-colors ${
                                    !isCurrentMonth ? 'bg-gray-50/50' : 
                                    isWeekend ? 'bg-blue-50/30' : 'bg-white hover:bg-gray-50/50'
                                } ${idx % 7 === 6 ? 'border-r-0' : ''}`}
                            >
                                <div className={`text-sm font-semibold mb-2 ${
                                    isCurrentDay 
                                        ? 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white' 
                                        : !isCurrentMonth 
                                        ? 'text-gray-400' 
                                        : isWeekend
                                        ? 'text-blue-600'
                                        : 'text-gray-700'
                                }`}>
                                    {format(day, 'd')}
                                </div>
                                <div className="space-y-1">
                                    {dayTasks.slice(0, 3).map((t) => (
                                        <div
                                            key={`${t._id}-${format(day, 'yyyy-MM-dd')}`}
                                            draggable
                                            onDragStart={onDragStart(t)}
                                            className={`rounded-md px-2 py-1.5 text-xs font-medium cursor-grab active:cursor-grabbing border transition-all hover:shadow-sm ${getPriorityColor(t.priority)}`}
                                            title={t.title}
                                        >
                                            <div className="truncate">{t.title}</div>
                                        </div>
                                    ))}
                                    {dayTasks.length > 3 && (
                                        <div className="text-xs text-gray-500 font-medium pl-2">
                                            +{dayTasks.length - 3} thêm
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function formatISODate(d) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T00:00:00.000Z`
}
