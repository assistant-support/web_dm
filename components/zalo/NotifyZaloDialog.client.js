'use client';

import { useState, useEffect } from 'react';
import { useAsyncNotifier } from '@/hooks/loading.hook.js';
// Correct the import path based on your structure
import { sendZalo } from '@/lib/noti'; // Assuming zalo-actions.js is in data/appUser
import DialogComponent from '@/components/ui/dialog';
// Use the Input/Textarea from form-elements
import { Textarea } from '@/components/ui/input';
import Button from '@/components/ui/button';
import { Send, AlertCircle } from 'lucide-react';

/**
 * Tạo tin nhắn mặc định dựa trên bối cảnh
 */
function getDefaultMessage(task, context, statusInfo, fmtDate) {
    const taskUrl = typeof window !== 'undefined' ? `${window.location.origin}/tasks/${task._id}` : `/tasks/${task._id}`; // Safer URL generation

    let contextMessage = '';
    switch (context) {
        case 'assignee':
            contextMessage = 'Vui lòng xác nhận và bắt đầu thực hiện công việc.';
            break;
        case 'manager_approval':
            contextMessage = 'Công việc này đang chờ bạn xem xét và phê duyệt.';
            break;
        case 'manager_completion':
            contextMessage = 'Công việc đã hoàn thành và đang chờ bạn duyệt.';
            break;
        default:
            contextMessage = 'Vui lòng kiểm tra công việc này.';
    }

    const message = `🔔 Nhắc nhở công việc
--------------------
Công việc: ${task.title}
Trạng thái: ${statusInfo.label}
Hạn chót: ${fmtDate(task.plannedDueAt)}
--------------------
${contextMessage}

🔗 Link công việc:
${taskUrl}
`;
    return message;
}

export default function NotifyZaloDialog({
    open,
    onClose,
    recipient, // { id (externalUserId), name }
    task,
    context, // 'assignee' | 'manager_approval' | 'manager_completion'
    statusInfo,
    fmtDate
}) {
    const { run, Overlays } = useAsyncNotifier();
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && task && recipient) {
            const defaultMsg = getDefaultMessage(task, context, statusInfo, fmtDate);
            setMessage(defaultMsg);
            setError('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, task, recipient, context]);

    const handleSend = async () => {
        setError('');
        if (!message.trim()) {
            setError('Nội dung tin nhắn không được để trống.');
            return;
        }

        await run(
            () => sendZalo(recipient.id, message),
            {
                loadingMessage: 'Đang gửi tin nhắn Zalo...',
                notify: 'all',
                successMessage: 'Đã gửi nhắc nhở thành công!',
                onSuccess: (result) => {
                    if (result.ok) {
                        onClose();
                    } else {
                        setError(result.message || 'Gửi tin nhắn thất bại');
                    }
                },
                onError: (err) => {
                    setError(err.message || 'Lỗi không xác định');
                }
            }
        );
    };

    return (
        <>
            <Overlays />
            <DialogComponent
                open={open}
                onOpenChange={(isOpen) => !isOpen && onClose()}
                title={`Gửi nhắc nhở Zalo cho ${recipient?.name || '...'}`}
                size="md"
            >
                <div className="space-y-4 pt-2">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Using Textarea from form-elements.js */}
                    <Textarea
                        label="Nội dung tin nhắn"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={12}
                        className="text-sm font-mono" // Keep custom class if needed
                        placeholder="Nhập nội dung tin nhắn..."
                    />

                    <div className="flex items-center justify-end gap-3 pt-4 border-t">
                        {/* Using Button from Button.jsx */}
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleSend}
                            // Pass the component type, not an instance
                            icon={Send}
                        >
                            Gửi ngay
                        </Button>
                    </div>
                </div>
            </DialogComponent>
        </>
    );
}