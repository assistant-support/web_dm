// app/hooks/task-board.hook.js
'use client'

import { useRouter } from 'next/navigation'
import { useAsyncNotifier } from '@/lib/useAsyncNotifier'

// Server actions (B9)
import {
    assignTask,
    approveTask,
    rejectTask,
    assigneeConfirmStart,
    updateTaskStatus,
    markTaskDone,
    updateTaskPlan,
    cancelTask,
} from '@/data/actions.server'

export function useTaskBoardActions() {
    const { run } = useAsyncNotifier({ enableNoti: true })
    const router = useRouter()

    const withRefresh = async (fn) => {
        const res = await fn()
        router.refresh()
        return res
    }

    return {
        async onAssign(taskId, assignee, requireConfirm) {
            return withRefresh(() =>
                run(() => assignTask({ taskId, assignee, requireConfirm }), {
                    successMessage: 'Giao việc thành công',
                    errorMessage: 'Không thể giao việc',
                })
            )
        },

        async onApprove(taskId, note) {
            return withRefresh(() =>
                run(() => approveTask({ taskId, note }), {
                    successMessage: 'Đã duyệt task',
                    errorMessage: 'Duyệt thất bại',
                })
            )
        },

        async onReject(taskId, note) {
            return withRefresh(() =>
                run(() => rejectTask({ taskId, note }), {
                    successMessage: 'Đã từ chối',
                    errorMessage: 'Từ chối thất bại',
                })
            )
        },

        async onConfirmStart(taskId) {
            return withRefresh(() =>
                run(() => assigneeConfirmStart({ taskId }), {
                    successMessage: 'Đã xác nhận bắt đầu',
                    errorMessage: 'Xác nhận thất bại',
                })
            )
        },

        async onUpdateStatus(taskId, status) {
            return withRefresh(() =>
                run(() => updateTaskStatus({ taskId, status }), {
                    successMessage: 'Cập nhật trạng thái thành công',
                    errorMessage: 'Cập nhật trạng thái thất bại',
                })
            )
        },

        async onMarkDone(taskId) {
            return withRefresh(() =>
                run(() => markTaskDone({ taskId }), {
                    successMessage: 'Yêu cầu duyệt hoàn tất',
                    errorMessage: 'Không thể đánh dấu hoàn tất',
                })
            )
        },

        async onUpdatePlan(taskId, plannedStartAt, plannedDueAt) {
            return withRefresh(() =>
                run(() => updateTaskPlan({ taskId, plannedStartAt: plannedStartAt ?? null, plannedDueAt: plannedDueAt ?? null }), {
                    successMessage: 'Cập nhật kế hoạch thành công',
                    errorMessage: 'Cập nhật kế hoạch thất bại',
                })
            )
        },

        async onCancel(taskId) {
            return withRefresh(() =>
                run(() => cancelTask({ taskId }), {
                    successMessage: 'Đã huỷ task',
                    errorMessage: 'Huỷ task thất bại',
                })
            )
        },
    }
}
