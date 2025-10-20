// app/hooks/useCan.js
// Cấu trúc: /app/hooks/* (Client Only)
// Mục đích: Cung cấp các helper check quyền dựa trên dữ liệu đã SSR (không gọi server).

'use client';

import { useMemo } from 'react';
import { useAuthz } from '@/context/AuthzContext.client.js';

/** Bậc vai trò để so sánh nhanh */
const RANK = {
    OWNER: 3,
    MANAGER: 2,
    MEMBER: 1,
    undefined: 0,
};

/** Chuẩn hoá role -> rank số nguyên */
function rankOf(role) {
    return RANK[role] ?? 0;
}

/**
 * Hook kiểm tra quyền (dùng role maps từ SSR).
 * @returns {{
 *   whoami: { id?: string } | null,
 *   inTeam: (teamId: string, minRole?: 'MEMBER'|'MANAGER') => boolean,
 *   inProject: (projectId: string, minRole?: 'MEMBER'|'MANAGER'|'OWNER') => boolean,
 *   manageProject: (projectId: string) => boolean,
 *   viewProject: (projectId: string) => boolean,
 *   editTask: (taskLike: { project?: string|null, createdBy?: string|null, assignee?: string|null }) => boolean
 * }}
 */
export default function useCan() {
    const { whoami, teamRoles, projectRoles } = useAuthz();

    const api = useMemo(() => {
        const uid = whoami?.id ? String(whoami.id) : null;

        /** User thuộc team với min role? */
        function inTeam(teamId, minRole = 'MEMBER') {
            const r = rankOf(teamRoles?.[String(teamId)]);
            return r >= rankOf(minRole);
        }

        /** User thuộc project với min role? */
        function inProject(projectId, minRole = 'MEMBER') {
            const r = rankOf(projectRoles?.[String(projectId)]);
            return r >= rankOf(minRole);
        }

        /** Quản lý project? (MANAGER+) */
        function manageProject(projectId) {
            return inProject(projectId, 'MANAGER');
        }

        /** Xem project? (MEMBER+) */
        function viewProject(projectId) {
            return inProject(projectId, 'MEMBER');
        }

        /**
         * Sửa task? (tối thiểu theo chuẩn B0→B7)
         * - MANAGER+ của project
         * - Hoặc chính creator/assignee của task
         */
        function editTask(taskLike = {}) {
            const pid = taskLike?.project ? String(taskLike.project) : null;
            if (pid && manageProject(pid)) return true;
            if (uid && (String(taskLike.createdBy) === uid || String(taskLike.assignee) === uid)) return true;
            return false;
        }

        return { whoami, inTeam, inProject, manageProject, viewProject, editTask };
    }, [whoami, teamRoles, projectRoles]);

    return api;
}
