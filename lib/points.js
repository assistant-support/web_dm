export function resolveTaskPoints(taskLike = {}) {
    const { finalPoints, initialPoints } = taskLike ?? {};
    const raw = finalPoints ?? initialPoints ?? 0;
    const numeric = typeof raw === 'string' ? Number.parseFloat(raw) : raw;

    return Number.isFinite(numeric) ? numeric : 0;
}

export function formatTaskPoints(taskLike = {}) {
    const points = resolveTaskPoints(taskLike);
    return `${points}đ`;
}
