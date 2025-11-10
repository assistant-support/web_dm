import Link from 'next/link';
import Image from 'next/image';
import clsx from 'clsx';
import {
    User as UserIcon,
    Briefcase,
    Tag,
    Users as UsersIcon,
    Folder as FolderIcon,
    CalendarDays,
    Clock,
    UserCheck,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { vi } from 'date-fns/locale';
import Badge from '@/components/ui/badge';
import { driveImage } from '@/functions';
import WatcherToggleButton from './WatcherToggleButton.client';

const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

function formatAbsolute(dateInput, includeTime = false) {
    if (!dateInput) return '—';
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(date.getTime())) return '—';

    if (!includeTime) {
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(date);
    }

    return DATE_FORMATTER.format(date);
}

function formatRelative(dateInput) {
    if (!dateInput) return null;
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(date.getTime())) return null;

    return formatDistanceToNowStrict(date, { addSuffix: true, locale: vi });
}

function resolveUser(userOrId, allUsers) {
    if (!userOrId) return null;
    if (typeof userOrId === 'object') {
        return userOrId;
    }

    return (
        allUsers.find(
            (user) =>
                user.id === userOrId ||
                user.externalUserId === userOrId ||
                user._id === userOrId,
        ) || null
    );
}

function Avatar({ name, src, size = 'xs' }) {
    const dimensions = size === 'sm' ? 24 : 20;
    const initials =
        (name || '')
            .split(' ')
            .filter(Boolean)
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || '?';

    const imageSrc = src ? driveImage(src) : null;

    if (imageSrc) {
        return (
            <Image
                src={imageSrc}
                alt={name || 'Avatar'}
                width={dimensions}
                height={dimensions}
                className={clsx(
                    'rounded-full object-cover',
                    size === 'sm' ? 'h-6 w-6 text-xs' : 'h-5 w-5 text-[10px]',
                )}
                sizes={`${dimensions}px`}
            />
        );
    }

    return (
        <span
            className={clsx(
                'inline-flex items-center justify-center rounded-full bg-gray-200 font-medium text-gray-600',
                size === 'sm' ? 'h-6 w-6 text-xs' : 'h-5 w-5 text-[10px]',
            )}
        >
            {initials}
        </span>
    );
}

function UserDisplay({ user, fallback = 'Không rõ' }) {
    if (!user) {
        return <span className="text-sm text-gray-500 italic">{fallback}</span>;
    }

    const avatarSrc = user.avatarUrl || user.avatar;

    return (
        <span className="flex items-center gap-1.5">
            <Avatar name={user.name} src={avatarSrc} size="xs" />
            <span className="text-sm font-medium text-gray-800">{user.name || user.label || fallback}</span>
        </span>
    );
}

function buildActivityFeed(task) {
    const entries = [
        task.createdBy
            ? {
                  id: `created-${task._id}`,
                  user: task.createdBy,
                  action: 'đã tạo nhiệm vụ.',
                  timestamp: task.createdAt,
              }
            : null,
        task.assignee
            ? {
                  id: `assigned-${task._id}`,
                  user: task.createdBy,
                  action: 'đã gán cho',
                  target: task.assignee,
                  timestamp: task.assigneeConfirm?.confirmedAt || task.createdAt,
              }
            : null,
        task.assigneeConfirm?.confirmedAt
            ? {
                  id: `confirmed-${task._id}`,
                  user: task.assignee,
                  action: 'đã xác nhận nhiệm vụ.',
                  timestamp: task.assigneeConfirm.confirmedAt,
              }
            : null,
        task.startedAt
            ? {
                  id: `started-${task._id}`,
                  user: task.assignee,
                  action: 'đã bắt đầu làm việc.',
                  timestamp: task.startedAt,
              }
            : null,
    ].filter(Boolean);

    return entries
        .filter((entry) => entry.user)
        .sort((a, b) => {
            const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return dateB - dateA;
        });
}

export default function TaskSidebar({
    task,
    allUsersWithDetails,
    workTypes = [],
    platforms = [],
    currentUser,
}) {
    const workTypeInfo = task?.workType
        ? workTypes.find((item) => item.code === task.workType)
        : null;

    const platformInfos = Array.isArray(platforms) ? platforms : [];
    const activities = buildActivityFeed(task);

    const resolvedCreatedBy = resolveUser(task.createdBy, allUsersWithDetails || []);
    const resolvedAssignee = resolveUser(task.assignee, allUsersWithDetails || []);

    const watcherIds = Array.isArray(task.watchers) ? task.watchers : [];
    const isWatching = Boolean(
        currentUser?.externalUserId && watcherIds.includes(currentUser.externalUserId),
    );

    return (
        <aside className="flex-shrink-0 space-y-4 lg:w-80 xl:w-96">
            <section className="rounded-md border border-gray-200 bg-white shadow-sm">
                <header className="border-b border-gray-200 px-4 py-3">
                    <h3 className="text-base font-semibold text-gray-800">Thông tin chi tiết</h3>
                </header>
                <div className="px-4 py-2">
                    <dl className="divide-y divide-gray-100">
                        <div className="flex items-start gap-3 py-2">
                            <FolderIcon className="mt-0.5 h-4 w-4 text-gray-500" />
                            <div className="min-w-0 flex-1">
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Dự án
                                </dt>
                                <dd className="mt-0.5 text-sm text-gray-900">
                                    {task.project?._id ? (
                                        <Link
                                            href={`/projects/${task.project._id}`}
                                            className="font-medium text-blue-600 hover:underline"
                                        >
                                            {task.project.name || 'Xem dự án'}
                                        </Link>
                                    ) : (
                                        <span className="italic text-gray-500">Không thuộc dự án</span>
                                    )}
                                </dd>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 py-2">
                            <UserIcon className="mt-0.5 h-4 w-4 text-gray-500" />
                            <div className="min-w-0 flex-1">
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Người tạo
                                </dt>
                                <dd className="mt-0.5 text-sm text-gray-900">
                                    <UserDisplay user={resolvedCreatedBy} />
                                </dd>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 py-2">
                            <UserCheck className="mt-0.5 h-4 w-4 text-gray-500" />
                            <div className="min-w-0 flex-1">
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Người thực hiện
                                </dt>
                                <dd className="mt-0.5 text-sm text-gray-900">
                                    <UserDisplay user={resolvedAssignee} fallback="Chưa gán" />
                                </dd>
                            </div>
                        </div>

                        {workTypeInfo && (
                            <div className="flex items-start gap-3 py-2">
                                <Briefcase className="mt-0.5 h-4 w-4 text-gray-500" />
                                <div className="min-w-0 flex-1">
                                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Loại công việc
                                    </dt>
                                    <dd className="mt-0.5 text-sm text-gray-900">{workTypeInfo.name}</dd>
                                </div>
                            </div>
                        )}

                        {platformInfos.length > 0 && (
                            <div className="flex items-start gap-3 py-2">
                                <Tag className="mt-0.5 h-4 w-4 text-gray-500" />
                                <div className="min-w-0 flex-1">
                                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Platform
                                    </dt>
                                    <dd className="mt-1 flex flex-wrap gap-1.5">
                                        {platformInfos.map((platform) => (
                                            <Badge
                                                key={platform._id || platform.name}
                                                variant="outline"
                                                className="text-xs"
                                            >
                                                {platform.name}
                                            </Badge>
                                        ))}
                                    </dd>
                                </div>
                            </div>
                        )}

                        <div className="flex items-start gap-3 py-2">
                            <UsersIcon className="mt-0.5 h-4 w-4 text-gray-500" />
                            <div className="min-w-0 flex-1">
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Người theo dõi
                                </dt>
                                <dd className="mt-0.5 space-y-2 text-sm text-gray-900">
                                    <div>
                                        {watcherIds.length > 0 ? (
                                            <span className="font-medium text-gray-800">
                                                {watcherIds.length} người
                                            </span>
                                        ) : (
                                            <span className="italic text-gray-500">Không có</span>
                                        )}
                                    </div>
                                    <WatcherToggleButton
                                        taskId={task._id}
                                        initialWatching={isWatching}
                                    />
                                </dd>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 py-2">
                            <CalendarDays className="mt-0.5 h-4 w-4 text-gray-500" />
                            <div className="min-w-0 flex-1">
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Ngày tạo
                                </dt>
                                <dd className="mt-0.5 text-sm text-gray-900">
                                    <span title={formatAbsolute(task.createdAt, true)}>
                                        {formatAbsolute(task.createdAt)}{' '}
                                        {formatRelative(task.createdAt) ? (
                                            <span className="text-xs text-gray-500">
                                                ({formatRelative(task.createdAt)})
                                            </span>
                                        ) : null}
                                    </span>
                                </dd>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 py-2">
                            <Clock className="mt-0.5 h-4 w-4 text-gray-500" />
                            <div className="min-w-0 flex-1">
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Cập nhật lần cuối
                                </dt>
                                <dd className="mt-0.5 text-sm text-gray-900">
                                    <span title={formatAbsolute(task.updatedAt, true)}>
                                        {formatAbsolute(task.updatedAt)}{' '}
                                        {formatRelative(task.updatedAt) ? (
                                            <span className="text-xs text-gray-500">
                                                ({formatRelative(task.updatedAt)})
                                            </span>
                                        ) : null}
                                    </span>
                                </dd>
                            </div>
                        </div>
                    </dl>
                </div>
            </section>

            <section className="rounded-md border border-gray-200 bg-white shadow-sm">
                <header className="border-b border-gray-200 px-4 py-3">
                    <h3 className="text-base font-semibold text-gray-800">Hoạt động</h3>
                </header>
                <div className="custom-scrollbar max-h-96 overflow-y-auto px-4 py-3">
                    <ul className="space-y-3">
                        {activities.map((activity) => {
                            const actor = resolveUser(activity.user, allUsersWithDetails || []);
                            const target = activity.target
                                ? resolveUser(activity.target, allUsersWithDetails || [])
                                : null;

                            return (
                                <li key={activity.id} className="flex items-start gap-2">
                                    <div className="pt-0.5">
                                        <UserDisplay user={actor} />
                                    </div>
                                    <div className="flex-1 text-sm text-gray-600">
                                        {activity.action}
                                        {target ? (
                                            <span className="ml-1 inline-flex items-center gap-1">
                                                <UserDisplay user={target} />
                                            </span>
                                        ) : null}
                                        <p
                                            className="mt-0.5 text-xs text-gray-400"
                                            title={formatAbsolute(activity.timestamp, true)}
                                        >
                                            {formatRelative(activity.timestamp) || '—'}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}

                        {activities.length === 0 && (
                            <li className="py-4 text-center text-sm text-gray-400">
                                Chưa có hoạt động nào.
                            </li>
                        )}

                        <li className="pt-2 text-center text-xs text-gray-400">--- Hoạt động gần đây ---</li>
                    </ul>
                </div>
            </section>
        </aside>
    );
}
