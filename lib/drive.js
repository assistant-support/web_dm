// /lib/drive.js
// Mục đích: Tầng tích hợp Google Drive **thật sự** (không mock) cho Server Actions.
// - Hỗ trợ Shared Drive ("Bộ nhớ dùng chung") & My Drive.
// - Hỗ trợ Service Account + (tùy chọn) Domain-Wide Delegation (impersonation).
// - Cung cấp các API tối thiểu đáp ứng B8: createProjectFolder, createTaskFolder,
//   uploadFile, renameFile, moveFile, deleteFile.
//
// YÊU CẦU CÀI ĐẶT (dependencies):
//   npm i googleapis
//
// BIẾN MÔI TRƯỜNG BẮT BUỘC/ĐỀ XUẤT:
//   GOOGLE_CLIENT_EMAIL           — email service account (bắt buộc)
//   GOOGLE_PRIVATE_KEY            — private key service account (bắt buộc, escape \n đúng)
//   GOOGLE_DRIVE_IMPERSONATE_EMAIL — (khuyến nghị) email người dùng để SA mạo danh (DWD)
//   DRIVE_SHARED_DRIVE_ID         — (khuyến nghị) ID Shared Drive gốc để tạo folder/file
//   DRIVE_ROOT_FOLDER_ID          — (tùy chọn) fallback folder gốc (nếu không dùng Shared Drive)
//
// LƯU Ý:
// - Nếu dùng Shared Drive: luôn pass supportsAllDrives: true; khi tạo file/folder, truyền parents=[<folderId hoặc SharedDriveId>]
// - moveFile: cần đọc parents hiện tại rồi update addParents/removeParents.
// - deleteFile: nếu hard=false → chuyển thùng rác (trashed=true); hard=true → xóa hẳn.

'use server';

import { google } from 'googleapis';
import { Readable } from 'node:stream';

// ===== Auth & Drive client (cache cho HMR) ===================================

const SCOPES = ['https://www.googleapis.com/auth/drive'];

function normalizePrivateKey(k) {
    if (!k) return k;
    // Hầu hết hosting lưu \n literal → thay bằng newline thật
    return k.replace(/\\n/g, '\n');
}

/**
 * Tạo đối tượng auth cho service account (có thể mạo danh người dùng nếu có subject).
 */
function createAuth() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
    if (!clientEmail || !privateKey) {
        throw new Error('[Drive] Missing GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY');
    }

    // Dùng google.auth.JWT để hỗ trợ domain-wide delegation (subject)
    const subject = process.env.GOOGLE_DRIVE_IMPERSONATE_EMAIL || undefined;
    return new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: SCOPES,
        subject, // nếu có, SA sẽ mạo danh user này (cần bật DWD trên Admin Console)
    });
}

let __driveSingleton = globalThis.__driveSingleton;
if (!__driveSingleton) {
    __driveSingleton = globalThis.__driveSingleton = {
        drive: null,
        authEmail: null,
    };
}

/**
 * Lấy client drive v3 đã auth (singleton).
 */
async function getDrive() {
    if (__driveSingleton.drive) return __driveSingleton.drive;
    const auth = createAuth();
    const drive = google.drive({ version: 'v3', auth });
    __driveSingleton.drive = drive;
    return drive;
}

// ===== Helpers chung =========================================================

/**
 * Trả về "folder root" mặc định để tạo file/folder.
 * Ưu tiên Shared Drive nếu có, sau đó đến DRIVE_ROOT_FOLDER_ID.
 */
function getDefaultRootParentId() {
    const sharedId = process.env.DRIVE_SHARED_DRIVE_ID;
    if (sharedId) return sharedId;
    const root = process.env.DRIVE_ROOT_FOLDER_ID;
    if (root) return root;
    // Nếu không có gì, Drive vẫn cho phép tạo mà không có parents (vào My Drive của SA/subject).
    // Tuy nhiên với SA mạo danh user thì sẽ nằm trong My Drive của user đó.
    return null;
}

/**
 * Tạo folder trên Drive (trong My Drive hoặc Shared Drive).
 * @param {string} name
 * @param {string|null} parentId - id của folder cha hoặc Shared Drive ID (để tạo ở root SD)
 * @returns {Promise<{id:string, name:string, parents?:string[]}>}
 */
async function createFolder(name, parentId = getDefaultRootParentId()) {
    const drive = await getDrive();
    const requestBody = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
    };
    const { data } = await drive.files.create({
        requestBody,
        supportsAllDrives: true,
        fields: 'id, name, parents',
    });
    return { id: data.id, name: data.name, parents: data.parents };
}

/**
 * Lấy thông tin file (id, name, parents, size, webViewLink, webContentLink).
 */
async function getFile(fileId) {
    const drive = await getDrive();
    const { data } = await drive.files.get({
        fileId,
        supportsAllDrives: true,
        fields: 'id, name, parents, size, webViewLink, webContentLink, trashed',
    });
    return data;
}

// ===== API public (dùng ở B8) ===============================================

/**
 * Tạo thư mục gốc cho Project.
 */
export async function createProjectFolder(projectName, parentId = getDefaultRootParentId()) {
    return await createFolder(projectName, parentId);
}

/**
 * Tạo thư mục cho Task (nằm trong folder Project).
 */
export async function createTaskFolder(taskTitle, projectFolderId) {
    if (!projectFolderId) {
        // Nếu không có projectFolderId, vẫn tạo theo root mặc định để không lỗi luồng.
        return await createFolder(taskTitle, getDefaultRootParentId());
    }
    return await createFolder(taskTitle, projectFolderId);
}

/**
 * Upload file nhị phân lên Drive.
 * @param {{ name:string, mime:string, parentId?:string|null, buffer:Buffer }} param0
 * @returns {Promise<{id:string, name:string, parents?:string[], webViewLink?:string, webContentLink?:string, size?:number}>}
 */
export async function uploadFile({ name, mime, parentId = getDefaultRootParentId(), buffer }) {
    if (!name || !mime) {
        throw new Error('[Drive] uploadFile: name & mime are required');
    }
    const drive = await getDrive();

    const media = {
        mimeType: mime,
        body: Readable.from(buffer || Buffer.alloc(0)),
    };
    const requestBody = {
        name,
        ...(parentId ? { parents: [parentId] } : {}),
        // KHÔNG set mimeType ở requestBody cho file binary thường; để Drive tự nhận theo media.mimeType
    };

    const { data } = await drive.files.create({
        requestBody,
        media,
        supportsAllDrives: true,
        fields: 'id, name, parents, size, webViewLink, webContentLink',
    });

    return {
        id: data.id,
        name: data.name,
        parents: data.parents,
        size: data.size ? Number(data.size) : undefined,
        webViewLink: data.webViewLink,
        webContentLink: data.webContentLink,
    };
}

/**
 * Đổi tên file/thư mục.
 */
export async function renameFile(fileId, newName) {
    const drive = await getDrive();
    await drive.files.update({
        fileId,
        requestBody: { name: newName },
        supportsAllDrives: true,
        fields: 'id, name',
    });
    return { id: fileId, name: newName };
}

/**
 * Di chuyển file sang parent khác (trong cùng Drive).
 * - Lấy parents cũ → update addParents/removeParents.
 */
export async function moveFile(fileId, newParentId) {
    if (!newParentId) throw new Error('[Drive] moveFile: newParentId is required');

    const drive = await getDrive();
    const current = await getFile(fileId);
    const prevParents = (current.parents || []).join(',');

    const { data } = await drive.files.update({
        fileId,
        addParents: newParentId,
        removeParents: prevParents || undefined,
        supportsAllDrives: true,
        fields: 'id, parents',
    });

    return { id: data.id, parents: data.parents };
}

/**
 * Xóa file:
 * - hard=false → chuyển thùng rác (trashed=true)
 * - hard=true  → xóa vĩnh viễn
 */
export async function deleteFile(fileId, hard = false) {
    const drive = await getDrive();
    if (hard) {
        await drive.files.delete({
            fileId,
            supportsAllDrives: true,
        });
        return { id: fileId, hard: true };
    } else {
        const { data } = await drive.files.update({
            fileId,
            requestBody: { trashed: true },
            supportsAllDrives: true,
            fields: 'id, trashed',
        });
        return { id: data.id, hard: false, trashed: data.trashed === true };
    }
}

/**
 * Get file metadata (for health checks, etc.)
 */
export async function getFileMeta(fileId) {
    if (!fileId) throw new Error('[Drive] getFileMeta: fileId is required');
    return await getFile(fileId);
}
