// /lib/drive.js
// Tác dụng file: SDK Drive mockable (server-only).
// - Thiếu env => chạy MOCK (trả id giả & console.info).
// - Có env => hiện là STUB (trả tương đương mock), sẵn sàng nâng cấp tích hợp thật.

'use server';

const HAS_ENV =
    !!process.env.GOOGLE_PROJECT_ID &&
    !!process.env.GOOGLE_CLIENT_EMAIL &&
    !!process.env.GOOGLE_PRIVATE_KEY;

function rid(prefix = 'drv_') {
    try {
        return prefix + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    } catch {
        return prefix + Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-8);
    }
}

async function mockCreate(name, parentId) {
    const id = rid();
    console.info('[DRIVE:MOCK] create', { name, parentId, id });
    return { id, name, ...(parentId ? { parents: [parentId] } : {}) };
}
async function mockRename(fileId, newName) {
    console.info('[DRIVE:MOCK] rename', { fileId, newName });
    return { id: fileId, name: newName };
}
async function mockUpload({ name, mime, parentId, buffer }) {
    const id = rid();
    console.info('[DRIVE:MOCK] upload', { name, mime, parentId, size: buffer?.length || 0, id });
    return {
        id,
        name,
        parents: [parentId].filter(Boolean),
        webViewLink: `https://drive.google.com/file/d/${id}/view`,
        webContentLink: `https://drive.google.com/uc?export=download&id=${id}`,
        size: buffer?.length || 0,
    };
}
async function mockMove(fileId, newParentId) {
    console.info('[DRIVE:MOCK] move', { fileId, newParentId });
    return { id: fileId, parents: [newParentId] };
}
async function mockDelete(fileId, hard) {
    console.info('[DRIVE:MOCK] delete', { fileId, hard });
    return { id: fileId, ok: true };
}

// === STUBs (ENV có mặt nhưng chưa gọi Google APIs thật) ===
async function realCreate(name, parentId) {
    console.info('[DRIVE:STUB] create (env present — returning stub)', { name, parentId });
    return mockCreate(name, parentId);
}
async function realRename(fileId, newName) {
    console.info('[DRIVE:STUB] rename (env present — returning stub)', { fileId, newName });
    return mockRename(fileId, newName);
}
async function realUpload(args) {
    console.info('[DRIVE:STUB] upload (env present — returning stub)', { ...args, buffer: undefined });
    return mockUpload(args);
}
async function realMove(fileId, newParentId) {
    console.info('[DRIVE:STUB] move (env present — returning stub)', { fileId, newParentId });
    return mockMove(fileId, newParentId);
}
async function realDelete(fileId, hard) {
    console.info('[DRIVE:STUB] delete (env present — returning stub)', { fileId, hard });
    return mockDelete(fileId, hard);
}

// === Public API ===
export async function createProjectFolder(projectName, parentId = process.env.DRIVE_ROOT_FOLDER_ID || null) {
    return HAS_ENV ? realCreate(projectName, parentId) : mockCreate(projectName, parentId);
}
export async function createTaskFolder(taskTitle, projectFolderId) {
    return HAS_ENV ? realCreate(taskTitle, projectFolderId) : mockCreate(taskTitle, projectFolderId);
}
export async function renameFile(fileId, newName) {
    return HAS_ENV ? realRename(fileId, newName) : mockRename(fileId, newName);
}
export async function uploadFile({ name, mime, parentId, buffer }) {
    return HAS_ENV ? realUpload({ name, mime, parentId, buffer }) : mockUpload({ name, mime, parentId, buffer });
}
export async function moveFile(fileId, newParentId) {
    return HAS_ENV ? realMove(fileId, newParentId) : mockMove(fileId, newParentId);
}
export async function deleteFile(fileId, hard = false) {
    return HAS_ENV ? realDelete(fileId, hard) : mockDelete(fileId, hard);
}
