`use client`;

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DialogComponent from '@/components/ui/dialog';
import { Input, Textarea, Select, Checkbox } from '@/components/ui/input';
import { createSubtask } from '@/data/task/actions/subtasks.server';
import { PRIORITY } from '@/model/common/enums.js';
import { Loader2, Info } from 'lucide-react';
import { useAsyncNotifier } from '@/hooks/loading.hook';
import Dropdown from '@/components/ui/dropdown';
import { Search, ChevronDown } from 'lucide-react';

const PRIORITY_OPTIONS = [
    { value: PRIORITY.LOW, label: 'Thấp' },
    { value: PRIORITY.MEDIUM, label: 'Bình thường' },
    { value: PRIORITY.HIGH, label: 'Cao' },
    { value: PRIORITY.URGENT, label: 'Khẩn cấp' },
];

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const computeDefaultDateRange = () => {
    const now = Date.now();
    const toISODate = (timestamp) => new Date(timestamp).toISOString().split('T')[0];

    return {
        today: toISODate(now),
        tomorrow: toISODate(now + MS_IN_DAY),
    };
};

export default function CreateSubtaskDialog({
    open,
    onClose,
    parentTask,
    projectMembers = [],
    users = [],
    allUsersWithDetails = [],
    workTypes = [],
    platforms = [],
    currentUserId = '',
    onSuccess,
    remainingPoints = null,
    isActive = true,
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

    const allUserOptions = Array.isArray(allUsersWithDetails) ? allUsersWithDetails.map(u => ({ value: u.id || u._id || u.value, label: u.label || u.name })) : [];

    const assigneeOptions = (allUserOptions && allUserOptions.length) ? allUserOptions : (Array.isArray(projectUserOptions) ? projectUserOptions : []);
    const [assigneeSearch, setAssigneeSearch] = useState('');

    const filteredAssigneeOptions = Array.isArray(assigneeOptions) ? assigneeOptions.filter(opt => {
        if (!assigneeSearch) return true;
        const q = assigneeSearch.toLowerCase();
        return (opt.label || '').toLowerCase().includes(q) || (opt.name || '').toLowerCase().includes(q);
    }) : [];

    const [defaultDates, setDefaultDates] = useState({ today: '', tomorrow: '' });

    useEffect(() => {
        setDefaultDates(computeDefaultDateRange());
    }, []);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: parentTask?.priority || PRIORITY.MEDIUM,
        assignee: '',
        workType: parentTask?.workType || '',
        platforms: parentTask?.platforms || [],
        plannedStartAt: '',
        plannedDueAt: '',
        tags: '',
        initialPoints: 0,
        estimatedHours: '',
    });

    const selectedAssignee = Array.isArray(assigneeOptions) ? assigneeOptions.find(opt => opt.value === formData.assignee) : undefined;

    const projectActiveFromParent = (() => {
        if (!parentTask) return true;
        if (parentTask.project && typeof parentTask.project === 'object' && 'isActive' in parentTask.project) return parentTask.project.isActive;
        if ('projectIsActive' in parentTask) return parentTask.projectIsActive;
        return true;
    })();

    const effectiveActive = Boolean(isActive && projectActiveFromParent);

    useEffect(() => {
        if (defaultDates.today && defaultDates.tomorrow) {
            setFormData(prev => ({
                ...prev,
                plannedStartAt: prev.plannedStartAt || defaultDates.today,
                plannedDueAt: prev.plannedDueAt || defaultDates.tomorrow,
            }));
        }
    }, [defaultDates]);

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
        if (!effectiveActive) {
            setError('Dự án đã lưu trữ — không thể tạo subtask mới');
            return;
        }
        setIsSubmitting(true);
        setError('');

        try {
            await run(async () => {
                if (!formData.title.trim()) {
                    throw new Error('Tiêu đề subtask là bắt buộc');
                }

                const parentPoints = parentTask?.initialPoints || 0;
                const limitPoints = remainingPoints !== null ? remainingPoints : parentPoints;

                if (formData.initialPoints > limitPoints) {
                    throw new Error(`Điểm subtask không được vượt quá ${limitPoints}đ (số điểm còn lại của task cha)`);
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

                const result = await createSubtask(parentTask._id, payload);
                if (!result.ok) throw result;

                return result.data;
            }, {
                notify: 'none',
                successMessage: 'Tạo subtask thành công!',
                onSuccess: (data) => {
                    const refreshedDates = computeDefaultDateRange();
                    setDefaultDates(refreshedDates);

                    setFormData({
                        title: '',
                        description: '',
                        priority: parentTask?.priority || PRIORITY.MEDIUM,
                        assignee: '',
                        workType: parentTask?.workType || '',
                        platforms: parentTask?.platforms || [],
                        plannedStartAt: refreshedDates.today,
                        plannedDueAt: refreshedDates.tomorrow,
                        tags: '',
                        initialPoints: 0,
                        estimatedHours: '',
                    });

                    if (onSuccess) onSuccess(data); else router.refresh();
                    onClose();
                },
                onError: (err) => {
                    setError(err.message || 'Có lỗi không mong muốn xảy ra');
                    console.error('Lỗi khi tạo subtask:', err.message);
                }
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const parentPoints = parentTask?.initialPoints || 0;
    const limitPoints = remainingPoints !== null ? remainingPoints : parentPoints;
    const remainingAfterAllocation = limitPoints - (formData.initialPoints || 0);

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

                {!effectiveActive && (
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                        <p className="text-sm text-yellow-800">Dự án hoặc task cha đã được lưu trữ — tạo subtask bị vô hiệu hóa.</p>
                    </div>
                )}

                {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex gap-2">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                        <strong>Lưu ý:</strong> Subtask sẽ kế thừa project, team từ task cha.
                        <br />
                        Điểm task cha: <strong>{parentPoints}đ</strong>.
                        {remainingPoints !== null && (
                            <> Còn lại có thể phân bổ: <strong>{remainingPoints}đ</strong>.</>
                        )}
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
                            disabled={isSubmitting || !effectiveActive}
                        />
                        <Textarea
                            label="Mô tả"
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Mô tả chi tiết công việc..."
                            disabled={isSubmitting || !effectiveActive}
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
                                disabled={isSubmitting || !effectiveActive}
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nền tảng</label>
                                <div className="space-y-2">
                                    {platforms.map(platform => (
                                        <Checkbox
                                            key={platform._id}
                                            label={platform.name}
                                            checked={formData.platforms.includes(platform._id)}
                                            onChange={() => handlePlatformToggle(platform._id)}
                                            disabled={isSubmitting || !effectiveActive}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Người thực hiện</label>
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        disabled={isSubmitting || !effectiveActive}
                                        className="relative block w-full border border-gray-200 bg-white rounded-md py-2 pl-3 pr-10 text-sm text-left text-foreground hover:border-muted-200 focus:outline-none focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/30"
                                    >
                                        <span className={selectedAssignee?.value ? 'text-gray-900' : 'text-muted-400'}>
                                            {selectedAssignee?.label || 'Chưa gán'}{selectedAssignee?.value === currentUserId ? ' (Bản thân)' : ''}
                                        </span>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                            <ChevronDown className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content className="p-2" width="w-80">
                                    <Input
                                        type="text"
                                        placeholder="Tìm thành viên..."
                                        value={assigneeSearch}
                                        onChange={(e) => setAssigneeSearch(e.target.value)}
                                        leftIcon={<Search size={16} />}
                                        className="mb-2"
                                        disabled={!effectiveActive}
                                    />
                                    <div className="max-h-60 overflow-y-auto">
                                        <button type="button" onClick={() => handleChange('assignee', '')} className={`block w-full text-left px-3 py-1.5 text-sm rounded-md ${formData.assignee === '' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}>Chưa gán</button>
                                        {filteredAssigneeOptions.map(opt => (
                                            <button key={opt.value} type="button" onClick={() => handleChange('assignee', opt.value)} className={`block w-full text-left px-3 py-1.5 text-sm rounded-md ${formData.assignee === opt.value ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}>{opt.label} {opt.value === currentUserId ? '(Bản thân)' : ''}</button>
                                        ))}
                                    </div>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>

                        <Select label="Độ ưu tiên" value={formData.priority} onChange={(e) => handleChange('priority', e.target.value)} disabled={isSubmitting || !effectiveActive}>
                            {PRIORITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </Select>

                        <div>
                            <Input label="Điểm phân bổ" type="number" min="0" max={parentPoints} step="0.5" value={formData.initialPoints} onChange={(e) => handleChange('initialPoints', e.target.value)} placeholder="0" disabled={isSubmitting || !effectiveActive} helperText={`Còn lại: ${remainingPoints}đ / ${parentPoints}đ`} />
                        </div>

                        <Input label="Thời gian ước tính (giờ)" type="number" min="0" step="0.5" value={formData.estimatedHours} onChange={(e) => handleChange('estimatedHours', e.target.value)} placeholder="0" disabled={isSubmitting} helperText="Số giờ dự kiến để hoàn thành" />

                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Ngày bắt đầu" type="date" value={formData.plannedStartAt} onChange={(e) => handleChange('plannedStartAt', e.target.value)} disabled={isSubmitting} />
                            <Input label="Hạn hoàn thành" type="date" value={formData.plannedDueAt} onChange={(e) => handleChange('plannedDueAt', e.target.value)} disabled={isSubmitting} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">Hủy</button>
                    <button type="submit" disabled={isSubmitting || !formData.title.trim() || !effectiveActive} className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white ${effectiveActive ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'} rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors`} title={!effectiveActive ? 'Dự án đã lưu trữ — không thể tạo subtask' : undefined}>
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Đang tạo...' : 'Tạo công việc con'}
                    </button>
                </div>
            </form>
        </DialogComponent>
    );
}