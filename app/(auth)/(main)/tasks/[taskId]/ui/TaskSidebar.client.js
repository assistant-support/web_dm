// app/(auth)/(main)/tasks/[taskId]/ui/TaskSidebar.client.js
'use client';

import { useMemo } from 'react';
import {
    User, Briefcase, Tag, Users as UsersIcon, Folder as FolderIcon,
    CalendarDays, Clock, UserCheck
} from 'lucide-react';
import clsx from 'clsx';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { vi } from 'date-fns/locale';
import Link from 'next/link';
// [THÊM] Import driveImage
import { driveImage } from '@/functions';

// --- Helpers ---

// Định dạng ngày (Giữ nguyên)
const fmt = (d, includeTime = false) => {
    if (!d) return '—';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return '—';
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        if (includeTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
        return new Intl.DateTimeFormat('vi-VN', options).format(date);
    } catch (e) { console.error("Error formatting date:", d, e); return '—'; }
};

// Định dạng thời gian tương đối (Giữ nguyên)
const formatRelativeTime = (dateString) => {
    if (!dateString) return null;
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        return formatDistanceToNowStrict(date, { addSuffix: true, locale: vi });
    } catch (e) { console.error("Error formatting relative time:", dateString, e); return null; }
};

// [THAY ĐỔI] Component Avatar (Sử dụng driveImage)
const Avatar = ({ name, src, size = 'xs', className = '' }) => {
    const sizeClasses = {
        'xs': 'w-5 h-5 text-[10px]',
        'sm': 'w-6 h-6 text-xs',
    };
    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

    // Sử dụng hàm driveImage để lấy URL cuối cùng
    const finalSrc = driveImage(src);

    if (finalSrc) {
        return (
            <img
                // eslint-disable-next-line @next/next/no-img-element
                src={finalSrc}
                alt={name || 'Avatar'}
                className={clsx("rounded-full object-cover", sizeClasses[size], className)}
                // Optional: Add onError for fallback if image fails to load
                onError={(e) => { e.currentTarget.style.display = 'none'; /* Hide broken image */ }}
            />
        );
    }

    // Fallback hiển thị initials nếu không có ảnh
    return (
        <div
            className={clsx(
                "rounded-full flex items-center justify-center font-medium bg-gray-200 text-gray-600",
                sizeClasses[size],
                className
            )}
            title={name}
        >
            {initials}
        </div>
    );
};


// Component InfoRow (Giữ nguyên)
const InfoRow = ({ icon: Icon, label, children }) => (
    <div className="flex items-start gap-3 py-2">
        <div className="flex-shrink-0 w-5 pt-0.5">
            <Icon className="h-4 w-4 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
            <dd className="text-sm text-gray-900 mt-0.5">{children}</dd>
        </div>
    </div>
);

// Component UserDisplay (Giữ nguyên logic, gọi Avatar đã cập nhật)
const UserDisplay = ({ userObject, userId, allUsers, fallbackText = "Không rõ" }) => {
    const user = userObject || (userId ? allUsers.find(u => u.id === userId || u.externalUserId === userId) : null); // Thêm check externalUserId

    if (!user) {
        return <span className="text-sm text-gray-500 italic">{fallbackText}</span>;
    }

    const avatarUrl = user.avatarUrl || user.avatar;

    return (
        <div className="flex items-center gap-1.5">
            {/* Avatar component sẽ tự động gọi driveImage */}
            <Avatar name={user.name} src={avatarUrl} size="xs" />
            <span className="text-sm font-medium text-gray-800">{user.name || user.label}</span>
        </div>
    );
};


// --- Main Sidebar Component ---

export default function TaskSidebar({
    task,
    allUsersWithDetails,
    workTypes = [],
    platforms = [],
    currentUser,
    canManage
}) {

    // --- Tính toán thông tin chi tiết (Giữ nguyên) ---
    const workTypeInfo = useMemo(() => {
        if (!task.workType || !Array.isArray(workTypes)) return null;
        return workTypes.find(wt => wt.code === task.workType);
    }, [task.workType, workTypes]);

    const platformInfos = useMemo(() => {
        if (!task.platforms || !Array.isArray(platforms)) return [];
        return task.platforms; // Giả định đã được populate
    }, [task.platforms, platforms]);

    // --- Mock Activity Data (Giữ nguyên) ---
    const mockActivity = [
        {
            id: 1,
            userId: task.createdBy,
            action: "đã tạo nhiệm vụ.",
            time: task.createdAt
        },
        ...(task.assignee ? [{
            id: 2,
            userId: task.createdBy,
            action: `đã gán cho`,
            targetUser: task.assignee,
            time: task.assigneeConfirm?.confirmedAt || task.createdAt
        }] : []),
        ...(task.assigneeConfirm?.confirmedAt ? [{
            id: 3,
            userId: task.assignee,
            action: "đã xác nhận nhiệm vụ.",
            time: task.assigneeConfirm.confirmedAt
        }] : []),
        ...(task.startedAt ? [{
            id: 4,
            userId: task.assignee,
            action: "đã bắt đầu làm việc.",
            time: task.startedAt
        }] : [])
    ]
        .filter(activity => activity.userId)
        .sort((a, b) => new Date(b.time) - new Date(a.time));

    return (
        <div className="flex-shrink-0 lg:w-80 xl:w-96 space-y-4">

            {/* --- 1. Thông tin chi tiết (Giữ nguyên) --- */}
            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-800">Thông tin chi tiết</h3>
                </div>
                <div className="px-4 py-2">
                    <div className="divide-y divide-gray-100">
                        <InfoRow icon={FolderIcon} label="Dự án">
                            {task.project?._id ? (
                                <Link href={`/projects/${task.project._id}`} className="text-sm font-medium text-blue-600 hover:underline">
                                    {task.project.name || 'Xem dự án'}
                                </Link>
                            ) : (
                                <span className="text-sm text-gray-500 italic">Không thuộc dự án</span>
                            )}
                        </InfoRow>
                        <InfoRow icon={User} label="Người tạo">
                            <UserDisplay userObject={task.createdBy} allUsers={allUsersWithDetails} />
                        </InfoRow>
                        <InfoRow icon={UserCheck} label="Người thực hiện">
                            <UserDisplay userObject={task.assignee} allUsers={allUsersWithDetails} fallbackText="Chưa gán" />
                        </InfoRow>
                        {workTypeInfo && (
                            <InfoRow icon={Briefcase} label="Loại công việc">
                                <span className="text-sm text-gray-800">{workTypeInfo.name}</span>
                            </InfoRow>
                        )}
                        {platformInfos.length > 0 && (
                            <InfoRow icon={Tag} label="Platform">
                                <div className="flex flex-wrap gap-1.5">
                                    {platformInfos.map((p, idx) => (
                                        <Badge key={p._id || idx} variant="outline" className="text-xs font-normal">{p.name}</Badge>
                                    ))}
                                </div>
                            </InfoRow>
                        )}
                        <InfoRow icon={UsersIcon} label="Người theo dõi">
                            {task.watchers && task.watchers.length > 0 ? (
                                <span className="text-sm text-gray-800">{task.watchers.length} người</span>
                            ) : (
                                <span className="text-sm text-gray-500 italic">Không có</span>
                            )}
                        </InfoRow>
                        <InfoRow icon={CalendarDays} label="Ngày tạo">
                            <span className="text-sm text-gray-800" title={fmt(task.createdAt, true)}>
                                {fmt(task.createdAt, false)} ({formatRelativeTime(task.createdAt)})
                            </span>
                        </InfoRow>
                        <InfoRow icon={Clock} label="Cập nhật lần cuối">
                            <span className="text-sm text-gray-800" title={fmt(task.updatedAt, true)}>
                                {fmt(task.updatedAt, false)} ({formatRelativeTime(task.updatedAt)})
                            </span>
                        </InfoRow>
                    </div>
                </div>
            </div>

            {/* --- 2. Danh sách hành động (Giữ nguyên) --- */}
            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-800">Hoạt động</h3>
                </div>
                <div className="px-4 py-3 max-h-96 overflow-y-auto custom-scrollbar">
                    <ul className="space-y-3">
                        {mockActivity.map(activity => (
                            <li key={activity.id} className="flex items-start gap-2">
                                <div className="flex-shrink-0 pt-0.5">
                                    <UserDisplay userId={activity.userId} allUsers={allUsersWithDetails} />
                                </div>
                                <div className="flex-1 text-sm text-gray-600">
                                    {activity.action}
                                    {activity.targetUser && (
                                        <div className="inline-block ml-1">
                                            <UserDisplay userId={activity.targetUser} allUsers={allUsersWithDetails} />
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-400 mt-0.5" title={fmt(activity.time, true)}>
                                        {formatRelativeTime(activity.time)}
                                    </p>
                                </div>
                            </li>
                        ))}
                        {mockActivity.length === 0 && (
                            <li className="text-center text-sm text-gray-400 py-4">
                                Chưa có hoạt động nào.
                            </li>
                        )}
                        <li className="text-center text-xs text-gray-400 pt-2">
                            --- Hoạt động gần đây  ---
                        </li>
                    </ul>
                </div>
            </div>

        </div>
    );
}