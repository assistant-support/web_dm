/**
 * Resolve task points - prioritize displayPoints if available
 * @param {Object} taskLike - Task object with points fields
 * @returns {number} - Resolved points value
 */
export function resolveTaskPoints(taskLike = {}) {
    // Use displayPoints if available (from serialize.js computed field)
    if (taskLike?.displayPoints !== undefined) {
        const numeric = typeof taskLike.displayPoints === 'string' 
            ? Number.parseFloat(taskLike.displayPoints) 
            : taskLike.displayPoints;
        return Number.isFinite(numeric) ? numeric : 0;
    }
    
    // Fallback to original logic
    const { finalPoints, initialPoints } = taskLike ?? {};
    const raw = finalPoints ?? initialPoints ?? 0;
    const numeric = typeof raw === 'string' ? Number.parseFloat(raw) : raw;

    return Number.isFinite(numeric) ? numeric : 0;
}

/**
 * Format task points with status indicator
 * @param {Object} taskLike - Task object with points and status
 * @returns {string} - Formatted points string with indicator
 */
export function formatTaskPoints(taskLike = {}) {
    const points = resolveTaskPoints(taskLike);
    
    // If task has no points, return "0đ"
    if (points === 0) {
        return '0đ';
    }
    
    // Check if points are finalized (use isPointsFinalized if available)
    const isFinalized = taskLike?.isPointsFinalized ?? false;
    
    if (isFinalized) {
        // Finalized points - return with indicator
        return `${points}đ ✓`;
    } else {
        // Expected/initial points - return with indicator
        return `${points}đ ~`;
    }
}
