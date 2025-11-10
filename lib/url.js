// lib/url.js
// Helpers to build absolute URLs based on configured base URL.
// Keep this file universal (no 'use client' / 'use server') so it can run on both sides.

const DEFAULT_BASE_URL = 'http://localhost:3000';

function normalizeBase(url) {
    if (!url) return DEFAULT_BASE_URL;
    return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function getBaseUrl() {
    if (typeof process !== 'undefined') {
        const envUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL;
        if (envUrl) return normalizeBase(envUrl);
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
        return normalizeBase(window.location.origin);
    }

    return normalizeBase(DEFAULT_BASE_URL);
}

export function buildTaskUrl(taskId) {
    return `${getBaseUrl()}/tasks/${taskId}`;
}

export function buildProjectUrl(projectId) {
    return `${getBaseUrl()}/projects/${projectId}`;
}
