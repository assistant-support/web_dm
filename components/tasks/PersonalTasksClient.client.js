// components/tasks/PersonalTasksClient.client.js
// Client component cho personal tasks với multi-view

'use client';

import { useState, useMemo, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TaskToolbar from './TaskToolbar'; // Assuming component exists
import TaskList from './TaskList.client';
import KanbanBoard from './KanbanBoard'; // Assuming component exists
import CalendarView from './CalendarView'; // Assuming component exists
import GanttView from './GanttView.client'; // Assuming component exists
import CreateTaskDialog from './CreateTaskDialog.client'; // Assuming component exists
import Button from '@/components/ui/button'; // Assuming component exists
import { Plus, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import Dropdown, { DropdownContext } from '@/components/ui/dropdown'; // Assuming component exists
import { Input } from '@/components/ui/input'; // Assuming component exists
import { TASK_STATUS } from '@/model/common/enums'; // Assuming enums exist

// Helper Icons (Define or import if needed elsewhere)
const CustomChevronDownIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="m6 9 6 6 6-6" />
    </svg>
);
const CheckIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

/**
 * Dropdown Item specific for FilterDropdown.
 * Uses Context to close the dropdown on selection.
 */
function FilterDropdownItem({ label, value, onSelect, isSelected }) {
    // Safely get context, provide a dummy function if context is not available
    const context = useContext(DropdownContext);
    const setIsOpen = context ? context.setIsOpen : () => { console.warn("DropdownContext not found for FilterDropdownItem"); };

    return (
        <button
            type="button"
            onClick={() => {
                onSelect(value);
                setIsOpen(false); // Close dropdown on select
            }}
            className={clsx(
                "flex items-center justify-between w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer hover:bg-gray-50", // Adjusted hover
                isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700' // Adjusted selected style
            )}
        >
            <span className="truncate">{label}</span>
            {isSelected && <CheckIcon className="w-3 h-3 text-blue-700" />}
        </button>
    );
}


/**
 * Reusable FilterDropdown component using the custom Dropdown.
 */
function FilterDropdown({ label, options, value, onChange, placeholder, searchable = false, searchTerm, onSearchChange }) {
    const selectedOption = options.find(opt => opt.value === value);
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    const filteredOptions = searchable && searchTerm
        ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
        : options;

    return (
        <div className="flex-1 min-w-[180px]">
            {label && (
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
            )}
            <Dropdown>
                <Dropdown.Trigger>
                    <button
                        type="button"
                        className={clsx(
                            "flex items-center justify-between border w-full rounded-md text-sm transition-all duration-200 focus:outline-none",
                            "py-2 pl-3 pr-2 text-left",
                            "border-gray-300 bg-white text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        )}
                    >
                        <span className={clsx("truncate", selectedOption ? 'text-gray-900' : 'text-gray-400')}>
                            {displayLabel}
                        </span>
                        <CustomChevronDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0 ml-1" />
                    </button>
                </Dropdown.Trigger>

                <Dropdown.Content width="w-full" className="max-h-60 overflow-y-auto custom-scrollbar p-1 z-20">
                    {searchable && (
                        <div className="p-1 sticky top-0 bg-white z-10 border-b border-gray-100 mb-1">
                            <Input
                                placeholder="Tìm kiếm..."
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full border border-gray-200 rounded-md !py-1.5 !text-sm" // Smaller input
                            />
                        </div>
                    )}

                    <div className='flex flex-col gap-0.5'>
                        {/* "All" Option */}
                        <FilterDropdownItem
                            label={placeholder}
                            value=""
                            onSelect={onChange}
                            isSelected={value === ""}
                        />

                        {/* Filtered Options */}
                        {filteredOptions.map(option => (
                            <FilterDropdownItem
                                key={option.value}
                                label={option.label}
                                value={option.value}
                                onSelect={onChange}
                                isSelected={value === option.value}
                            />
                        ))}
                        {/* No results message */}
                        {searchable && filteredOptions.length === 0 && (
                            <span className="px-3 py-1.5 text-sm text-gray-400">Không tìm thấy</span>
                        )}
                    </div>
                </Dropdown.Content>
            </Dropdown>
        </div>
    );
}


export default function PersonalTasksClient({
    initialTasks,
    projects = [], // Receive the projects array correctly
    currentUserId,
    users = [], // For CreateTaskDialog picker
    allUsersWithDetails = [], // Receive standardized user details

    // [THÊM] Nhận 2 props này từ server
    workTypes = [],
    platforms = [],
}) {
    const router = useRouter();

    // UI State
    const [view, setView] = useState('list');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const [tasks, setTasks] = useState(initialTasks);
    const [selectedProject, setSelectedProject] = useState(''); // For Create Task Dialog

    // Sync tasks when server data changes
    useEffect(() => {
        setTasks(initialTasks);
    }, [initialTasks]);

    // Filter State
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        projectId: '',
        startDate: '',
        endDate: '',
    });
    const [projectSearch, setProjectSearch] = useState(''); // For project filter dropdown

    // Prepare project options for filter dropdown
    const projectOptions = useMemo(() =>
        projects.map(p => ({ value: p._id, label: p.name })),
        [projects]
    );

    // Status and Priority options for filters
    const statusOptions = [
        { value: TASK_STATUS.COMPLETED, label: 'Hoàn thành' },
        { value: TASK_STATUS.DRAFT, label: 'Nháp' },
        { value: TASK_STATUS.PENDING_APPROVAL, label: 'Chờ duyệt tạo' },
        { value: TASK_STATUS.WAITING_ASSIGNEE_CONFIRM, label: 'Chờ xác nhận' },
        { value: TASK_STATUS.IN_PROGRESS, label: 'Đang làm' },
        { value: TASK_STATUS.ON_HOLD, label: 'Tạm dừng' },
        { value: TASK_STATUS.COMPLETED_AWAIT_REVIEW, label: 'Chờ duyệt HT' },
        { value: TASK_STATUS.REJECTED, label: 'Bị từ chối' },
        { value: TASK_STATUS.CANCELLED, label: 'Đã hủy' },
    ];
    const priorityOptions = [
        { value: 'urgent', label: '🔥 Khẩn cấp' },
        { value: 'high', label: 'Cao' },
        { value: 'medium', label: 'Bình thường' },
        { value: 'low', label: 'Thấp' },
    ];

    // Filtering Logic
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            // Logic lọc của người dùng
            if (filters.status && t.status !== filters.status) return false;
            if (filters.priority && t.priority !== filters.priority) return false;
            if (filters.projectId && String(t.project) !== String(filters.projectId)) return false;

            // Date filtering
            try {
                const taskDueDate = t.plannedDueAt ? new Date(t.plannedDueAt) : null;

                if (!taskDueDate && (filters.startDate || filters.endDate)) return false;

                if (taskDueDate) {
                    if (filters.startDate) {
                        const startDate = new Date(filters.startDate); startDate.setHours(0, 0, 0, 0);
                        if (taskDueDate < startDate) return false;
                    }
                    if (filters.endDate) {
                        const endDate = new Date(filters.endDate); endDate.setHours(23, 59, 59, 999);
                        if (taskDueDate > endDate) return false;
                    }
                }
            } catch (e) { console.error("Date filter error:", e); return false; }

            return true;
        });
    }, [tasks, filters]);

    // [SỬA LẠI] Logic tính toán cho Stat Cards
    const statCardCounts = useMemo(() => {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        let total = 0; // "Tổng số (Active)"
        let inProgress = 0;
        let pending = 0;

        // [SỬA] Đổi tên biến này để đếm TẤT CẢ task hoàn thành
        let allCompletedCount = 0;

        for (const t of filteredTasks) {

            if (t.status === TASK_STATUS.COMPLETED) {
                // [SỬA] Chỉ cần đếm tất cả task hoàn thành
                allCompletedCount++;
            } else if (t.status === TASK_STATUS.IN_PROGRESS) {
                inProgress++;
            } else if ([
                TASK_STATUS.PENDING_APPROVAL,
                TASK_STATUS.WAITING_ASSIGNEE_CONFIRM,
                TASK_STATUS.COMPLETED_AWAIT_REVIEW
            ].includes(t.status)) {
                pending++;
            }
        }

        // Logic điều chỉnh 'total' (để khớp với TaskList)
        total = 0;
        if (filters.status === '') {
            // Nếu không lọc status, Total = (Tất cả task chưa HT) + (Task HT < 24h)
            for (const t of filteredTasks) {
                if (t.status === TASK_STATUS.COMPLETED) {
                    // TaskList sẽ chỉ hiển thị task HT < 24h trong danh sách active
                    const completedDate = t.completedAt ? new Date(t.completedAt) : null;
                    if (completedDate && completedDate >= oneDayAgo) {
                        total++;
                    }
                } else {
                    total++; // Đếm tất cả task hoạt động khác
                }
            }
        } else if (filters.status === TASK_STATUS.COMPLETED) {
            // Nếu lọc "Hoàn thành", total là tất cả task hoàn thành
            total = allCompletedCount;
        } else {
            // Nếu lọc trạng thái active khác
            total = inProgress + pending; // Hoặc filteredTasks.length nếu status là 1 trong các trạng thái active
            total = filteredTasks.length;
        }

        // [SỬA] Trả về allCompletedCount
        return { total, inProgress, pending, allCompletedCount };

    }, [filteredTasks, filters.status]);


    // Callbacks for Dialogs: Dùng router.refresh()
    const handleTaskCreated = (newTask) => {
        router.refresh();
    };

    const handleTaskUpdated = (updatedTask) => {
        router.refresh();
    };

    // Info for Create Task Dialog
    const selectedProjectInfo = useMemo(() => {
        if (!selectedProject) return null;
        return projects.find(p => String(p._id) === String(selectedProject));
    }, [selectedProject, projects]);

    const canManageSelectedProject = useMemo(() => {
        if (!selectedProjectInfo || !selectedProjectInfo.members) return false;
        const member = selectedProjectInfo.members.find(m => m.userId === currentUserId);
        return member && (member.role === 'owner' || member.role === 'manager');
    }, [selectedProjectInfo, currentUserId]);

    // Filter helpers
    const activeFilterCount = Object.values(filters).filter(Boolean).length;
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };
    const clearFilters = () => {
        setFilters({ status: '', priority: '', projectId: '', startDate: '', endDate: '' });
        setProjectSearch('');
    };

    return (
        <div className="flex flex-col flex-1 w-full h-full">
            {/* Header Section */}
            <div className="flex-none mb-4">
                <div className="bg-white rounded-md border border-gray-200">
                    <div className="px-4 sm:px-6 py-3">
                        {/* Toolbar and Action Buttons */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <TaskToolbar view={view} onViewChange={setView} />
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)} className={'!py-1.5 !text-xs'} icon={isHeaderCollapsed ? ChevronDown : ChevronUp}>
                                        <span>{isHeaderCollapsed ? "Mở rộng" : "Thu gọn"}</span>
                                    </Button>
                                    <Button variant={showFilters ? "secondary" : "ghost"} size="sm" onClick={() => setShowFilters(!showFilters)} icon={Filter} className={clsx('!py-1.5 !text-xs relative', showFilters && 'bg-blue-50 text-blue-700')}>
                                        <span>Bộ lọc</span>
                                        {activeFilterCount > 0 && (<span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">{activeFilterCount}</span>)}
                                    </Button>
                                    {activeFilterCount > 0 && (
                                        <Button variant="ghost" size="sm" onClick={clearFilters} className={'!py-1.5 !text-xs text-red-600'} tooltip="Xóa bộ lọc">
                                            <span>Xóa lọc</span>
                                        </Button>
                                    )}
                                </div>
                                <Button variant="primary" size="sm" onClick={() => setShowCreateDialog(true)} icon={Plus} className="!py-2.5 !text-xs">
                                    <span className="hidden sm:inline">Tạo nhiệm vụ</span>
                                    <span className="sm:hidden">Tạo</span>
                                </Button>
                            </div>
                        </div>

                        {/* Filter Section */}
                        {showFilters && (
                            <div className="border-t border-gray-100 pt-3 mt-3">
                                <div className="flex flex-wrap items-end gap-3">
                                    <FilterDropdown
                                        label="Dự án" options={projectOptions} value={filters.projectId}
                                        onChange={(val) => handleFilterChange('projectId', val)} placeholder="Tất cả dự án"
                                        searchable={true} searchTerm={projectSearch} onSearchChange={setProjectSearch}
                                    />
                                    <FilterDropdown
                                        label="Trạng thái" options={statusOptions} value={filters.status}
                                        onChange={(val) => handleFilterChange('status', val)}
                                        placeholder="Tất cả trạng thái"
                                    />
                                    <FilterDropdown
                                        label="Độ ưu tiên" options={priorityOptions} value={filters.priority}
                                        onChange={(val) => handleFilterChange('priority', val)} placeholder="Tất cả độ ưu tiên"
                                    />
                                    <div className="flex-1 min-w-[140px]">
                                        <Input label="Từ ngày" type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} className="w-full" />
                                    </div>
                                    <div className="flex-1 min-w-[140px]">
                                        <Input label="Đến ngày" type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} className="w-full" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* [SỬA LẠI] Stat Cards Section */}
                        {!isHeaderCollapsed && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                                <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                                    <p className="text-[10px] font-medium text-gray-500 uppercase">Tổng số (Active)</p>
                                    <p className="text-xl font-bold text-gray-800 mt-0.5">{statCardCounts.total}</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                                    <p className="text-[10px] font-medium text-blue-600 uppercase">Đang làm</p>
                                    <p className="text-xl font-bold text-blue-800 mt-0.5">{statCardCounts.inProgress}</p>
                                </div>
                                <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-100">
                                    <p className="text-[10px] font-medium text-amber-600 uppercase">Chờ xử lý</p>
                                    <p className="text-xl font-bold text-amber-800 mt-0.5">{statCardCounts.pending}</p>
                                </div>

                                {/* [SỬA] Thẻ hiển thị TẤT CẢ SỐ LƯỢNG task hoàn thành */}
                                <div className="bg-green-50 rounded-lg p-2.5 border border-green-100">
                                    {/* [SỬA] Bỏ chữ "Gần Đây" */}
                                    <p className="text-[10px] font-medium text-green-600 uppercase">Đã hoàn thành</p>
                                    <p className="text-xl font-bold text-green-800 mt-0.5">
                                        {/* [SỬA] Hiển thị allCompletedCount */}
                                        {statCardCounts.allCompletedCount}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area (Task Views) */}
            <div className="flex-1 overflow-hidden">
                <div className="h-full bg-white rounded-md shadow-soft border border-gray-200 overflow-y-auto custom-scrollbar">
                    <div className="p-4 sm:p-6">
                        {view === 'list' && (
                            <TaskList
                                initialTasks={filteredTasks}
                                users={users}
                                allUsersWithDetails={allUsersWithDetails}
                                currentUserId={currentUserId}
                                onTaskUpdated={handleTaskUpdated}
                                workTypes={workTypes}
                                platforms={platforms}
                            />
                        )}
                        {view === 'kanban' && <KanbanBoard tasks={filteredTasks} users={allUsersWithDetails} onTaskUpdate={handleTaskUpdated} workTypes={workTypes} platforms={platforms} />}
                        {view === 'calendar' && <CalendarView tasks={filteredTasks} />}
                        {view === 'gantt' && <GanttView tasks={filteredTasks} onTaskUpdate={handleTaskUpdated} />}
                    </div>
                </div>
            </div>

            {/* --- Create Task Dialog Logic (FULL IMPLEMENTATION) --- */}
            {showCreateDialog && (
                <div className="space-y-4">
                    {/* 1. Project Selection Modal */}
                    {!selectedProject && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                                <div className="p-5 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        Chọn dự án để tạo nhiệm vụ
                                    </h3>
                                </div>
                                {/* Scrollable list of projects */}
                                <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">
                                    {projects.length > 0 ? projects.map(project => {
                                        // Determine user's role in this project
                                        const member = project.members?.find(m => m.userId === currentUserId);
                                        const isManager = member && (member.role === 'owner' || member.role === 'manager');
                                        const roleLabel = isManager ? 'Quản lý' : (member ? 'Thành viên' : 'Không rõ');
                                        const roleClass = isManager ? 'text-blue-600 font-medium' : 'text-gray-600';

                                        return (
                                            <button
                                                key={project._id}
                                                onClick={() => setSelectedProject(project._id)}
                                                className="block w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            >
                                                <p className="font-medium text-gray-900">{project.name}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Vai trò của bạn: <span className={roleClass}>{roleLabel}</span>
                                                </p>
                                            </button>
                                        );
                                    }) : (
                                        <p className="text-sm text-gray-500 text-center py-4">Bạn chưa tham gia dự án nào.</p>
                                    )}
                                </div>
                                {/* Footer with Cancel button */}
                                <div className="p-4 bg-gray-50 border-t border-gray-200 text-right">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setShowCreateDialog(false)}
                                        className="!py-1.5 !text-xs"
                                    >
                                        Hủy
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. Create Task Dialog (Rendered when project is selected) */}
                    {selectedProject && selectedProjectInfo && (
                        <CreateTaskDialog
                            open={true}
                            onClose={() => {
                                setShowCreateDialog(false);
                                setSelectedProject('');
                            }}
                            projectId={selectedProject}
                            currentUserId={currentUserId}
                            projectMembers={selectedProjectInfo.members || []}
                            canManage={canManageSelectedProject}
                            users={users}

                            workTypes={workTypes}
                            platforms={platforms}

                            onSuccess={(newTask) => {
                                handleTaskCreated(newTask);
                                setShowCreateDialog(false);
                                setSelectedProject('');
                            }}
                        />
                    )}
                </div>
            )}
            {/* --- END Create Task Dialog Logic --- */}
        </div>
    );
}