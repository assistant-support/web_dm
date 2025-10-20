// app/context/AuthzContext.client.js
// Cấu trúc: /app/context/* (Client Only)
// Mục đích: Chia sẻ whoami + maps vai trò (team/project) từ SSR xuống client.

'use client';

import React, { createContext, useContext, useMemo } from 'react';

/** Ngữ cảnh quyền tối giản cho client-side guard */
const AuthzContext = createContext({
    whoami: null,
    // FIX: mở rộng type hint cho teamRoles để phù hợp rank OWNER > MANAGER > MEMBER
    teamRoles: /** @type {Record<string, 'OWNER'|'MANAGER'|'MEMBER'|undefined>} */ ({}),
    projectRoles: /** @type {Record<string, 'OWNER'|'MANAGER'|'MEMBER'|undefined>} */ ({}),
    teams: /** @type {Array<{id:string, name:string, role:'OWNER'|'MANAGER'|'MEMBER'}>} */ ([]),
    projects: /** @type {Array<{id:string, name:string, role:'OWNER'|'MANAGER'|'MEMBER'}>} */ ([]),
});

/**
 * Provider bọc quanh layout chính.
 * @param {{ value: any, children: React.ReactNode }} props
 */
export function AuthzProvider({ value, children }) {
    const memo = useMemo(() => value, [value]);
    return <AuthzContext.Provider value={memo}>{children}</AuthzContext.Provider>;
}

/** Hook truy cập dữ liệu SSR đã bơm vào context */
export function useAuthz() {
    return useContext(AuthzContext);
}
