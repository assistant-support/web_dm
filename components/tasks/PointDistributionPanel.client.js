// components/tasks/PointDistributionPanel.client.js
// UI Panel chia điểm từ task chính xuống các subtasks

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Award, Save, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { distributePointsToSubtasks } from '@/data/task/actions/subtask-approval.server';
import { listSubtasks } from '@/data/task/actions/subtasks.server';

/**
 * PointDistributionPanel - Chia điểm cho subtasks
 * 
 * @param {Object} props
 * @param {Object} props.task - Parent task object
 * @param {boolean} props.canManage - Can distribute points
 */
export default function PointDistributionPanel({ task, canManage = false }) {
    const router = useRouter();
    const [subtasks, setSubtasks] = useState([]);
    const [pointsMap, setPointsMap] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const totalAvailable = task.initialPoints || 0;

    // Load subtasks
    useEffect(() => {
        loadSubtasks();
    }, [task._id]);

    const loadSubtasks = async () => {
        setIsLoading(true);
        try {
            const result = await listSubtasks(task._id);
            if (result.ok) {
                const subs = result.data || [];
                setSubtasks(subs);

                // Initialize points map from existing distribution
                const existing = task.subtaskPointsDistribution || [];
                const map = {};
                subs.forEach(sub => {
                    const dist = existing.find(d => String(d.subtaskId) === String(sub._id));
                    map[sub._id] = dist?.assignedPoints || sub.initialPoints || 0;
                });
                setPointsMap(map);
            }
        } catch (err) {
            console.error('Load subtasks error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate total distributed
    const totalDistributed = Object.values(pointsMap).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    const remaining = totalAvailable - totalDistributed;
    const isOverLimit = totalDistributed > totalAvailable;

    // Handle point change
    const handlePointChange = (subtaskId, value) => {
        setPointsMap({
            ...pointsMap,
            [subtaskId]: parseInt(value) || 0
        });
        setError('');
        setSuccess('');
    };

    // Handle distribute evenly
    const handleDistributeEvenly = () => {
        if (subtasks.length === 0) return;
        
        const perTask = Math.floor(totalAvailable / subtasks.length);
        const remainder = totalAvailable % subtasks.length;
        
        const newMap = {};
        subtasks.forEach((sub, idx) => {
            newMap[sub._id] = perTask + (idx < remainder ? 1 : 0);
        });
        
        setPointsMap(newMap);
        setError('');
        setSuccess('');
    };

    // Handle save
    const handleSave = async () => {
        if (isOverLimit) {
            setError('Tổng điểm chia vượt quá điểm có sẵn');
            return;
        }

        setIsSaving(true);
        setError('');
        setSuccess('');

        try {
            // Build distribution array
            const distribution = subtasks.map(sub => ({
                subtaskId: sub._id,
                points: pointsMap[sub._id] || 0
            }));

            const result = await distributePointsToSubtasks(task._id, distribution);

            if (!result.ok) {
                setError(result.message || 'Không thể lưu');
                return;
            }

            setSuccess('Đã lưu phân bổ điểm thành công!');
            router.refresh();
        } catch (err) {
            console.error('Save distribution error:', err);
            setError(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSaving(false);
        }
    };

    if (!canManage) {
        return null;
    }

    if (totalAvailable === 0) {
        return (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                    Công việc này chưa có điểm. Vui lòng set điểm ban đầu để chia cho các subtask.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Phân bổ điểm cho công việc con
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Tổng điểm có sẵn: <span className="font-semibold">{totalAvailable}</span>
                    </p>
                </div>
                {subtasks.length > 0 && (
                    <button
                        onClick={handleDistributeEvenly}
                        disabled={isSaving}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Chia đều
                    </button>
                )}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div>
                    <p className="text-xs text-gray-600 mb-1">Tổng điểm</p>
                    <p className="text-lg font-semibold text-gray-900">{totalAvailable}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 mb-1">Đã chia</p>
                    <p className={`text-lg font-semibold ${isOverLimit ? 'text-red-600' : 'text-blue-600'}`}>
                        {totalDistributed}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 mb-1">Còn lại</p>
                    <p className={`text-lg font-semibold ${remaining < 0 ? 'text-red-600' : remaining === 0 ? 'text-blue-600' : 'text-green-600'}`}>
                        {remaining}
                    </p>
                </div>
            </div>

            {/* Validation Warning */}
            {isOverLimit && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-red-800">Vượt quá giới hạn điểm!</p>
                        <p className="text-xs text-red-700 mt-1">
                            Bạn đã chia {totalDistributed} điểm nhưng chỉ có {totalAvailable} điểm. Vui lòng giảm điểm chia cho các subtask.
                        </p>
                    </div>
                </div>
            )}

            {/* Error/Success */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800">{success}</p>
                </div>
            )}

            {/* Subtasks list */}
            {isLoading ? (
                <div className="text-sm text-gray-500 text-center py-4">
                    Đang tải subtasks...
                </div>
            ) : subtasks.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center border border-gray-200 border-dashed rounded-lg">
                    Chưa có subtask nào. Tạo subtask trước để chia điểm.
                </div>
            ) : (
                <div className="space-y-2">
                    {subtasks.map((subtask) => (
                        <div
                            key={subtask._id}
                            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {subtask.title}
                                </p>
                                {subtask.assignedTo && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Người thực hiện: {subtask.assignedTo}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    max={totalAvailable}
                                    value={pointsMap[subtask._id] || 0}
                                    onChange={(e) => handlePointChange(subtask._id, e.target.value)}
                                    disabled={isSaving}
                                    className="w-20 text-center"
                                />
                                <span className="text-sm text-gray-600">điểm</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            {subtasks.length > 0 && (
                <div className="flex items-center gap-3 pt-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isOverLimit}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Đang lưu...' : 'Lưu phân bổ'}
                    </button>

                    {isOverLimit && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            Vượt quá điểm có sẵn
                        </p>
                    )}
                </div>
            )}

            {/* Info */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                    <div className="text-2xl">💡</div>
                    <div className="flex-1 text-xs text-blue-900 space-y-2">
                        <p>
                            <strong>Hướng dẫn phân bổ điểm:</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Mỗi subtask sẽ có điểm riêng sau khi phân bổ</li>
                            <li>Tổng điểm chia <strong>không được vượt quá</strong> {totalAvailable} điểm</li>
                            <li>Khi subtask hoàn thành, người thực hiện nhận điểm tương ứng</li>
                            <li>Nhấn "Chia đều" để tự động phân bổ đều cho các subtask</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
