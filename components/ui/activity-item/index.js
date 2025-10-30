// components/ui/activity-item/index.js
// Component hiển thị một activity log item với icon, user info, và timestamp

'use client';

import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import UserDisplay from '@/components/ui/user-display'; // Chỉ cần import UserDisplay
import { getActivityConfig, formatActivityMessage } from '@/lib/activity-types';

export default function ActivityItem({
    activity,
    userInfo, // User info cho actor (người thực hiện)
    showPayload = false // Giữ lại tùy chọn này cho debug nếu cần
}) {
    const config = getActivityConfig(activity.type);
    const Icon = config.icon;

    // Hàm này giờ trả về message chi tiết hơn (đã dịch)
    const actionMessage = formatActivityMessage(activity.type, activity.payload);

    const timeAgo = formatDistanceToNow(new Date(activity.createdAt), {
        addSuffix: true,
        locale: vi
    });

    // Lấy targetUserId nếu có (cho member actions, assignee changes)
    const targetUserId = activity.payload?.userId;
    if (actionMessage == 'hoạt động không xác định') {
        console.log(activity);

    }
    return (
        <div className="grid grid-cols-[auto,1fr,auto] items-start gap-x-3">
            {/* Cột 1: Icon */}


            {/* Cột 2: Nội dung chính */}
            <div className="min-w-0 pt-0.5 flex gap-3 items-center">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bg} flex items-center justify-center mt-0.5`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div className='flex-col'>
                    <div className="text-sm flex flex-wrap items-center gap-x-1"> {/* Dùng flex-wrap */}
                        {/* Actor */}
                        <UserDisplay
                            showAvatar={false}
                            userId={activity.actor}
                            userInfo={userInfo}
                            showJobTitle={false}
                            size="sm"
                            inline
                            className="font-medium text-gray-900"
                        />
                        {/* Action Message */}
                        <span className="text-gray-600">{actionMessage}</span>

                        {/* Target User (nếu có) */}
                        {targetUserId && (
                            // Render tên target user ngay sau action message
                            <UserDisplay
                                userId={targetUserId}
                                showAvatar={false}
                                showJobTitle={false}
                                size="sm"
                                inline
                                className="font-medium text-gray-900"
                            />
                        )}
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap pt-1">
                        {timeAgo}
                    </div>
                </div>
                {/* Payload Raw (for debug) */}
                {showPayload && activity.payload && Object.keys(activity.payload).length > 0 && (
                    <div className="mt-1 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200 overflow-x-auto">
                        <pre className="whitespace-pre-wrap break-all">
                            <code>{JSON.stringify(activity.payload, null, 2)}</code>
                        </pre>
                    </div>
                )}
            </div>

            {/* Cột 3: Thời gian */}

        </div>
    );
}