// components/tasks/PersonalTasksClient.client.js
// Client component cho personal tasks với multi-view (List, Kanban, Calendar, Gantt)

'use client';

import { useState, useMemo, useContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TaskToolbar from './TaskToolbar';
import TaskList from './TaskList.client';
import KanbanBoard from './KanbanBoard';
import CalendarView from './CalendarView';
import GanttView from './GanttView.client';
import CreateTaskDialog from './CreateTaskDialog.client';
import Button from '@/components/ui/button';
import { Plus, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import Dropdown, { DropdownContext } from '@/components/ui/dropdown';
import { Input } from '@/components/ui/input';

// Helper component (Icon)
const CustomChevronDownIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="m6 9 6 6 6-6" />
    </svg>
);
// Helper component (Icon)
const CheckIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);


/**
 * Item con cho dropdown, sử dụng Context để tự đóng khi được click
 */
function DropdownItem({ label, value, onSelect, isSelected }) {
    // Lấy context từ component Dropdown cha
    const context = useContext(DropdownContext);
    const setIsOpen = context ? context.setIsOpen : () => { };

    return (
        <button
            type="button"
            onClick={() => {
                onSelect(value);
                setIsOpen(false); // Đóng dropdown khi chọn
            }}
            className={clsx(
                "flex items-center justify-between w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer hover:bg-muted-50",
                isSelected ? 'bg-brand-light text-brand font-medium' : 'text-body '
            )}
        >
            <span className="truncate">{label}</span>
            {isSelected && <CheckIcon className="w-4 h-4" />}
        </button>
    );
}

/**
 * Component FilterDropdown tùy chỉnh
 * Kết hợp <Dropdown> và <Input> để tạo bộ lọc có thể tìm kiếm
 */
function FilterDropdown({ label, options, value, onChange, placeholder, searchable = false, searchTerm, onSearchChange }) {
    // Tìm label của item đang được chọn để hiển thị
    const selectedOption = options.find(opt => opt.value === value);
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    // Lọc các tùy chọn nếu đang tìm kiếm
    const filteredOptions = searchable && searchTerm
        ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
        : options;

    return (
        <div className="flex-1 min-w-[180px]">
            {label && (
                <label className="block text-xs font-medium text-body mb-1.5">{label}</label>
            )}
            <Dropdown>
                <Dropdown.Trigger>
                    <button
                        type="button"
                        className={clsx(
                            "flex items-center justify-between border border-gray-200 w-full rounded-md border text-sm transition-all duration-200 focus:outline-none",
                            "py-2 pl-3 pr-2 text-left",
                            "border-muted-100 bg-white text-foreground hover:border-muted-200 focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/30"
                        )}
                    >
                        <span className={clsx("truncate", selectedOption ? 'text-foreground' : 'text-muted-400')}>
                            {displayLabel}
                        </span>
                        <CustomChevronDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0 ml-1" />
                    </button>
                </Dropdown.Trigger>

                <Dropdown.Content width="w-full" className="max-h-60 overflow-y-auto custom-scrollbar p-2 z-20">
                    {searchable && (
                        <div className="p-1 sticky top-0 bg-white z-10">
                            <Input
                                placeholder="Tìm kiếm..."
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full border border-gray-200 rounded-md"
                            />
                        </div>
                    )}

                    <div className='p-1 flex flex-col gap-1'>
                        <DropdownItem
                            label={placeholder}
                            value=""
                            onSelect={onChange}
                            isSelected={value === ""}
                        />

                        {filteredOptions.map(option => (
                            <DropdownItem
                                key={option.value}
                                label={option.label}
                                value={option.value}
                                onSelect={onChange}
                                isSelected={value === option.value}
                            />
                        ))}
                        {filteredOptions.length === 0 && (
                            <span className="px-3 py-1.5 text-sm text-muted">Không tìm thấy</span>
                        )}
                    </div>
                </Dropdown.Content>
            </Dropdown>
        </div>
    );
}


/**
 * PersonalTasksClient - Component chính
 */
export default function PersonalTasksClient({ initialTasks, projects: initialProjects, currentUserId, users = [] }) {
    console.log(users);
    
    const router = useRouter();

    // State cho các trạng thái UI
    const [view, setView] = useState('list');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const [tasks, setTasks] = useState(initialTasks);
    const [selectedProject, setSelectedProject] = useState('');

    // State cho bộ lọc
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        projectId: '',
        startDate: '',
        endDate: '',
    });

    // State cho ô tìm kiếm dự án (trong dropdown)
    const [projectSearch, setProjectSearch] = useState('');

    // Xử lý dữ liệu projects truyền vào
    const projects = useMemo(() => {
        if (Array.isArray(initialProjects)) return initialProjects;
        if (initialProjects?.projects) return initialProjects.projects;
        return [];
    }, [initialProjects]);

    // Định nghĩa các tùy chọn cho dropdowns
    const projectOptions = useMemo(() =>
        projects.map(p => ({ value: p._id, label: p.name })),
        [projects]
    );
    const statusOptions = [
        { value: 'draft', label: 'Nháp' },
        { value: 'pending_approval', label: 'Chờ duyệt' },
        { value: 'in_progress', label: 'Đang làm' },
        { value: 'completed', label: 'Hoàn thành' },
    ];
    const priorityOptions = [
        { value: 'urgent', label: 'Khẩn cấp' },
        { value: 'high', label: 'Cao' },
        { value: 'normal', label: 'Bình thường' },
        { value: 'low', label: 'Thấp' },
    ];


    // Logic lọc (useMemo)
    const filteredTasks = useMemo(() => {
        let result = tasks;

        if (filters.status) {
            result = result.filter(t => t.status === filters.status);
        }
        if (filters.priority) {
            result = result.filter(t => t.priority === filters.priority);
        }
        if (filters.projectId) {
            result = result.filter(t => String(t.project) === String(filters.projectId));
        }

        // Giả định task có trường 'dueDate'
        if (filters.startDate) {
            try {
                const startDate = new Date(filters.startDate);
                startDate.setHours(0, 0, 0, 0); // Bắt đầu ngày
                result = result.filter(t => t.dueDate && new Date(t.dueDate) >= startDate);
            } catch (e) { console.error("Invalid start date"); }
        }
        if (filters.endDate) {
            try {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999); // Kết thúc ngày
                result = result.filter(t => t.dueDate && new Date(t.dueDate) <= endDate);
            } catch (e) { console.error("Invalid end date"); }
        }

        return result;
    }, [tasks, filters]);

    // Hàm callback khi tạo task thành công
    const handleTaskCreated = (newTask) => {
        setTasks(prev => [newTask, ...prev]);
        router.refresh();
    };

    // Lấy thông tin dự án đã chọn (cho dialog tạo task)
    const selectedProjectInfo = useMemo(() => {
        if (!selectedProject) return null;
        return projects.find(p => String(p._id) === String(selectedProject));
    }, [selectedProject, projects]);

    // Kiểm tra quyền quản lý dự án (cho dialog tạo task)
    const canManageProject = useMemo(() => {
        if (!selectedProjectInfo) return false;
        const member = selectedProjectInfo.members?.find(m => m.userId === currentUserId);
        return member && (member.role === 'owner' || member.role === 'manager');
    }, [selectedProjectInfo, currentUserId]);

    // Đếm số lượng filter đang được áp dụng
    const activeFilterCount = (filters.status ? 1 : 0) +
        (filters.priority ? 1 : 0) +
        (filters.projectId ? 1 : 0) +
        (filters.startDate ? 1 : 0) +
        (filters.endDate ? 1 : 0);

    // Hàm cập nhật filter chung
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Hàm xóa tất cả bộ lọc
    const clearFilters = () => {
        setFilters({
            status: '',
            priority: '',
            projectId: '',
            startDate: '',
            endDate: '',
        });
        setProjectSearch(''); // Cũng reset tìm kiếm
    };

    return (
        <div className="flex flex-col flex-1">
            <div className="flex-none">
                <div className="bg-white rounded-md border border-gray-200">
                    <div className="px-4 sm:px-6 py-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                                <TaskToolbar view={view} onViewChange={setView} />
                            </div>

                            <div className="flex gap-2">
                                <div className="inline-flex rounded-lg border border-muted bg-white p-1 gap-1">
                                    <Button
                                        variant="secondary"
                                        size="md"
                                        onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                                        className={'!py-2 !text-sm'}
                                        icon={isHeaderCollapsed ? ChevronDown : ChevronUp}
                                    >
                                        <span>{isHeaderCollapsed ? "Mở rộng" : "Thu gọn"}</span>
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="md"
                                        onClick={() => setShowFilters(!showFilters)}
                                        icon={Filter}
                                        style={{ border: !showFilters ? '' : 'thin solid var(--brand-300)', background: showFilters ? 'var(--brand-50)' : 'white' }}
                                        className={'!py-2 !text-sm relative'}
                                    >
                                        <span>Bộ lọc ({activeFilterCount})</span>
                                    </Button>
                                    {activeFilterCount > 0 && (
                                        <div className="flex-shrink-0">
                                            <Button
                                                variant="secondary"
                                                size="md"
                                                onClick={clearFilters}
                                                className={'!py-2 !text-sm'}
                                            >
                                                <span>Xóa bộ lọc</span>
                                            </Button>
                                        </div>
                                    )}
                                    <Button
                                        variant="primary"
                                        size="md"
                                        onClick={() => setShowCreateDialog(true)}
                                        icon={Plus}
                                        className="!py-2 !text-sm"
                                    >
                                        <span className="hidden sm:inline">Tạo nhiệm vụ</span>
                                        <span className="sm:hidden">Tạo</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {showFilters && (
                            <div className="py-3 mt-3">
                                <div className="flex flex-wrap items-end gap-3">
                                    <FilterDropdown
                                        label="Dự án"
                                        options={projectOptions}
                                        value={filters.projectId}
                                        onChange={(val) => handleFilterChange('projectId', val)}
                                        placeholder="Tất cả dự án"
                                        searchable={true}
                                        searchTerm={projectSearch}
                                        onSearchChange={setProjectSearch}
                                    />

                                    <FilterDropdown
                                        label="Trạng thái"
                                        options={statusOptions}
                                        value={filters.status}
                                        onChange={(val) => handleFilterChange('status', val)}
                                        placeholder="Tất cả trạng thái"
                                    />

                                    <FilterDropdown
                                        label="Độ ưu tiên"
                                        options={priorityOptions}
                                        value={filters.priority}
                                        onChange={(val) => handleFilterChange('priority', val)}
                                        placeholder="Tất cả độ ưu tiên"
                                    />

                                    <div className="flex-1 min-w-[140px]">
                                        <Input
                                            label="Từ ngày"
                                            type="date"
                                            value={filters.startDate}
                                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="flex-1 min-w-[140px]">
                                        <Input
                                            label="Đến ngày"
                                            type="date"
                                            value={filters.endDate}
                                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isHeaderCollapsed && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                                <div className="bg-muted-50 rounded-lg p-2.5 border border-[var(--muted-100)] hover:border-muted transition-all">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-medium text-muted uppercase tracking-wider">Tổng số</p>
                                            <p className="text-xl font-bold text-heading mt-0.5">{filteredTasks.length}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-base">
                                            📊
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-emerald-50/50 rounded-lg p-2.5 border border-emerald-100 hover:border-emerald-200 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Đang làm</p>
                                            <p className="text-xl font-bold text-emerald-700 mt-0.5">
                                                {filteredTasks.filter(t => t.status === 'in_progress').length}
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-base">
                                            🚀
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-amber-50/50 rounded-lg p-2.5 border border-amber-100 hover:border-amber-200 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">Chờ duyệt</p>
                                            <p className="text-xl font-bold text-amber-700 mt-0.5">
                                                {filteredTasks.filter(t => t.status === 'pending_approval').length}
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-base">
                                            ⏳
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[var(--brand-50)]/50 rounded-lg p-2.5 border border-[var(--brand-100)] hover:border-[var(--brand-200)] transition-all">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-medium text-[var(--brand-600)] uppercase tracking-wider">Hoàn thành</p>
                                            <p className="text-xl font-bold text-[var(--brand-700)] mt-0.5">
                                                {filteredTasks.filter(t => t.status === 'completed').length}
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-base">
                                            ✅
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden mt-2">
                <div className="h-full">
                    <div className="h-full bg-white rounded-md shadow-soft border border-gray-200 overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                            {view === 'list' && (
                                <TaskList
                                    initialTasks={filteredTasks}
                                    users={users}
                                    canManage={false}
                                />
                            )}

                            {view === 'kanban' && (
                                <KanbanBoard tasks={filteredTasks} />
                            )}

                            {view === 'calendar' && (
                                <CalendarView tasks={filteredTasks} />
                            )}

                            {view === 'gantt' && (
                                <GanttView tasks={filteredTasks} />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showCreateDialog && (
                <div className="space-y-4">
                    {!selectedProject && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-md shadow-soft max-w-md w-full p-6">
                                <h3 className="text-lg font-semibold text-heading mb-4">
                                    Chọn dự án
                                </h3>
                                <p className="text-sm text-body mb-4">
                                    Chọn dự án để tạo nhiệm vụ
                                </p>
                                <div className="space-y-2">
                                    {projects.map(project => {
                                        const member = project.members?.find(m => m.userId === currentUserId);
                                        const isManager = member && (member.role === 'owner' || member.role === 'manager');

                                        return (
                                            <button
                                                key={project._id}
                                                onClick={() => setSelectedProject(project._id)}
                                                className="w-full text-left p-3 border border-muted rounded-md hover:bg-muted-50 transition-colors"
                                            >
                                                <p className="font-medium text-heading">{project.name}</p>
                                                <p className="text-xs text-muted mt-1">
                                                    Vai trò: <span className={isManager ? 'text-brand font-medium' : 'text-body'}>
                                                        {isManager ? 'Quản lý' : 'Nhân viên'}
                                                    </span>
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="secondary"
                                    size="md"
                                    onClick={() => setShowCreateDialog(false)}
                                    className="mt-4 w-full !py-2 !text-sm"
                                >
                                    Hủy
                                </Button>
                            </div>
                        </div>
                    )}

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
                            canManage={canManageProject}
                            users={users}
                            onSuccess={handleTaskCreated}
                        />
                    )}
                </div>
            )}
        </div>
    );
}