'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DialogComponent from '@/components/ui/dialog';
import { Input, Textarea, Select, Checkbox } from '@/components/ui/input';
import { createSubtask } from '@/data/task/actions/subtasks.server';
import { Loader2, Info } from 'lucide-react';
import { useAsyncNotifier } from '@/hooks/loading.hook';

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Thấp' },
    { value: 'normal', label: 'Bình thường' },
    { value: 'high', label: 'Cao' },
    { value: 'urgent', label: 'Khẩn cấp' },
];

export default function CreateSubtaskDialog({
    open,
    onClose,
    parentTask,
    projectMembers = [],
    users = [],
    workTypes = [],
    platforms = [],
    currentUserId = '',
    onSuccess
}) {

    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const { run, Overlays } = useAsyncNotifier();

    const projectUserOptions = projectMembers
        .map(member => {
            const user = users.find(u => u.value === member.userId);
            return user ? { value: user.value, label: user.label } : null;
        })
        .filter(Boolean);
    
    // Lấy ngày hôm nay và ngày mai
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: parentTask?.priority || 'normal',
        assignee: '',
        workType: parentTask?.workType || '',
        platforms: parentTask?.platforms || [],
        plannedStartAt: today, // Mặc định: hôm nay
        plannedDueAt: tomorrow, // Mặc định: ngày mai
        tags: '',
        initialPoints: 0,
        estimatedHours: '',
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePlatformToggle = (platformId) => {
        setFormData(prev => ({
            ...prev,
            platforms: prev.platforms.includes(platformId)
                ? prev.platforms.filter(id => id !== platformId)
                : [...prev.platforms, platformId]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        await run(async () => {
            if (!formData.title.trim()) {
                throw new Error('Tiêu đề subtask là bắt buộc');
            }

            const parentPoints = parentTask?.initialPoints || 0;
            if (formData.initialPoints > parentPoints) {
                throw new Error(`Điểm subtask không được vượt quá ${parentPoints}đ (điểm task cha)`);
            }

            const payload = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                priority: formData.priority,
                assignee: formData.assignee || null,
                workType: formData.workType || null,
                platforms: formData.platforms.length > 0 ? formData.platforms : null,
                plannedStartAt: formData.plannedStartAt || null,
                plannedDueAt: formData.plannedDueAt || null,
                tags: formData.tags
                    ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
                    : [],
                initialPoints: Number(formData.initialPoints) || 0,
                estimatedHours: formData.estimatedHours ? Number(formData.estimatedHours) : null,
            };
            console.log(parentTask);
            
            const result = await createSubtask(parentTask._id, payload); // Use parentTaskId directly
            if (!result.ok) {
                throw result;
            }

            return result.data;

        }, {
            notify: 'none',
            successMessage: 'Tạo subtask thành công!',
            onSuccess: (data) => {
                setFormData({
                    title: '',
                    description: '',
                    priority: parentTask?.priority || 'normal',
                    assignee: '',
                    workType: parentTask?.workType || '',
                    platforms: parentTask?.platforms || [],
                    plannedStartAt: today, // Reset về hôm nay
                    plannedDueAt: tomorrow, // Reset về ngày mai
                    tags: '',
                    initialPoints: 0,
                    estimatedHours: '',
                });

                if (onSuccess) {
                    onSuccess(data);
                } else {
                    router.refresh();
                }

                onClose();
            },
            onError: (err) => {
                setError(err.message || 'Có lỗi không mong muốn xảy ra');
                console.error('Lỗi khi tạo subtask:', err.message);
            }
        });

        setIsSubmitting(false);
    };

    const parentPoints = parentTask?.initialPoints || 0;
    const remainingPoints = parentPoints - (formData.initialPoints || 0);

    return (
        <DialogComponent
            open={open}
            onOpenChange={(open) => !open && onClose()}
            title={`Tạo công việc con cho: ${parentTask?.title || ''}`}
            description="Subtask là công việc con với đầy đủ thông tin và có thể giao cho người khác thực hiện"
            size="2xl"
        >
            <Overlays />

            <form onSubmit={handleSubmit} className="space-y-5">

                {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                        <p className="text-sm text-red-800">
                            {error}
                        </p>
                    </div>
                )}

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex gap-2">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                        <strong>Lưu ý:</strong> Subtask sẽ kế thừa project, team từ task cha.
                        Điểm task cha: <strong>{parentPoints}đ</strong>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="space-y-5">
                        <Input
                            label="Tiêu đề"
                            required
                            value={formData.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            placeholder="Nhập tiêu đề công việc con..."
                            disabled={isSubmitting}
                        />
                        <Textarea
                            label="Mô tả"
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Mô tả chi tiết công việc..."
                            disabled={isSubmitting}
                            rows={4}
                        />
                        <Input
                            label="Tags"
                            value={formData.tags}
                            onChange={(e) => handleChange('tags', e.target.value)}
                            placeholder="Nhập tags, cách nhau bằng dấu phẩy"
                            disabled={isSubmitting}
                            helperText="Ví dụ: urgent, design, backend"
                        />
                        {workTypes.length > 0 && (
                            <Select
                                label="Loại công việc"
                                value={formData.workType}
                                onChange={(e) => handleChange('workType', e.target.value)}
                                disabled={isSubmitting}
                            >
                                <option value="">-- Chọn loại công việc --</option>
                                {workTypes.map(wt => (
                                    <option key={wt._id} value={wt._id}>
                                        {wt.name}
                                    </option>
                                ))}
                            </Select>
                        )}
                        {platforms.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nền tảng
                                </label>
                                <div className="space-y-2">
                                    {platforms.map(platform => (
                                        <Checkbox
                                            key={platform._id}
                                            label={platform.name}
                                            checked={formData.platforms.includes(platform._id)}
                                            onChange={() => handlePlatformToggle(platform._id)}
                                            disabled={isSubmitting}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-5">
                        <Select
                            label="Người thực hiện"
                            value={formData.assignee}
                            onChange={(e) => handleChange('assignee', e.target.value)}
                            disabled={isSubmitting}
                        >
                            <option value="">Chưa gán</option>
                            {projectUserOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label} {opt.value === currentUserId ? '(Bản thân)' : ''}
                                </option>
                            ))}
                        </Select>
                        <Select
                            label="Độ ưu tiên"
                            value={formData.priority}
                            onChange={(e) => handleChange('priority', e.target.value)}
                            disabled={isSubmitting}
                        >
                            {PRIORITY_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </Select>
                        <div>
                            <Input
                                label="Điểm phân bổ"
                                type="number"
                                min="0"
                                max={parentPoints}
                                step="0.5"
                                value={formData.initialPoints}
                                onChange={(e) => handleChange('initialPoints', e.target.value)}
                                placeholder="0"
                                disabled={isSubmitting}
                                helperText={`Còn lại: ${remainingPoints}đ / ${parentPoints}đ`}
                            />
                        </div>
                        <Input
                            label="Thời gian ước tính (giờ)"
                            type="number"
                            min="0"
                            step="0.5"
                            value={formData.estimatedHours}
                            onChange={(e) => handleChange('estimatedHours', e.target.value)}
                            placeholder="0"
                            disabled={isSubmitting}
                            helperText="Số giờ dự kiến để hoàn thành"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Ngày bắt đầu"
                                type="date"
                                value={formData.plannedStartAt}
                                onChange={(e) => handleChange('plannedStartAt', e.target.value)}
                                disabled={isSubmitting}
                            />
                            <Input
                                label="Hạn hoàn thành"
                                type="date"
                                value={formData.plannedDueAt}
                                onChange={(e) => handleChange('plannedDueAt', e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !formData.title.trim()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Đang tạo...' : 'Tạo công việc con'}
                    </button>
                </div>
            </form>
        </DialogComponent>
    );
}