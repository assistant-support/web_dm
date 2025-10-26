// components/tasks/UserInfoPopup.client.js
'use client';

import Button from '@/components/ui/button';
import DialogComponent from '@/components/ui/dialog';
import Avatar from '@/components/ui/avatar'; // <-- IMPORT MỚI
import { driveImage } from '@/functions'; // <-- IMPORT MỚI

// --- XÓA COMPONENT AVATAR LOCAL ---

export default function UserInfoPopup({ isOpen, onClose, users = [] }) {

    return (
        <DialogComponent
            open={isOpen}
            onOpenChange={onClose}
            title="Người liên quan"
            size="sm"
            footer={
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onClose}
                    className="!py-1.5 !text-xs"
                >
                    Đóng
                </Button>
            }
        >
            <div className="max-h-[400px] overflow-y-auto space-y-3 custom-scrollbar">
                {users.length > 0 ? (
                    users.map(user => (
                        <div key={user.id} className="flex items-center gap-3 p-1 hover:bg-gray-50 rounded">
                            {/* --- SỬ DỤNG AVATAR MỚI --- */}
                            <Avatar
                                userId={user.id}
                                name={user.name}
                                // Giả định driveImage() trả về URL đầy đủ hoặc null/undefined
                                src={driveImage(user.avatarUrl)}
                                size="xl" // 'xl' (h-16 w-16) tương ứng với 'size={16}' cũ
                                // Thêm lại các style tùy chỉnh từ component cũ
                                className="border-2 border-white shadow-sm flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate" title={user.name || 'N/A'}>
                                    {user.name || 'N/A'}
                                    {user.role && <span className="text-gray-600 font-normal"> - {user.role}</span>}
                                </p>
                                <p className="text-sm text-gray-500 truncate" title={user.email || 'N/A'}>{user.email || 'N/A'}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                        Không có người dùng nào được liên kết với nhiệm vụ này.
                    </p>
                )}
            </div>
        </DialogComponent>
    );
}