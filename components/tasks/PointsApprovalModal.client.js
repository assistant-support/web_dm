// components/tasks/PointsApprovalModal.client.js
// Modal để nhập điểm khi duyệt task/subtask

'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

/**
 * PointsApprovalModal - Modal nhập điểm khi duyệt task
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Hiển thị modal
 * @param {Function} props.onClose - Đóng modal
 * @param {Function} props.onSubmit - Submit với points: (points) => void
 * @param {string} props.title - Tiêu đề modal
 * @param {string} props.taskName - Tên task
 * @param {number} props.suggestedPoints - Điểm đề xuất (initialPoints hoặc requiredPoints)
 * @param {number} props.maxPoints - Điểm tối đa (nếu là subtask)
 * @param {string} props.type - 'creation' | 'completion' | 'subtask'
 * @param {boolean} props.isSubmitting - Đang submit
 */
export default function PointsApprovalModal({
    isOpen,
    onClose,
    onSubmit,
    title = 'Duyệt công việc',
    taskName,
    suggestedPoints = 0,
    maxPoints = null,
    type = 'completion',
    isSubmitting = false,
}) {
    const [points, setPoints] = useState(suggestedPoints);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPoints(suggestedPoints);
            setError('');
        }
    }, [isOpen, suggestedPoints]);

    if (!isOpen) return null;

    const validatePoints = (value) => {
        const num = Number(value);
        
        if (isNaN(num) || num < 0) {
            return 'Điểm phải là số không âm';
        }
        
        if (maxPoints !== null && num > maxPoints) {
            return `Điểm không được vượt quá ${maxPoints} (điểm của parent task)`;
        }
        
        return '';
    };

    const handlePointsChange = (e) => {
        const value = e.target.value;
        setPoints(value);
        setError(validatePoints(value));
    };

    const handleSubmit = () => {
        const validationError = validatePoints(points);
        if (validationError) {
            setError(validationError);
            return;
        }
        
        onSubmit(Number(points));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !error && !isSubmitting) {
            handleSubmit();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-4 space-y-4">
                    {/* Task Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Công việc
                        </label>
                        <div className="text-base text-gray-900 font-medium">
                            {taskName}
                        </div>
                    </div>

                    {/* Points Info */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                        <div>
                            <div className="text-xs text-gray-500 mb-1">
                                {type === 'creation' ? 'Điểm yêu cầu' : 'Điểm đề xuất'}
                            </div>
                            <div className="text-lg font-semibold text-blue-600">
                                {suggestedPoints || 0}
                            </div>
                        </div>
                        {maxPoints !== null && (
                            <div>
                                <div className="text-xs text-gray-500 mb-1">Điểm tối đa</div>
                                <div className="text-lg font-semibold text-orange-600">
                                    {maxPoints}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Points Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {type === 'creation' ? 'Điểm phê duyệt' : 'Điểm thực tế'}
                            <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                            type="number"
                            value={points}
                            onChange={handlePointsChange}
                            onKeyDown={handleKeyDown}
                            min="0"
                            max={maxPoints || undefined}
                            step="0.5"
                            disabled={isSubmitting}
                            className={`w-full px-4 py-3 text-lg font-semibold border rounded-lg focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                error 
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                            }`}
                            placeholder="Nhập số điểm..."
                            autoFocus
                        />
                        {error && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Help Text */}
                    {type === 'subtask' && maxPoints !== null && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                ⚠️ Điểm của subtask không được vượt quá điểm của parent task ({maxPoints} điểm)
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!!error || isSubmitting}
                        className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Đang xử lý...' : 'Phê duyệt'}
                    </button>
                </div>
            </div>
        </div>
    );
}
