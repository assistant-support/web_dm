// /lib/drive.js
// Mục đích: Tầng tích hợp Google Drive thật sự cho Server Actions.
// - Hỗ trợ Shared Drive & My Drive.
// - Hỗ trợ Service Account + (tùy chọn) Domain-Wide Delegation.
// - Cung cấp API tạo folder Project/Task/Tháng, upload, rename, move, delete.

'use server';

import { google } from 'googleapis';
import { Readable } from 'node:stream';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

function normalizePrivateKey(k) {
    if (!k) return k;
    return k.replace(/\\n/g, '\n');
}

/**
 * Tạo đối tượng auth cho service account.
 */
function createAuth() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
    if (!clientEmail || !privateKey) {
        throw new Error('[Drive] Missing GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY');
    }
    const subject = process.env.GOOGLE_DRIVE_IMPERSONATE_EMAIL || undefined;
    return new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: SCOPES,
        subject,
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

/**
 * Trả về "folder root" mặc định.
 */
function getDefaultRootParentId() {
    const sharedId = process.env.DRIVE_SHARED_DRIVE_ID;
    if (sharedId) return sharedId;
    const root = process.env.DRIVE_ROOT_FOLDER_ID;
    if (root) return root;
    return null; // Sẽ tạo trong My Drive của SA/subject
}

/**
 * Tạo folder trên Drive.
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
 * Lấy thông tin file.
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

/**
 * Tạo thư mục cho Team.
 */
export async function createTeamFolder(teamName, parentId = getDefaultRootParentId()) {
    return await createFolder(teamName, parentId);
}

/**
 * Tạo thư mục gốc cho Project.
 */
export async function createProjectFolder(projectName, parentId = getDefaultRootParentId()) {
    return await createFolder(projectName, parentId);
}

// ===================================================
// === HÀM MỚI ĐƯỢC THÊM: createProjectMonthlyFolders ===
// ===================================================
/**
 * Tạo 12 thư mục con (YYYY-MM) cho một năm cụ thể bên trong thư mục Project.
 * @param {string} projectRootFolderId - ID của thư mục gốc Project.
 * @param {number} year - Năm cần tạo thư mục (ví dụ: 2025).
 * @returns {Promise<Array<{year: number, month: number, folderId: string, folderName: string}>>} Mảng thông tin các folder đã tạo.
 */
export async function createProjectMonthlyFolders(projectRootFolderId, year) {
    if (!projectRootFolderId) {
        throw new Error('[Drive] createProjectMonthlyFolders: projectRootFolderId is required');
    }
    if (!year || typeof year !== 'number' || year < 1900 || year > 3000) {
        throw new Error('[Drive] createProjectMonthlyFolders: Invalid year provided');
    }

    const monthlyFoldersData = [];
    const creationPromises = [];

    // Tạo mảng promises để chạy song song
    for (let month = 1; month <= 12; month++) {
        const monthString = String(month).padStart(2, '0');
        const folderName = `${year}-${monthString}`;
        // Thêm promise vào mảng
        creationPromises.push(
            createFolder(folderName, projectRootFolderId).then(result => ({
                year: year,
                month: month,
                folderId: result.id,
                folderName: folderName,
            }))
        );
    }

    // Chạy tất cả các promise tạo folder song song
    try {
        const results = await Promise.all(creationPromises);
        monthlyFoldersData.push(...results);
        console.log(`[Drive] Successfully created ${results.length} monthly folders for ${year} in ${projectRootFolderId}`);
    } catch (error) {
        console.error(`[Drive] Error creating monthly folders for ${year} in ${projectRootFolderId}:`, error);
        // Quyết định xử lý lỗi: Ném lỗi ra ngoài hay trả về mảng rỗng/một phần?
        // Hiện tại sẽ ném lỗi để báo hiệu quá trình tạo project có thể không hoàn chỉnh.
        throw new Error(`Failed to create all monthly folders for ${year}. Error: ${error.message}`);
    }

    // Sắp xếp lại theo tháng trước khi trả về (Promise.all không đảm bảo thứ tự)
    monthlyFoldersData.sort((a, b) => a.month - b.month);

    return monthlyFoldersData;
}
// ===================================================

/**
 * Tạo thư mục cho Task.
 */
export async function createTaskFolder(taskTitle, projectMonthlyFolderId) {
    if (!projectMonthlyFolderId) {
        // Nếu không có folder tháng của project, tạo ở root (hành vi dự phòng)
        console.warn(`[Drive] createTaskFolder: projectMonthlyFolderId not provided for task "${taskTitle}". Creating in default root.`);
        return await createFolder(taskTitle, getDefaultRootParentId());
    }
    // Tạo folder Task bên trong folder Tháng của Project
    return await createFolder(taskTitle, projectMonthlyFolderId);
}

/**
 * Upload file nhị phân lên Drive.
 */
export async function uploadFile({ name, mime, parentId = getDefaultRootParentId(), buffer }) {
    if (!name || !mime) {
        throw new Error('[Drive] uploadFile: name & mime are required');
    }
    if (!buffer || !(buffer instanceof Buffer)) {
        throw new Error('[Drive] uploadFile: buffer is required and must be a Buffer');
    }
    const drive = await getDrive();

    const media = {
        mimeType: mime,
        body: Readable.from(buffer),
    };
    const requestBody = {
        name,
        ...(parentId ? { parents: [parentId] } : {}),
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
    const { data } = await drive.files.update({ // Lấy data trả về
        fileId,
        requestBody: { name: newName },
        supportsAllDrives: true,
        fields: 'id, name', // Yêu cầu trả về name mới
    });
    return { id: data.id, name: data.name }; // Trả về name mới
}

/**
 * Di chuyển file sang parent khác.
 */
export async function moveFile(fileId, newParentId) {
    if (!newParentId) throw new Error('[Drive] moveFile: newParentId is required');

    const drive = await getDrive();
    // Lấy thông tin parents hiện tại
    const fileMeta = await drive.files.get({
        fileId: fileId,
        fields: 'parents',
        supportsAllDrives: true,
    });
    const previousParents = fileMeta.data.parents ? fileMeta.data.parents.join(',') : '';


    const { data } = await drive.files.update({
        fileId,
        addParents: newParentId,
        // Chỉ remove parents cũ nếu có
        ...(previousParents ? { removeParents: previousParents } : {}),
        supportsAllDrives: true,
        fields: 'id, parents', // Yêu cầu trả về parents mới
    });

    return { id: data.id, parents: data.parents };
}

/**
 * Xóa file (thùng rác hoặc vĩnh viễn).
 */
export async function deleteFile(fileId, hard = false) {
    const drive = await getDrive();
    if (hard) {
        // Xóa vĩnh viễn
        await drive.files.delete({
            fileId,
            supportsAllDrives: true,
        });
        return { id: fileId, hard: true, deleted: true };
    } else {
        // Chuyển vào thùng rác
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
 * Lấy metadata của file.
 */
export async function getFileMeta(fileId) {
    if (!fileId) throw new Error('[Drive] getFileMeta: fileId is required');
    // Sử dụng hàm getFile đã có sẵn
    return await getFile(fileId);
}

export async function getFileStream(fileId, { range } = {}) {
    if (!fileId) throw new Error('[Drive] getFileStream: fileId is required');
    const drive = await getDrive();

    const options = { responseType: 'stream' };
    if (range) {
        options.headers = { Range: range };
    }

    const { data } = await drive.files.get(
        {
            fileId,
            supportsAllDrives: true,
            alt: 'media',
        },
        options,
    );

    return data;
}