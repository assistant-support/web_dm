// components/tasks/WorkflowVisual.client.js
// Simple workflow visualization using SVG - shows task progress flow

'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Clock, XCircle } from 'lucide-react';
import { getTaskWorkflow } from '@/data/workflow/actions/server';

/**
 * WorkflowVisual - Hiển thị workflow visual đơn giản
 * 
 * @param {Object} props
 * @param {string} props.taskId - Task ID
 * @param {Object} props.task - Task object with subtasks
 */
export default function WorkflowVisual({ taskId, task }) {
    const [workflow, setWorkflow] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadWorkflow();
    }, [taskId]);

    const loadWorkflow = async () => {
        setIsLoading(true);
        try {
            const result = await getTaskWorkflow(taskId);
            if (result.ok && result.data) {
                setWorkflow(result.data);
            }
        } catch (err) {
            console.error('Load workflow error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Nếu không có workflow, hiển thị simple progress flow
    if (isLoading) {
        return (
            <div className="p-4 text-center text-sm text-gray-500">
                Đang tải workflow...
            </div>
        );
    }

    // Simple flow: Parent Task → Subtasks → Completion
    const progress = task.progress || { total: 0, completed: 0, percentage: 0 };
    const hasSubtasks = progress.total > 0;

    if (!hasSubtasks) {
        return (
            <div className="p-4 text-center text-sm text-gray-500 border border-gray-200 border-dashed rounded-lg">
                Chưa có subtasks. Thêm subtask để xem workflow.
            </div>
        );
    }

    const stages = [
        {
            id: 'parent',
            label: 'Task chính',
            status: getParentStatus(task.status),
            description: task.title,
        },
        {
            id: 'subtasks',
            label: `Subtasks (${progress.completed}/${progress.total})`,
            status: getSubtasksStatus(progress),
            description: `${progress.percentage}% hoàn thành`,
        },
        {
            id: 'approval',
            label: 'Phê duyệt cuối',
            status: getApprovalStatus(task.status),
            description: task.status === 'completed' ? 'Đã duyệt' : 'Chờ duyệt',
        },
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Workflow Progress</h3>
            
            {/* Visual Flow */}
            <div className="relative">
                <div className="flex items-center justify-between">
                    {stages.map((stage, idx) => (
                        <div key={stage.id} className="flex items-center flex-1">
                            {/* Stage Node */}
                            <div className="flex flex-col items-center flex-1">
                                {/* Icon */}
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center
                                    ${stage.status === 'completed' ? 'bg-green-100 border-2 border-green-500' : ''}
                                    ${stage.status === 'in_progress' ? 'bg-blue-100 border-2 border-blue-500' : ''}
                                    ${stage.status === 'pending' ? 'bg-gray-100 border-2 border-gray-300' : ''}
                                    ${stage.status === 'blocked' ? 'bg-red-100 border-2 border-red-500' : ''}
                                `}>
                                    {getStatusIcon(stage.status)}
                                </div>

                                {/* Label */}
                                <div className="mt-2 text-center">
                                    <p className="text-sm font-medium text-gray-900">
                                        {stage.label}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {stage.description}
                                    </p>
                                </div>
                            </div>

                            {/* Connector Line */}
                            {idx < stages.length - 1 && (
                                <div className="flex-1 relative" style={{ maxWidth: '100px' }}>
                                    <div className={`
                                        h-0.5 w-full
                                        ${stage.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}
                                    `} />
                                    {/* Arrow */}
                                    <div className={`
                                        absolute right-0 top-1/2 -translate-y-1/2
                                        w-0 h-0 border-t-4 border-b-4 border-l-8
                                        border-transparent
                                        ${stage.status === 'completed' ? 'border-l-green-500' : 'border-l-gray-300'}
                                    `} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                    <span>Tiến độ tổng thể</span>
                    <span className="font-medium">{progress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Tổng</p>
                    <p className="text-lg font-semibold text-gray-900">{progress.total}</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                    <p className="text-xs text-blue-600">Đang làm</p>
                    <p className="text-lg font-semibold text-blue-600">{progress.inProgress || 0}</p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                    <p className="text-xs text-green-600">Hoàn thành</p>
                    <p className="text-lg font-semibold text-green-600">{progress.completed}</p>
                </div>
            </div>
        </div>
    );
}

// Helper functions
function getParentStatus(taskStatus) {
    if (['draft', 'pending_approval'].includes(taskStatus)) return 'pending';
    if (['completed'].includes(taskStatus)) return 'completed';
    return 'in_progress';
}

function getSubtasksStatus(progress) {
    if (progress.total === 0) return 'pending';
    if (progress.completed === progress.total) return 'completed';
    if (progress.completed > 0 || progress.inProgress > 0) return 'in_progress';
    return 'pending';
}

function getApprovalStatus(taskStatus) {
    if (taskStatus === 'completed') return 'completed';
    if (taskStatus === 'completed_await_review') return 'in_progress';
    return 'pending';
}

function getStatusIcon(status) {
    const iconClass = 'h-6 w-6';
    switch (status) {
        case 'completed':
            return <CheckCircle className={`${iconClass} text-green-600`} />;
        case 'in_progress':
            return <Clock className={`${iconClass} text-blue-600`} />;
        case 'blocked':
            return <XCircle className={`${iconClass} text-red-600`} />;
        default:
            return <Circle className={`${iconClass} text-gray-400`} />;
    }
}
