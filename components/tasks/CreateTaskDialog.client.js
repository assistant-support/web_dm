/**
 * @file components/tasks/CreateTaskDialog.client.js
 * @description A client component form for creating a new task using a Server Action.
 */
'use client';

// Imports
import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useState, useMemo, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { createTask } from '@/data/task/actions/server';
import DialogComponent from '@/components/ui/dialog';
// 'Select' không còn được dùng, chỉ cần Input, Textarea, Checkbox
import { Input, Textarea, Checkbox } from '@/components/ui/input';
import Dropdown, { DropdownContext } from '@/components/ui/dropdown';
import { Info, User, Loader2, Search, ChevronDown } from 'lucide-react';
import { WORK_TYPES } from '@/data/workTypes/constants';
import { PRIORITY } from '@/model/common/enums.js';
import { useAsyncNotifier } from '@/hooks/loading.hook';
import { truncateText } from '@/functions';

/**
 * -----------------------------------------------------------------------------
 * Hằng số & Tiện ích
 * -----------------------------------------------------------------------------
 */

const PRIORITY_OPTIONS = [
    { value: PRIORITY.LOW, label: 'Thấp' },
    { value: PRIORITY.MEDIUM, label: 'Bình thường' },
    { value: PRIORITY.HIGH, label: 'Cao' },
    { value: PRIORITY.URGENT, label: 'Khẩn cấp' },
];

/**
 * @function formatDate
 * @description Trả về chuỗi YYYY-MM-DD từ một đối tượng Date.
 */
const formatDate = (date) => {
    return date.toLocaleDateString('en-CA');
};

/**
 * @function formatTime
 * @description Trả về chuỗi HH:MM từ một đối tượng Date.
 */
const formatTime = (date) => {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

/**
 * @function getInitialDateTime
 * @description Trả về một Date object mới với giờ/phút được chỉ định.
 */
const getInitialDateTime = (date, hour, minute) => {
    const newDate = new Date(date);
    newDate.setHours(hour, minute, 0, 0);
    return newDate;
};


/**
 * -----------------------------------------------------------------------------
 * Component Dropdown Item (Tùy chỉnh)
 * -----------------------------------------------------------------------------
 */

/**
 * @component DropdownItem
 * @description Component item cho Dropdown. Khi click sẽ set giá trị
 * và đóng Dropdown lại.
 */
const DropdownItem = ({ onClick, children, isActive = false }) => {
    const { setIsOpen } = useContext(DropdownContext);

    const handleClick = () => {
        if (onClick) {
            onClick();
        }
        setIsOpen(false);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`block w-full text-left px-3 py-1.5 text-sm rounded-md ${isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                }`}
        >
            {children}
        </button>
    );
};


/**
 * -----------------------------------------------------------------------------
 * Component Chính: CreateTaskDialog
 * -----------------------------------------------------------------------------
 */

export default function CreateTaskDialog({
    open,
    onClose,
    projectId,
    projectMembers = [],
    users = [],
    canManage = false,
    currentUserId = '',
    onSuccess
}) {
    const router = useRouter();
    const { run, Overlays, isLoading } = useAsyncNotifier({ enableNoti: false });
    const [error, setError] = useState('');

    // State cho các Dropdown tùy chỉnh
    const [priority, setPriority] = useState(PRIORITY.MEDIUM);
    const [assignee, setAssignee] = useState(currentUserId);
    const [assigneeSearch, setAssigneeSearch] = useState('');
    // THÊM MỚI: State cho WorkType Dropdown
    const [workType, setWorkType] = useState('');
    const [workTypeSearch, setWorkTypeSearch] = useState('');

    // State cho Form Data
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        // workType được quản lý bằng state riêng (ở trên)
        plannedStartAt: '',
        plannedStartTime: '',
        plannedDueAt: '',
        plannedDueTime: '',
        tags: '',
        initialPoints: 0,
        autoBypassForSubtask: false,
        createTaskFolder: true,
    });

    /**
     * @function useEffect (onOpen)
     * @description Reset form và set ngày/giờ mặc định khi dialog được mở.
     */
    useEffect(() => {
        if (open) {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const defaultStartDate = getInitialDateTime(today, 9, 0);
            const defaultDueDate = getInitialDateTime(tomorrow, 17, 0);

            setError('');
            // Reset tất cả state của dropdown
            setPriority(PRIORITY.MEDIUM);
            setAssignee(currentUserId);
            setAssigneeSearch('');
            setWorkType(''); // THÊM MỚI
            setWorkTypeSearch(''); // THÊM MỚI

            setFormData({
                title: '',
                description: '',
                // workType đã bị xóa khỏi đây
                plannedStartAt: formatDate(defaultStartDate),
                plannedStartTime: formatTime(defaultStartDate),
                plannedDueAt: formatDate(defaultDueDate),
                plannedDueTime: formatTime(defaultDueDate),
                tags: '',
                initialPoints: 0,
                autoBypassForSubtask: false,
                createTaskFolder: true,
            });
        }
    }, [open, currentUserId]);


    // --- MEMO CHO ASSIGNEE ---
    const assigneeOptions = useMemo(() => {
        if (!canManage) return [];
        const defaultOption = { value: '', label: '-- Giao sau --', name: '-- Giao sau --' };
        // Sử dụng users (team members) thay vì projectMembers
        const memberOptions = users.map(user => ({
            value: user.value,
            label: user.label || user.name,
            name: user.name
        }));
        return [defaultOption, ...memberOptions];
    }, [canManage, users]);

    const filteredAssigneeOptions = useMemo(() => {
        if (!assigneeSearch) return assigneeOptions;
        return assigneeOptions.filter(opt =>
            opt.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
            opt.label.toLowerCase().includes(assigneeSearch.toLowerCase())
        );
    }, [assigneeOptions, assigneeSearch]);

    const selectedAssignee = useMemo(() => {
        return assigneeOptions.find(opt => opt.value === assignee);
    }, [assignee, assigneeOptions]);


    // --- THÊM MỚI: MEMO CHO WORK TYPE ---
    /**
     * @function useMemo (workTypeOptions)
     * @description Tạo danh sách Work Type (bao gồm cả option mặc định).
     */
    const workTypeOptions = useMemo(() => {
        const defaultOption = { code: '', name: '-- Chọn loại công việc --', icon: null };
        return [defaultOption, ...WORK_TYPES];
    }, []);

    /**
     * @function useMemo (filteredWorkTypes)
     * @description Lọc danh sách Work Type dựa trên thanh tìm kiếm.
     */
    const filteredWorkTypes = useMemo(() => {
        if (!workTypeSearch) return workTypeOptions;
        return workTypeOptions.filter(wt =>
            wt.name.toLowerCase().includes(workTypeSearch.toLowerCase())
        );
    }, [workTypeOptions, workTypeSearch]);

    /**
     * @function useMemo (selectedWorkType)
     * @description Lấy thông tin của Work Type đang được chọn để hiển thị.
     */
    const selectedWorkType = useMemo(() => {
        return workTypeOptions.find(wt => wt.code === workType);
    }, [workType, workTypeOptions]);


    // --- MEMO CHO USER & PRIORITY ---
    const currentUserInfo = useMemo(() => {
        return users.find(u => u.value === currentUserId);
    }, [users, currentUserId]);

    const selectedPriority = useMemo(() => {
        return PRIORITY_OPTIONS.find(opt => opt.value === priority);
    }, [priority]);


    /**
     * @function handleChange
     * @description Cập nhật state của form data khi input thay đổi.
     */
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    /**
     * @function handleSubmit
     * @description Gộp ngày/giờ, validate và gửi payload lên server action.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.title.trim()) {
            setError('Tiêu đề task là bắt buộc');
            return;
        }

        const startDateTime = (formData.plannedStartAt && formData.plannedStartTime)
            ? new Date(`${formData.plannedStartAt}T${formData.plannedStartTime}`)
            : null;

        const dueDateTime = (formData.plannedDueAt && formData.plannedDueTime)
            ? new Date(`${formData.plannedDueAt}T${formData.plannedDueTime}`)
            : null;

        const payload = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            tags: formData.tags
                ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
                : [],

            // Lấy từ state dropdown
            workType: workType || null, // CẬP NHẬT
            priority: priority,
            assignee: (canManage ? assignee : currentUserId) || null,

            plannedStartAt: startDateTime,
            plannedDueAt: dueDateTime,
            initialPoints: canManage ? (Number(formData.initialPoints) || 0) : 0,
            autoBypassForSubtask: formData.autoBypassForSubtask,
            createTaskFolder: formData.createTaskFolder,
        };

        await run(
            () => createTask(projectId, payload),
            {
                loadingMessage: 'Đang tạo nhiệm vụ...',
                onSuccess: (res) => {
                    if (onSuccess) {
                        onSuccess(res.data);
                    } else {
                        router.refresh();
                    }
                    onClose();
                },
                onError: (err) => {
                    setError(err.message || 'Không thể tạo task');
                }
            }
        );
    };

    const isAssigningToOthers = canManage && assignee && assignee !== currentUserId;

    return (
        <>
            <Overlays />
            <DialogComponent
                open={open}
                onOpenChange={(openState) => !openState && onClose()}
                title="Tạo nhiệm vụ mới"
                description={canManage
                    ? "Tạo task cho bản thân hoặc gán cho thành viên trong dự án"
                    : "Task của bạn sẽ được gửi đến quản lý để phê duyệt"}
                size="5xl"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Vùng báo lỗi */}
                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Banner cho nhân viên */}
                    {!canManage && (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex gap-2 items-start">
                            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <p><strong>Lưu ý:</strong> Task sẽ ở trạng thái "Chờ phê duyệt". Điểm dự kiến (nếu có) chỉ có hiệu lực sau khi quản lý xem xét.</p>
                            </div>
                        </div>
                    )}

                    {/* Banner khi manager gán cho người khác */}
                    {isAssigningToOthers && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2 items-start">
                            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                                <p><strong>Gán cho người khác:</strong> Task sẽ bắt đầu sau khi người được gán xác nhận. Họ cũng sẽ có quyền tạo và phân chia điểm cho các công việc con.</p>
                            </div>
                        </div>
                    )}

                    {/* --- VÙNG FORM CHIA 2 CỘT --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">

                        {/* Cột 1: Thông tin chính */}
                        <div className="space-y-5">
                            {/* Tiêu đề */}
                            <Input
                                label="Tiêu đề"
                                required
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                placeholder="Nhập tiêu đề nhiệm vụ..."
                                disabled={isLoading}
                            />

                            {/* Mô tả */}
                            <Textarea
                                label="Mô tả"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Mô tả chi tiết nhiệm vụ..."
                                rows={8}
                                disabled={isLoading}
                            />

                            {/* Tags */}
                            <Input
                                label="Tags"
                                value={formData.tags}
                                onChange={(e) => handleChange('tags', e.target.value)}
                                placeholder="Nhập tags, cách nhau bằng dấu phẩy"
                                helperText="Ví dụ: urgent, design, backend"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Cột 2: Metadata & Cấu hình */}
                        <div className="space-y-5">
                            {/* Assignee (Dropdown tùy chỉnh) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Người thực hiện</label>
                                {canManage ? (
                                    <Dropdown>
                                        <Dropdown.Trigger>
                                            <button
                                                type="button"
                                                disabled={isLoading}
                                                className="relative block w-full border border-gray-200 bg-white rounded-md py-2 pl-3 pr-10 text-sm text-left text-foreground hover:border-muted-200 focus:outline-none focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/30"
                                            >
                                                <span className={selectedAssignee?.value ? 'text-gray-900' : 'text-muted-400'}>
                                                    {truncateText(selectedAssignee?.name || '-- Giao sau --', { maxLength: 25 })}
                                                    {selectedAssignee?.value === currentUserId && ' (Bản thân)'}
                                                </span>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                                </div>
                                            </button>
                                        </Dropdown.Trigger>
                                        <Dropdown.Content className="p-2" width="w-full">
                                            <Input
                                                type="text"
                                                placeholder="Tìm thành viên..."
                                                value={assigneeSearch}
                                                onChange={(e) => setAssigneeSearch(e.target.value)}
                                                leftIcon={<Search size={16} />}
                                                className="mb-2"
                                            />
                                            <div className="max-h-60 overflow-y-auto">
                                                {filteredAssigneeOptions.map(opt => (
                                                    <DropdownItem
                                                        key={opt.value}
                                                        onClick={() => setAssignee(opt.value)}
                                                        isActive={assignee === opt.value}
                                                    >
                                                        {opt.name}
                                                        {opt.value === currentUserId && ' (Bản thân)'}
                                                    </DropdownItem>
                                                ))}
                                            </div>
                                        </Dropdown.Content>
                                    </Dropdown>
                                ) : (
                                    <div className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700">
                                        <User className="h-4 w-4 text-gray-500" />
                                        <span>{truncateText(currentUserInfo?.name, { maxLength: 20 })} (Bản thân)</span>
                                    </div>
                                )}
                            </div>

                            {/* Priority (Dropdown tùy chỉnh) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Độ ưu tiên</label>
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button
                                            type="button"
                                            disabled={isLoading}
                                            className="relative block w-full border border-gray-200 bg-white rounded-md py-2 pl-3 pr-10 text-sm text-left text-foreground hover:border-muted-200 focus:outline-none focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/30"
                                        >
                                            {selectedPriority?.label || 'Chọn độ ưu tiên'}
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                <ChevronDown className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </button>
                                    </Dropdown.Trigger>
                                    <Dropdown.Content className="p-1" width="w-full">
                                        <div className="max-h-60 overflow-y-auto">
                                            {PRIORITY_OPTIONS.map(opt => (
                                                <DropdownItem
                                                    key={opt.value}
                                                    onClick={() => setPriority(opt.value)}
                                                    isActive={priority === opt.value}
                                                >
                                                    {opt.label}
                                                </DropdownItem>
                                            ))}
                                        </div>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>

                            {/* --- CẬP NHẬT: WORK TYPE (DÙNG DROPDOWN) --- */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Loại công việc</label>
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button
                                            type="button"
                                            disabled={isLoading}
                                            className="relative block w-full border border-gray-200 bg-white rounded-md py-2 pl-3 pr-10 text-sm text-left text-foreground hover:border-muted-200 focus:outline-none focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/30"
                                        >
                                            <span className={workType ? 'text-gray-900' : 'text-muted-400'}>
                                                {selectedWorkType?.icon} {selectedWorkType?.name || '-- Chọn loại công việc --'}
                                            </span>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                <ChevronDown className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </button>
                                    </Dropdown.Trigger>
                                    <Dropdown.Content className="p-2" width="w-full">
                                        <Input
                                            type="text"
                                            placeholder="Tìm loại công việc..."
                                            value={workTypeSearch}
                                            onChange={(e) => setWorkTypeSearch(e.target.value)}
                                            leftIcon={<Search size={16} />}
                                            className="mb-2"
                                        />
                                        {/* GIỚI HẠN CHIỀU CAO 300px */}
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {filteredWorkTypes.map(wt => (
                                                <DropdownItem
                                                    key={wt.code}
                                                    onClick={() => setWorkType(wt.code)}
                                                    isActive={workType === wt.code}
                                                >
                                                    {wt.icon} {wt.name}
                                                </DropdownItem>
                                            ))}
                                        </div>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                            {/* --- KẾT THÚC CẬP NHẬT --- */}

                            {/* Input Ngày Bắt Đầu (Gộp) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="date"
                                        value={formData.plannedStartAt}
                                        onChange={(e) => handleChange('plannedStartAt', e.target.value)}
                                        disabled={isLoading}
                                        className="flex-grow"
                                    />
                                    <Input
                                        type="time"
                                        value={formData.plannedStartTime}
                                        onChange={(e) => handleChange('plannedStartTime', e.target.value)}
                                        disabled={isLoading}
                                        className="w-28"
                                    />
                                </div>
                            </div>

                            {/* Input Hạn Hoàn Thành (Gộp) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hạn hoàn thành</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="date"
                                        value={formData.plannedDueAt}
                                        onChange={(e) => handleChange('plannedDueAt', e.target.value)}
                                        disabled={isLoading}
                                        className="flex-grow"
                                    />
                                    <Input
                                        type="time"
                                        value={formData.plannedDueTime}
                                        onChange={(e) => handleChange('plannedDueTime', e.target.value)}
                                        disabled={isLoading}
                                        className="w-28"
                                    />
                                </div>
                            </div>

                            {/* Points (Chỉ manager thấy) */}
                            {canManage && (
                                <Input
                                    label="Điểm dự kiến"
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={formData.initialPoints}
                                    onChange={(e) => handleChange('initialPoints', e.target.value)}
                                    placeholder="0"
                                    helperText="Điểm thưởng khi hoàn thành (có thể sửa sau)"
                                    disabled={isLoading}
                                />
                            )}
                        </div>
                    </div>

                    {/* Checkboxes (Bên ngoài grid, full-width) */}
                    <div className='pt-5 border-t border-gray-200 space-y-3'>
                        {canManage && (
                            <Checkbox
                                label="Tự động hoàn thành khi tất cả subtasks xong"
                                checked={formData.autoBypassForSubtask}
                                onChange={(e) => handleChange('autoBypassForSubtask', e.target.checked)}
                                helperText="Task cha sẽ tự hoàn thành khi tất cả công việc con hoàn thành"
                                disabled={isLoading}
                            />
                        )}
                        <Checkbox
                            label="Tạo folder riêng cho công việc trong Drive"
                            checked={formData.createTaskFolder}
                            onChange={(e) => handleChange('createTaskFolder', e.target.checked)}
                            helperText="Tạo folder trong Google Drive của dự án cho công việc này"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={!formData.title.trim() || isLoading}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isLoading ? 'Đang tạo...' : 'Tạo nhiệm vụ'}
                        </button>
                    </div>
                </form>
            </DialogComponent>
        </>
    );
}