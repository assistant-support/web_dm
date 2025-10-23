// app/hooks/task-board.hook.js
'use client'

import { useRouter } from 'next/navigation'
import { useAsyncNotifier } from '@/hooks/loading.hook'

// Server actions
import {
    assignTask,
    updateTaskStatus,
    updateTask,
} from '@/data/task/actions/server'

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
                run(() => assignTask(taskId, assignee), {
                    successMessage: 'Giao việc thành công',
                    errorMessage: 'Không thể giao việc',
                })
            )
        },

        async onApprove(taskId, note) {
            return withRefresh(() =>
                run(() => updateTaskStatus(taskId, 'draft'), {
                    successMessage: 'Đã duyệt task',
                    errorMessage: 'Duyệt thất bại',
                })
            )
        },

        async onReject(taskId, note) {
            return withRefresh(() =>
                run(() => updateTaskStatus(taskId, 'rejected'), {
                    successMessage: 'Đã từ chối',
                    errorMessage: 'Từ chối thất bại',
                })
            )
        },

        async onConfirmStart(taskId) {
            return withRefresh(() =>
                run(() => updateTaskStatus(taskId, 'in_progress'), {
                    successMessage: 'Đã xác nhận bắt đầu',
                    errorMessage: 'Xác nhận thất bại',
                })
            )
        },

        async onUpdateStatus(taskId, status) {
            return withRefresh(() =>
                run(() => updateTaskStatus(taskId, status), {
                    successMessage: 'Cập nhật trạng thái thành công',
                    errorMessage: 'Cập nhật trạng thái thất bại',
                })
            )
        },

        async onMarkDone(taskId) {
            return withRefresh(() =>
                run(() => updateTaskStatus(taskId, 'pending_approval'), {
                    successMessage: 'Yêu cầu duyệt hoàn tất',
                    errorMessage: 'Không thể đánh dấu hoàn tất',
                })
            )
        },

        async onUpdatePlan(taskId, plannedStartAt, plannedDueAt) {
            return withRefresh(() =>
                run(() => updateTask(taskId, { 
                    plannedStartAt: plannedStartAt ?? null, 
                    plannedDueAt: plannedDueAt ?? null 
                }), {
                    successMessage: 'Cập nhật kế hoạch thành công',
                    errorMessage: 'Cập nhật kế hoạch thất bại',
                })
            )
        },

        async onCancel(taskId) {
            return withRefresh(() =>
                run(() => updateTaskStatus(taskId, 'cancelled'), {
                    successMessage: 'Đã huỷ task',
                    errorMessage: 'Huỷ task thất bại',
                })
            )
        },
    }
}
