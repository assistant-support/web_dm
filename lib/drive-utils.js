// lib/drive-utils.js
// Helper utilities for Google Drive integrations shared across server/client code.

const DRIVE_VIEW_PREFIX = 'https://drive.google.com/file/d/';
const HTTP_URL_REGEX = /^https?:\/\//i;

function resolveOrigin(providedOrigin) {
    if (providedOrigin && providedOrigin.trim()) {
        return providedOrigin;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }
    if (typeof process !== 'undefined') {
        const envOrigin =
            process.env.NEXT_PUBLIC_APP_URL ||
            process.env.APP_ORIGIN ||
            process.env.APP_URL ||
            '';
        if (envOrigin) {
            return envOrigin;
        }
    }
    return null;
}

function toAbsoluteUrl(url, origin) {
    if (!url) return null;
    if (HTTP_URL_REGEX.test(url)) {
        return url;
    }
    const base = resolveOrigin(origin);
    if (!base) {
        return null;
    }
    if (url.startsWith('/')) {
        return `${base}${url}`;
    }
    return `${base}/${url}`;
}

/**
 * Build a shareable Google Drive link for the given file metadata.
 * Prefers existing Drive share URLs, falling back to computed variants.
 *
 * @param {object} file - Attachment/Drive file metadata.
 * @param {object} [options]
 * @param {string} [options.origin] - Explicit origin for relative fallbacks.
 * @returns {string|null}
 */
export function getGoogleDriveShareableLink(file, options = {}) {
    if (!file) return null;

    const candidates = [];

    const pushCandidate = (value) => {
        if (value && !candidates.includes(value)) {
            candidates.push(value);
        }
    };

    pushCandidate(file.webViewLink);
    pushCandidate(file?.access?.viewUrl);
    pushCandidate(file?.displayConfig?.urls?.view);
    pushCandidate(file?.displayConfig?.fullUrl);
    pushCandidate(file?.displayConfig?.previewUrl);
    pushCandidate(file.webContentLink);

    if (file.driveFileId) {
        pushCandidate(`${DRIVE_VIEW_PREFIX}${file.driveFileId}/view?usp=drive_link`);
    }

    pushCandidate(file?.access?.previewUrl);
    pushCandidate(file?.access?.downloadUrl);

    for (const candidate of candidates) {
        const resolved = toAbsoluteUrl(candidate, options.origin);
        if (resolved) {
            return resolved;
        }
    }

    return null;
}

function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
}

/**
 * Locate the monthly Drive folder metadata that matches the provided date.
 *
 * @param {object} project - Project document or lean object.
 * @param {Date|string|null} referenceDate - Planned date to align with.
 * @returns {{year:number, month:number, folderId:string, folderName?:string}|null}
 */
export function resolveMonthlyDriveFolder(project, referenceDate) {
    if (!project?.monthlyDriveFolders || !Array.isArray(project.monthlyDriveFolders)) {
        return null;
    }
    const date = parseDate(referenceDate);
    if (!date) {
        return null;
    }
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return (
        project.monthlyDriveFolders.find((folder) => {
            if (!folder) return false;
            const folderYear = Number(folder.year);
            const folderMonth = Number(folder.month);
            return folderYear === year && folderMonth === month && typeof folder.folderId === 'string' && folder.folderId;
        }) || null
    );
}

/**
 * Resolve only the folderId for the project monthly folder matching the date.
 *
 * @param {object} project - Project document or lean object.
 * @param {Date|string|null} referenceDate - Planned date to align with.
 * @returns {string|null}
 */
export function resolveMonthlyDriveFolderId(project, referenceDate) {
    const folder = resolveMonthlyDriveFolder(project, referenceDate);
    return folder?.folderId || null;
}
