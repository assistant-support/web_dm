'use server';

import { runAction } from '@/lib/action-utils.js';
import { connectDB } from '@/lib/db.js';
import AppUser from '@/model/user.model.js'; // Đảm bảo model AppUser của bạn đã có 3 trường mới

// URL API đồng bộ UID (dùng trong updateUid)
const EXTERNAL_API_URL = process.env.MY_PROVIDER_URL
    ? `${process.env.MY_PROVIDER_URL}/api/useruid`
    : 'http://localhost:3000/api/useruid';

// URL Google Apps Script để tìm UID bằng SĐT
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzjGrMHcCVKxrvvsx7Lz4bqcfJ_YNXSswFCwJ8iNARb2Ze_pXb2bjdYy9m0etzWNBn2kA/exec';

/**
 * Tìm UID từ số điện thoại thông qua API Google Apps Script (Zalo)
 * @param {string} phoneNumber - Số điện thoại
 * @returns {Promise<{ok: boolean, data?: {uid: string, name: string, avatar: string, phone: string}, message?: string}>}
 */
export async function findUidByPhone(phoneNumber) {
    return runAction(
        async ({ user }) => {
            if (!phoneNumber || typeof phoneNumber !== 'string') {
                return { ok: false, message: 'Số điện thoại không hợp lệ' };
            }

            const cleanPhone = phoneNumber.replace(/[\s\-]/g, '');

            try {
                const url = new URL(APPS_SCRIPT_URL);
                url.searchParams.append('phone', cleanPhone);

                const response = await fetch(url.toString(), {
                    method: 'GET',
                    redirect: 'follow',
                });

                const data = await response.json();

                if (data.error === true) {
                    return {
                        ok: false,
                        message: data.message || 'Lỗi không xác định từ Google Script'
                    };
                }

                if (!response.ok) {
                    return {
                        ok: false,
                        message: `Lỗi máy chủ Google Script: ${response.statusText}`
                    };
                }

                // Cập nhật: Lấy cả uid, display_name, và avatar
                if (data.uid) {
                    return {
                        ok: true,
                        data: {
                            uid: data.uid,
                            name: data.display_name || 'Không rõ',
                            avatar: data.avatar || null, // Thêm avatar
                            phone: cleanPhone
                        }
                    };
                }

                return { ok: false, message: 'Không nhận được UID từ Google Script' };

            } catch (error) {
                console.error('findUidByPhone Error:', error);
                return {
                    ok: false,
                    message: 'Lỗi khi gọi Google Script: ' + error.message
                };
            }
        },
        { requireAuth: true }
    );
}

/**
 * Cập nhật UID, Tên Zalo, và Avatar Zalo cho người dùng
 * @param {object} zaloData - Object chứa { uid, name, avatar }
 * @returns {Promise<{ok: boolean, data?: object, message?: string}>}
 */
export async function updateUid(zaloData) {
    return runAction(
        async ({ user }) => {
            const { uid, name, avatar } = zaloData;

            if (!uid || typeof uid !== 'string') {
                return { ok: false, message: 'UID không hợp lệ' };
            }

            try {
                await connectDB();

                // Cập nhật local database với cả 3 trường
                const updatedUser = await AppUser.findOneAndUpdate(
                    { externalUserId: user.externalUserId },
                    {
                        $set: {
                            uid: uid,
                            zaloname: name,
                            zaloavt: avatar
                        }
                    },
                    { new: true, runValidators: true }
                );

                if (!updatedUser) {
                    return {
                        ok: false,
                        message: 'Không tìm thấy người dùng'
                    };
                }

                // Đồng bộ UID với external API (chỉ gửi uid)
                const syncResponse = await fetch(`${EXTERNAL_API_URL}/${user.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ uid }), // API ngoài chỉ cần uid
                });

                if (!syncResponse.ok) {
                    console.error('Failed to sync UID with external API');
                }

                return {
                    ok: true,
                    data: {
                        uid: updatedUser.uid,
                        zaloname: updatedUser.zaloname,
                        zaloavt: updatedUser.zaloavt,
                        externalUserId: updatedUser.externalUserId
                    },
                    message: 'Cập nhật UID thành công'
                };
            } catch (error) {
                console.error('updateUid Error:', error);

                if (error.code === 11000) {
                    return {
                        ok: false,
                        message: 'UID này đã được sử dụng bởi người dùng khác'
                    };
                }

                return {
                    ok: false,
                    message: 'Lỗi khi cập nhật UID: ' + error.message
                };
            }
        },
        { requireAuth: true }
    );
}

/**
 * Kiểm tra xem người dùng đã có UID chưa và trả về thông tin Zalo
 */
export async function checkUserUid() {
    return runAction(
        async ({ user }) => {
            try {
                await connectDB();

                const appUser = await AppUser.findOne({
                    externalUserId: user.externalUserId
                }).select('uid zaloname zaloavt').lean();

                return {
                    ok: true,
                    hasUid: !!appUser?.uid,
                    uid: appUser?.uid || null,
                    zaloname: appUser?.zaloname || null,
                    zaloavt: appUser?.zaloavt || null
                };
            } catch (error) {
                console.error('checkUserUid Error:', error);
                return {
                    ok: false,
                    hasUid: false,
                    message: error.message
                };
            }
        },
        { requireAuth: true }
    );
}