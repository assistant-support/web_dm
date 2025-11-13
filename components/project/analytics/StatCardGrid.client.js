'use client';

import PropTypes from 'prop-types';
import { clsx } from 'clsx';

const STAT_CARDS = [
    {
        key: 'totalTasks',
        label: 'Tổng số công việc',
        accent: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    {
        key: 'completedTasks',
        label: 'Đã hoàn thành',
        accent: 'bg-green-100 text-green-700 border-green-200',
    },
    {
        key: 'inProgressTasks',
        label: 'Đang thực hiện',
        accent: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    {
        key: 'totalPointsAwarded',
        label: 'Điểm thưởng',
        accent: 'bg-purple-100 text-purple-700 border-purple-200',
        format: (val) => new Intl.NumberFormat('vi-VN').format(val),
    },
];

export default function StatCardGrid({ stats = {} }) {
    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {STAT_CARDS.map((card) => {
                const rawValue = stats[card.key] ?? 0;
                const displayValue = card.format ? card.format(rawValue) : rawValue;

                return (
                    <article
                        key={card.key}
                        className={clsx(
                            'flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                            card.accent
                        )}
                    >
                        <span className="text-sm font-medium uppercase tracking-wide text-gray-600">
                            {card.label}
                        </span>
                        <span className="mt-4 text-3xl font-semibold">
                            {displayValue}
                        </span>
                    </article>
                );
            })}
        </section>
    );
}

StatCardGrid.propTypes = {
    stats: PropTypes.shape({
        totalTasks: PropTypes.number,
        completedTasks: PropTypes.number,
        inProgressTasks: PropTypes.number,
        totalPointsAwarded: PropTypes.number,
    }),
};
