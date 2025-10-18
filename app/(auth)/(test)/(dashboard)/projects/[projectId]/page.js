// app/(dashboard)/projects/[projectId]/page.jsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'

// Server actions (read-only queries)
import {
    queryProjectInfo,
    queryProjectAssignees,
    queryProjectTasks,
} from '@/data/actions.server'

// Client components
import TaskToolbar from '@/components/tasks/TaskToolbar'
import TaskFilters from '@/components/tasks/TaskFilters'
import QuickTaskForm from '@/components/tasks/QuickTaskForm'
import TaskList from '@/components/tasks/TaskList'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import CalendarView from '@/components/tasks/CalendarView'

export default async function ProjectPage({ params, searchParams }) {
    const projectId = params.projectId
    const view = (searchParams?.view || 'list')

    // Load SSR data
    const infoRes = await queryProjectInfo({ projectId })
    if (!infoRes?.data?.project) return notFound()
    const project = infoRes.data.project

    const assigneesRes = await queryProjectAssignees({ projectId })
    const assignees = assigneesRes?.data?.assignees || []

    // Normalize filters from URL
    const toArr = (v) => (Array.isArray(v) ? v : v ? [v] : undefined)
    const status = toArr(searchParams?.status)
    const priority = toArr(searchParams?.priority)

    const tasksRes = await queryProjectTasks({
        projectId,
        q: searchParams?.q,
        status,
        priority,
        assignee: searchParams?.assignee,
        plannedFrom: searchParams?.plannedFrom,
        plannedTo: searchParams?.plannedTo,
        tag: searchParams?.tag,
        platform: searchParams?.platform,
        workType: searchParams?.workType,
    })

    const tasks = tasksRes?.data?.items || []
    const statuses =
        (Array.isArray(project?.statuses) && project.statuses.length
            ? project.statuses
            : [
                'DRAFT',
                'PENDING_APPROVAL',
                'WAITING_ASSIGNEE_CONFIRM',
                'IN_PROGRESS',
                'ON_HOLD',
                'COMPLETED_AWAIT_REVIEW',
                'COMPLETED',
                'REJECTED',
                'CANCELLED',
            ])

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{project?.name || 'Project'}</h1>
                    <p className="text-sm text-muted-foreground">
                        Mã: {project?.code || '-'} • Thư mục Drive: {project?.driveFolderName || '—'}
                    </p>
                </div>
                <TaskToolbar view={view} />
            </div>

            {/* Filters + Quick Create */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3">
                    <TaskFilters
                        assignees={assignees}
                        filters={{
                            q: searchParams?.q || '',
                            status: status || [],
                            priority: priority || [],
                            assignee: searchParams?.assignee || '',
                            plannedFrom: searchParams?.plannedFrom || '',
                            plannedTo: searchParams?.plannedTo || '',
                            tag: searchParams?.tag || '',
                            platform: searchParams?.platform || '',
                            workType: searchParams?.workType || '',
                        }}
                    />
                </div>
                <div className="lg:col-span-1">
                    <QuickTaskForm projectId={projectId} />
                </div>
            </div>

            {/* Content */}
            <Suspense>
                {view === 'list' && (
                    <TaskList tasks={tasks} statuses={statuses} />
                )}
                {view === 'kanban' && (
                    <KanbanBoard
                        statuses={[
                            'PENDING_APPROVAL',
                            'WAITING_ASSIGNEE_CONFIRM',
                            'IN_PROGRESS',
                            'ON_HOLD',
                            'COMPLETED_AWAIT_REVIEW',
                        ]}
                        tasks={tasks}
                    />
                )}
                {view === 'calendar' && <CalendarView tasks={tasks} />}
            </Suspense>
        </div>
    )
}
