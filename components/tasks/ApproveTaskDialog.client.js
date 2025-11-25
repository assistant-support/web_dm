'use client';

import { useState, useEffect } from 'react';
import DialogComponent from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import Button from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function ApproveTaskDialog({
    open,
    onClose,
    onApprove,
    task,
    maxPoints,
    isSubtask
}) {
    const [points, setPoints] = useState(task?.initialPoints || 0);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setPoints(task?.initialPoints || 0);
            setNote('');
            setError('');
        }
    }, [open, task]);

    const handleSubmit = () => {
        const numPoints = Number(points);
        if (isNaN(numPoints) || numPoints < 0) {
            setError('Điểm số không hợp lệ.');
            return;
        }

        if (isSubtask && maxPoints !== null && numPoints > maxPoints) {
            setError(`Điểm số không được vượt quá giới hạn cho phép (${maxPoints} điểm).`);
            return;
        }

        onApprove({ finalPoints: numPoints, note });
        onClose();
    };

    return (
        <DialogComponent
            open={open}
            onClose={onClose}
            title="Duyệt hoàn thành công việc"
            className="max-w-md"
        >
            <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700">
                    Xác nhận hoàn thành công việc và chốt điểm số cuối cùng.
                </div>

                {isSubtask && maxPoints !== null && (
                    <div className="text-sm text-gray-600">
                        Điểm tối đa cho phép: <span className="font-bold text-gray-900">{maxPoints}</span>
                        <p className="text-xs text-gray-500 mt-1">
                            (Giới hạn bởi điểm công việc cha và các công việc con khác)
                        </p>
                    </div>
                )}

                <Input
                    label="Điểm chốt"
                    type="number"
                    value={points}
                    onChange={(e) => {
                        setPoints(e.target.value);
                        setError('');
                    }}
                    min="0"
                    step="0.1"
                />

                <Textarea
                    label="Ghi chú (tùy chọn)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Nhập nhận xét hoặc ghi chú..."
                    rows={3}
                />

                {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                        <AlertTriangle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={onClose}>
                        Hủy bỏ
                    </Button>
                    <Button variant="primary" onClick={handleSubmit}>
                        Xác nhận duyệt
                    </Button>
                </div>
            </div>
        </DialogComponent>
    );
}
