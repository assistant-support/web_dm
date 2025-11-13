'use client';

import React from 'react';

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * @param {string|null|undefined} value
 * @returns {string}
 */
function formatDateTime(value) {
  if (!value) return 'Chưa đặt';
  const date = new Date(value);
  // Invalid date guard
  if (Number.isNaN(date.getTime())) return 'Không hợp lệ';
  return dateTimeFormatter.format(date);
}

/**
 * Render badges for tags.
 * @param {string[]|undefined|null} tags
 * @returns {React.ReactNode}
 */
function renderTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return <span className="text-xs text-gray-400">Không có nhãn</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

/**
 * @typedef {Object} TaskPreviewCardProps
 * @property {Record<string, any>} task
 */

/**
 * Presentational card summarising an agent-suggested task payload.
 *
 * @param {TaskPreviewCardProps} props
 * @returns {JSX.Element}
 */
export default function TaskPreviewCard({ task, availableProjects = [] }) {
  if (!task) {
    return null;
  }

  // Get project name from ID
  const getProjectName = () => {
    const projectId = task.project_id || task.project;
    if (!projectId || projectId === 'null') return 'Chưa gán';
    
    const project = availableProjects.find(p => p.id === projectId || p._id === projectId);
    return project ? project.name : projectId;
  };

  return (
    <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-gray-800">
      <header className="mb-3">
        <h3 className="text-base font-semibold text-indigo-900">Xem trước công việc</h3>
      </header>
      <dl className="space-y-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-indigo-600">Tên</dt>
          <dd className="text-sm font-medium text-gray-900">{task.name || 'Chưa rõ'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-indigo-600">Mô tả</dt>
          <dd className="text-sm text-gray-700">{task.description || 'Không có mô tả'}</dd>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-indigo-600">Loại</dt>
            <dd className="text-sm text-gray-700">{task.type || 'Không xác định'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-indigo-600">Ưu tiên</dt>
            <dd className="text-sm text-gray-700">{task.priority || 'medium'}</dd>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-indigo-600">Điểm</dt>
            <dd className="text-sm text-gray-700">{task.point ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-indigo-600">Dự án</dt>
            <dd className="text-sm font-medium text-indigo-700">{getProjectName()}</dd>
          </div>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-indigo-600">Nhãn</dt>
          <dd>{renderTags(task.tags)}</dd>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-indigo-600">Bắt đầu</dt>
            <dd className="text-sm text-gray-700">{formatDateTime(task.start_datetime)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-indigo-600">Kết thúc</dt>
            <dd className="text-sm text-gray-700">{formatDateTime(task.end_datetime)}</dd>
          </div>
        </div>
      </dl>
    </section>
  );
}
