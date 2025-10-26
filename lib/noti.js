'use server';

import { runAction, assert } from '@/lib/action-utils.js';
import { connectDB } from '@/lib/db.js';
import AppUser from '@/model/user.model.js';

// URL của Google Apps Script để gửi tin nhắn
const ZALO_SEND_MESSAGE_URL = 'https://script.google.com/macros/s/AKfycbwQml7sl_qKwwO3sHOAQNzLXlwWyI6EaJ9QY5CTanKy9q9fuMKB3lzIEjeSmAM4Inym/exec';

/**
 * HÀM GỐC: Gửi tin nhắn Zalo tới một UID cụ thể qua Google Apps Script.
 * @param {string} uid - UID của người dùng Zalo cần gửi.
 * @param {string} message - Nội dung tin nhắn.
 */
export async function sendZaloMessage(uid, message) {
    return runAction(
        async () => {
            if (!uid) {
                return { ok: false, message: 'UID người nhận là bắt buộc.' };
            }
            if (!message || typeof message !== 'string' || message.trim() === '') {
                return { ok: false, message: 'Nội dung tin nhắn không được để trống.' };
            }

            try {
                const url = new URL(ZALO_SEND_MESSAGE_URL);
                url.searchParams.append('uid', uid);
                // Mã hóa tin nhắn để đảm bảo ký tự xuống dòng (\n) và emoji (utf-8) được truyền đúng
                // AppScript sẽ tự động giải mã
                url.searchParams.append('mes', message.trim());

                const response = await fetch(url.toString(), {
                    method: 'GET',
                    redirect: 'follow',
                    cache: 'no-store',
                });

                const data = await response.json();

                if (data.error === true) {
                    return {
                        ok: false,
                        message: data.message || 'Gửi tin nhắn thất bại (từ Google Script)',
                        error_code: data.error_code
                    };
                }

                if (!response.ok) {
                    return {
                        ok: false,
                        message: `Lỗi kết nối đến máy chủ Google Script: ${response.statusText}`
                    };
                }

                return {
                    ok: true,
                    message: data.message || 'Gửi tin nhắn thành công!',
                    data: data.data
                };

            } catch (error) {
                console.error("sendZaloMessage Action Error:", error);
                return {
                    ok: false,
                    message: `Lỗi Server Action: ${error.message}`
                };
            }
        },
        { requireAuth: true }
    );
}


/**
 * HÀM MỚI (ĐÃ SỬA): Gửi tin nhắn Zalo bằng EXTERNAL USER ID.
 * Tìm Zalo UID từ externalUserId rồi gọi sendZaloMessage.
 * @param {string} externalUserId - externalUserId của AppUser.
 * @param {string} message - Nội dung tin nhắn.
 */
export async function sendZalo(externalUserId, message) {
    return runAction(
        async () => {
            assert(externalUserId, 'USER_ID_INVALID', 'ID người dùng không hợp lệ.');
            assert(message && message.trim(), 'MESSAGE_INVALID', 'Nội dung tin nhắn không được để trống.');

            await connectDB();

            // Tìm bằng externalUserId (thay vì _id)
            const appUser = await AppUser.findOne({ externalUserId: externalUserId })
                .select('uid zaloname name')
                .lean();

            if (!appUser) {
                return { ok: false, message: `Không tìm thấy người dùng với ID: ${externalUserId}` };
            }
            if (!appUser.uid) {
                return {
                    ok: false,
                    message: `Người dùng '${appUser.zaloname || appUser.name || externalUserId}' chưa liên kết Zalo UID.`
                };
            }

            // Gọi hàm gốc với Zalo UID
            return await sendZaloMessage(appUser.uid, message);
        },
        { requireAuth: true }
    );
}

export async function notifyEvent(uid, message) {
    return;
}