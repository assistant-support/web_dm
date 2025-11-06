// components/project/analytics/ProjectHotLists.client.js
'use client';

import Link from 'next/link';
import { AlertTriangle, Eye, AlertCircle } from 'lucide-react';
import { t } from '@/lib/i18n-vi';
import UserDisplay from '@/components/ui/user-display';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// Component con cho một task item
function HotTaskItem({ task, usersMap, icon: Icon, iconColor }) {
    const assigneeInfo = usersMap[task.assignee];
    const timeAgo = formatDistanceToNow(new Date(task.dueDate || task.updatedAt), {
        addSuffix: true,
        locale: vi
    });

    return (
        <Link href={`/projects/${task.project}/tasks/${task._id}`}>
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                <Icon className={`h-4 w-4 ${iconColor} mt-1 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{task.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <UserDisplay
                            userId={task.assignee}
                            userInfo={assigneeInfo}
                            size="xs"
                            showAvatar={true}
                        />
                        <span className="text-xs text-gray-500">• {timeAgo}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default function ProjectHotLists({ projectId, overdueTasks, reviewTasks, usersMap }) {
    return (
        <div className="space-y-6">
            {/* Tasks Quá Hạn */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <h3 className="text-base font-semibold text-gray-900">
                        {t('task.overdue')} ({overdueTasks.length})
                    </h3>
                </div>
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto scrollbar-thin">
                    {overdueTasks.length > 0 ? (
                        overdueTasks.map(task => (
                            <HotTaskItem
                                key={task._id}
                                task={task}
                                usersMap={usersMap}
                                icon={AlertTriangle}
                                iconColor="text-red-500"
                            />
                        ))
                    ) : (
                        <p className="p-4 text-sm text-gray-500 text-center">{t('common.noData')}</p>
                    )}
                </div>
            </div>

            {/* Tasks Chờ Review */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
                    <Eye className="h-5 w-5 text-orange-600" />
                    <h3 className="text-base font-semibold text-gray-900">
                        {t('taskStatus.completed_await_review')} ({reviewTasks.length})
                    </h3>
                </div>
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto scrollbar-thin">
                    {reviewTasks.length > 0 ? (
                        reviewTasks.map(task => (
                            <HotTaskItem
                                key={task._id}
                                task={task}
                                usersMap={usersMap}
                                icon={Eye}
                                iconColor="text-orange-500"
                            />
                        ))
                    ) : (
                        <p className="p-4 text-sm text-gray-500 text-center">{t('common.noData')}</p>
                    )}
                </div>
            </div>
        </div>
    );
}