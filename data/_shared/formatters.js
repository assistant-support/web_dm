// data/_shared/formatters.js
// Tác dụng file: Pure formatter helpers cho hiển thị (ngày giờ, time-ago, link Drive, view models cho Task/Project/Attachment).

import { TASK_STATUS, FILE_KIND } from '@/model/common/enums.js';
import {
    getStatusMeta,
    getPriorityMeta,
} from '@/data/_shared/constants.js';

/**
 * Định dạng ngày bằng Intl.DateTimeFormat.
 * @param {Date|string|number|null|undefined} date
 * @param {string} [locale='vi-VN']
 * @param {Intl.DateTimeFormatOptions} [opts]
 * @returns {string}
 */
export function formatDate(date, locale = 'vi-VN', opts) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const options =
        opts ||
        { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    return new Intl.DateTimeFormat(locale, options).format(d);
}

/**
 * Chuỗi "khoảng thời gian trước" ngắn gọn (tiếng Việt).
 * @param {Date|string|number} date
 * @param {Date} [now=new Date()]
 * @param {string} [locale='vi-VN']
 * @returns {string}
 */
export function timeAgo(date, now = new Date(), locale = 'vi-VN') {
    void locale; // hiện chưa dùng để rẽ nhánh locale khác
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const diffMs = now - d;
    const sec = Math.round(diffMs / 1000);
    if (sec < 45) return 'vừa xong';
    const min = Math.round(sec / 60);
    if (min < 60) return `${min} phút trước`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} giờ trước`;
    const day = Math.round(hr / 24);
    if (day < 30) return `${day} ngày trước`;
    const mon = Math.round(day / 30);
    if (mon < 12) return `${mon} tháng trước`;
    const yr = Math.round(mon / 12);
    return `${yr} năm trước`;
}

/**
 * Dựng link Google Drive từ id.
 * @param {string} id
 * @param {'view'|'download'|'thumbnail'} [kind='view']
 * @returns {string}
 */
export function driveLinkFromId(id, kind = 'view') {
    if (!id) return '';
    switch (kind) {
        case 'download':
            return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
        case 'thumbnail':
            return `https://drive.google.com/thumbnail?authuser=0&sz=w320&id=${encodeURIComponent(id)}`;
        case 'view':
        default:
            return `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
    }
}

/**
 * Chuẩn hoá Task thành view-model an toàn cho UI.
 * KHÔNG mutate input.
 * @param {object} task
 * @param {{ locale?: string, now?: Date }} [options]
 * @returns {object}
 */
export function formatTask(task, { locale = 'vi-VN', now = new Date() } = {}) {
    const t = task || {};
    const id = t._id?.toString?.() ?? t.id ?? null;

    const statusMeta = getStatusMeta(t.status);
    const priorityMeta = getPriorityMeta(t.priority);

    const plannedStart = t.plannedStartAt ? new Date(t.plannedStartAt) : null;
    const plannedDue = t.plannedDueAt ? new Date(t.plannedDueAt) : null;

    const startTxt = plannedStart ? formatDate(plannedStart, locale) : '';
    const dueTxt = plannedDue ? formatDate(plannedDue, locale) : '';
    const plannedRangeText = startTxt && dueTxt ? `${startTxt} – ${dueTxt}` : (startTxt || dueTxt || '');

    const isCompleted = t.status === TASK_STATUS.COMPLETED;
    const isOverdue = !!(plannedDue && plannedDue < now && !isCompleted);

    let progress = 0;
    if (t.status === TASK_STATUS.IN_PROGRESS) progress = 50;
    if (isCompleted) progress = 100;

    return {
        ...t,
        id,
        statusLabel: statusMeta.label,
        statusColor: statusMeta.color,
        statusOrder: statusMeta.order,
        priorityLabel: priorityMeta.label,
        priorityColor: priorityMeta.color,
        priorityOrder: priorityMeta.order,
        plannedRangeText,
        isOverdue,
        progress,
        commentsCount: t?.commentsCount ?? 0,
        attachmentsCount: t?.attachmentsCount ?? 0,
    };
}

/**
 * Chuẩn hoá Project cho UI (không mutate input).
 * @param {object} project
 * @param {{ locale?: string }} [options]
 * @returns {object}
 */
export function formatProject(project, { locale = 'vi-VN' } = {}) {
    const p = project || {};
    const id = p._id?.toString?.() ?? p.id ?? null;

    const startTxt = p.startDate ? formatDate(p.startDate, locale) : '';
    const dueTxt = p.dueDate ? formatDate(p.dueDate, locale) : '';
    const dateRangeText = startTxt && dueTxt ? `${startTxt} – ${dueTxt}` : (startTxt || dueTxt || '');

    const prMeta = getPriorityMeta(p.priority);

    return {
        ...p,
        id,
        dateRangeText,
        ...(p.priority
            ? { priorityLabel: prMeta.label, priorityColor: prMeta.color, priorityOrder: prMeta.order }
            : {}),
    };
}

/**
 * Chuẩn hoá Attachment cho UI (không mutate input).
 * Nếu có driveFileId -> thêm link view/download/thumbnail.
 * @param {object} att
 * @param {{ locale?: string }} [options]
 * @returns {object}
 */
export function formatAttachment(att, { locale = 'vi-VN' } = {}) {
    void locale; // hiện không dùng
    const a = att || {};
    const id = a._id?.toString?.() ?? a.id ?? null;

    const driveViewUrl = a.driveFileId ? driveLinkFromId(a.driveFileId, 'view') : '';
    const driveDownloadUrl = a.driveFileId ? driveLinkFromId(a.driveFileId, 'download') : '';
    const driveThumbnailUrl = a.driveFileId ? driveLinkFromId(a.driveFileId, 'thumbnail') : '';

    const kindMap = {
        [FILE_KIND.IMAGE]: 'Ảnh',
        [FILE_KIND.VIDEO]: 'Video',
        [FILE_KIND.DOC]: 'Tài liệu',
        [FILE_KIND.OTHER]: 'Khác',
    };
    const kindLabel = kindMap?.[a.kind] || 'Khác';

    return {
        ...a,
        id,
        driveViewUrl,
        driveDownloadUrl,
        driveThumbnailUrl,
        kindLabel,
    };
}
