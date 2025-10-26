// components/ui/activity-item/index.js
// Component hiển thị một activity log item với icon, user info, và timestamp

'use client';

import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import UserDisplay from '@/components/ui/user-display';
import { getActivityConfig, formatActivityMessage } from '@/lib/activity-types';

/**
 * ActivityItem - Hiển thị một activity log entry
 * @param {Object} props
 * @param {Object} props.activity - Activity object
 * @param {string} props.activity.actor - User ID người thực hiện
 * @param {string} props.activity.type - Loại hoạt động
 * @param {Object} props.activity.payload - Dữ liệu bổ sung
 * @param {string} props.activity.createdAt - Timestamp
 * @param {boolean} [props.showPayload=false] - Có hiển thị payload raw không
 */
export default function ActivityItem({ activity, showPayload = false }) {
    const config = getActivityConfig(activity.type);
    const Icon = config.icon;
    const message = formatActivityMessage(activity.type, activity.payload);

    return (
        <div className="flex gap-3">
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        {/* User + Action */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <UserDisplay
                                userId={activity.actor}
                                showJobTitle={false}
                                size="xs"
                                inline
                            />
                            <span className="text-sm text-gray-600">{message}</span>
                        </div>

                        {/* Payload details (optional) */}
                        {showPayload && activity.payload && Object.keys(activity.payload).length > 0 && (
                            <div className="mt-1 text-xs text-gray-500">
                                {Object.entries(activity.payload).map(([key, value]) => (
                                    <div key={key} className="inline-block mr-3">
                                        <span className="font-medium">{key}:</span> {String(value)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Timestamp */}
                    <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                            locale: vi
                        })}
                    </span>
                </div>
            </div>
        </div>
    );
}
