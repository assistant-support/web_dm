// components/tasks/PersonalTasksClient.client.js
// Client component cho personal tasks với multi-view

'use client';

import { useState, useMemo, useContext, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
import UserInfoBadge from '@/components/ui/UserInfoBadge.client'; // [NEW] Component hiển thị thông tin user

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
    isAdmin = false, // [NEW] Admin có đầy đủ quyền
    currentUserName = '', // [NEW] Tên người dùng
    currentUserRole = 'member', // [NEW] Quyền người dùng

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

    // Filter State - Phải khai báo trước khi sử dụng
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        projectId: '',
        startDate: '',
        endDate: '',
    });

    // Infinite scroll state
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [totalLoaded, setTotalLoaded] = useState(initialTasks.length);
    const loadMoreTriggerRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const [isLoadingAllForView, setIsLoadingAllForView] = useState(false);

    // Task statistics from database
    const [taskStats, setTaskStats] = useState({
        total: 0,
        inProgress: 0,
        waitingConfirm: 0,
        rejected: 0,
        completedAwaitReview: 0,
        completed: 0,
        cancelled: 0,
    });
    const [loadingStats, setLoadingStats] = useState(true);

    // Function to fetch task statistics from database
    const fetchTaskStats = useCallback(async () => {
        try {
            const response = await fetch('/api/tasks/my/stats');
            if (response.ok) {
                const data = await response.json();
                setTaskStats(data);
            } else {
                console.error('Failed to fetch task stats');
            }
        } catch (error) {
            console.error('Error fetching task stats:', error);
        } finally {
            setLoadingStats(false);
        }
    }, []);

    // Sync tasks when server data changes (chỉ khi không có filter active)
    useEffect(() => {
        const hasActiveFilters = filters.status || filters.priority || filters.projectId;
        // Chỉ sync từ initialTasks nếu không có filter active
        // Nếu có filter, sẽ được handle bởi filter effect
        if (!hasActiveFilters) {
            setTasks(initialTasks);
            setTotalLoaded(initialTasks.length);
            // Giả định ban đầu có thể có thêm tasks nếu load được 12 tasks
            setHasMore(initialTasks.length >= 12);
        }
    }, [initialTasks, filters.status, filters.priority, filters.projectId]);
    const [projectSearch, setProjectSearch] = useState(''); // For project filter dropdown

    // Prepare project options for filter dropdown
    const projectOptions = useMemo(
        () => projects.map(p => ({ value: p._id, label: p.name })),
        [projects]
    );

    // [NEW] Danh sách dự án mà user có vai trò quản lý (owner/manager) hoặc là admin
    const manageableProjects = useMemo(() => {
        return projects.filter(project => {
            if (isAdmin) return true;
            const member = project.members?.find(m => m.userId === currentUserId);
            return member && (member.role === 'owner' || member.role === 'manager');
        });
    }, [projects, isAdmin, currentUserId]);

    // Status and Priority options for filters
    const statusOptions = [
        { value: TASK_STATUS.COMPLETED, label: 'Hoàn thành' },
        { value: TASK_STATUS.DRAFT, label: 'Nháp' },
        { value: TASK_STATUS.COMPLETED_AWAIT_REVIEW, label: 'Chờ duyệt tạo' }, // [FIX] Sửa lại mapping cho "Chờ duyệt tạo"
        { value: TASK_STATUS.WAITING_ASSIGNEE_CONFIRM, label: 'Chờ xác nhận' },
        { value: TASK_STATUS.IN_PROGRESS, label: 'Đang làm' },
        { value: TASK_STATUS.ON_HOLD, label: 'Tạm dừng' },
        { value: TASK_STATUS.PENDING_APPROVAL, label: 'Chờ duyệt HT' }, // [FIX] Đổi lại cho "Chờ duyệt HT"
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
                // [FIX] Normalize status comparison để đảm bảo so sánh đúng
                if (filters.status) {
                    const taskStatus = String(t.status || '').trim();
                    const filterStatus = String(filters.status || '').trim();
                    if (taskStatus !== filterStatus) return false;
                }
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

    // [NEW] Tính toán quyền thao tác kanban: admin, manager, owner
    // Kiểm tra xem user có quyền manager/owner trong ít nhất một project của tasks không
    const canManageKanban = useMemo(() => {
        if (isAdmin) return true;
        // Kiểm tra trong tất cả tasks (không chỉ filteredTasks)
        for (const task of tasks) {
            const projectMembersForTask = task.projectMembers || [];
            const member = projectMembersForTask.find(m => String(m.userId) === String(currentUserId));
            if (member && (member.role === 'owner' || member.role === 'manager')) {
                return true;
            }
        }
        return false;
    }, [isAdmin, tasks, currentUserId]);

    // Fetch task statistics from database on mount
    useEffect(() => {
        setLoadingStats(true);
        fetchTaskStats();
    }, [fetchTaskStats]); // Fetch once on mount

    // Refresh stats when filters change (but only if no status filter is active)
    useEffect(() => {
        // Only refresh if no status filter is active (to show accurate counts)
        if (!filters.status) {
            fetchTaskStats();
        }
    }, [filters.status, filters.priority, filters.projectId, fetchTaskStats]); // Refresh when filters change

    // Refresh stats when page becomes visible (user switches back to tab/window)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchTaskStats();
            }
        };

        const handleFocus = () => {
            fetchTaskStats();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [fetchTaskStats]);

    // Refresh stats when initialTasks change (page reloaded via router.refresh())
    // This ensures stats are updated when the page is refreshed
    useEffect(() => {
        // Small delay to ensure router.refresh() has completed
        const timer = setTimeout(() => {
            fetchTaskStats();
        }, 100);
        
        return () => clearTimeout(timer);
    }, [initialTasks.length, fetchTaskStats]); // Refresh when initialTasks length changes (indicates data refresh)

    // Use stats directly from database
    const statCardCounts = useMemo(() => {
        return {
            total: taskStats.total || 0,
            inProgress: taskStats.inProgress || 0,
            waitingConfirm: taskStats.waitingConfirm || 0,
            rejected: taskStats.rejected || 0,
            completedAwaitReview: taskStats.completedAwaitReview || 0,
            completed: taskStats.completed || 0,
            cancelled: taskStats.cancelled || 0,
        };
    }, [taskStats]);

    // Load tasks function (có thể dùng để load initial hoặc load more)
    const loadTasks = useCallback(async (skip = 0, limit = 12, isLoadMore = false) => {
        if (loadingMore && !isLoadMore) return;
        if (isLoadMore && (loadingMore || !hasMore)) return;

        setLoadingMore(true);
        try {
            // Build query params
            const params = new URLSearchParams({
                skip: skip.toString(),
                limit: limit.toString(),
            });
            if (filters.status) params.append('status', filters.status);
            if (filters.priority) params.append('priority', filters.priority);
            if (filters.projectId) params.append('projectId', filters.projectId);

            const response = await fetch(`/api/tasks/my?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to load tasks');
            }

            const data = await response.json();
            const newTasks = data.tasks || [];

            if (isLoadMore) {
                // Append to existing tasks
                setTasks(prev => [...prev, ...newTasks]);
                setTotalLoaded(prev => prev + newTasks.length);
            } else {
                // Replace tasks (initial load or filter change)
                setTasks(newTasks);
                setTotalLoaded(newTasks.length);
            }
            
            setHasMore(data.hasMore);
        } catch (error) {
            console.error('Error loading tasks:', error);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, filters]);

    // When switching to non-list views (calendar/kanban/gantt), we should load ALL tasks
    // because those views cannot rely on infinite scroll (which only exists in list view).
    const loadAllTasksForCurrentFilters = useCallback(async () => {
        // Avoid duplicate runs
        if (isLoadingAllForView) return;
        if (!hasMore) return; // already fully loaded

        setIsLoadingAllForView(true);
        try {
            const pageLimit = 200;
            let skip = tasks.length || 0;
            let aggregated = [...tasks];
            let keepGoing = true;

            while (keepGoing) {
                const params = new URLSearchParams({
                    skip: skip.toString(),
                    limit: pageLimit.toString(),
                });
                if (filters.status) params.append('status', filters.status);
                if (filters.priority) params.append('priority', filters.priority);
                if (filters.projectId) params.append('projectId', filters.projectId);

                const response = await fetch(`/api/tasks/my?${params.toString()}`);
                if (!response.ok) throw new Error('Failed to load all tasks');

                const data = await response.json();
                const newTasks = data.tasks || [];
                aggregated = aggregated.concat(newTasks);
                skip += newTasks.length;

                // Stop conditions
                if (!data.hasMore || newTasks.length === 0) {
                    keepGoing = false;
                }

                // Safety cap: prevent runaway loops if API misbehaves
                if (skip > 10000) {
                    console.warn('[loadAllTasksForCurrentFilters] aborting after 10k tasks (safety cap).');
                    keepGoing = false;
                }
            }

            setTasks(aggregated);
            setTotalLoaded(aggregated.length);
            setHasMore(false);
        } catch (error) {
            console.error('Error loading all tasks for view:', error);
        } finally {
            setIsLoadingAllForView(false);
        }
    }, [filters.projectId, filters.priority, filters.status, hasMore, isLoadingAllForView, tasks]);

    // Load more tasks function
    const loadMoreTasks = useCallback(() => {
        loadTasks(totalLoaded, 6, true);
    }, [loadTasks, totalLoaded]);

    // Reset and reload when filters change
    useEffect(() => {
        // Reset state
        setTasks([]);
        setTotalLoaded(0);
        setHasMore(true);
        setIsLoadingAllForView(false);
        
        // Load initial tasks with new filters
        const loadInitial = async () => {
            setLoadingMore(true);
            try {
                const params = new URLSearchParams({
                    skip: '0',
                    limit: '12',
                });
                if (filters.status) params.append('status', filters.status);
                if (filters.priority) params.append('priority', filters.priority);
                if (filters.projectId) params.append('projectId', filters.projectId);

                const response = await fetch(`/api/tasks/my?${params.toString()}`);
                if (response.ok) {
                    const data = await response.json();
                    setTasks(data.tasks || []);
                    setTotalLoaded(data.tasks?.length || 0);
                    setHasMore(data.hasMore);
                }
            } catch (error) {
                console.error('Error loading tasks:', error);
            } finally {
                setLoadingMore(false);
            }
        };
        
        loadInitial();
    }, [filters.status, filters.priority, filters.projectId]); // Chỉ reload khi các filter quan trọng thay đổi

    // Ensure all tasks are loaded when switching to calendar/kanban/gantt
    useEffect(() => {
        if (view === 'list') return;
        // Only start once we have some initial data loaded (or attempt anyway)
        // Admin will get all tasks; non-admin will get all tasks they have access to.
        loadAllTasksForCurrentFilters();
    }, [view, loadAllTasksForCurrentFilters]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        if (view !== 'list' || !hasMore || loadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                // Trigger khi element vào viewport (khi scroll đến nửa màn hình)
                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    loadMoreTasks();
                }
            },
            {
                root: null, // Use viewport as root
                rootMargin: '0px',
                threshold: 0.5 // Trigger khi 50% element visible
            }
        );

        const triggerElement = loadMoreTriggerRef.current;
        if (triggerElement) {
            observer.observe(triggerElement);
        }

        return () => {
            if (triggerElement) {
                observer.unobserve(triggerElement);
            }
        };
    }, [view, hasMore, loadingMore, loadMoreTasks]);


    // Callbacks for Dialogs: Dùng router.refresh() và refresh stats
    const handleTaskCreated = (newTask) => {
        router.refresh();
        // Refresh stats after creating task
        fetchTaskStats();
    };

    const handleTaskUpdated = (updatedTask) => {
        router.refresh();
        // Refresh stats after updating task (status might have changed)
        fetchTaskStats();
    };

    // Info for Create Task Dialog
    const selectedProjectInfo = useMemo(() => {
        if (!selectedProject) return null;
        return projects.find(p => String(p._id) === String(selectedProject));
    }, [selectedProject, projects]);

    const canManageSelectedProject = useMemo(() => {
        // [NEW] Admin có tất cả quyền của manager, owner
        if (isAdmin) return true;
        if (!selectedProjectInfo || !selectedProjectInfo.members) return false;
        const member = selectedProjectInfo.members.find(m => m.userId === currentUserId);
        return member && (member.role === 'owner' || member.role === 'manager');
    }, [isAdmin, selectedProjectInfo, currentUserId]);

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
            {/* [NEW] Hiển thị thông tin tài khoản và quyền */}
            <UserInfoBadge
                userName={currentUserName}
                userRole={isAdmin ? 'admin' : currentUserRole}
                userId={currentUserId}
            />
            
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
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                        // If a project is selected and it's archived, block creation
                                        if (selectedProjectInfo && selectedProjectInfo.isActive === false) {
                                            alert('Dự án đã lưu trữ — không thể tạo nhiệm vụ');
                                            return;
                                        }
                                        setShowCreateDialog(true);
                                    }}
                                    icon={Plus}
                                    className="!py-2.5 !text-xs"
                                    disabled={selectedProjectInfo && selectedProjectInfo.isActive === false}
                                    title={selectedProjectInfo && selectedProjectInfo.isActive === false ? 'Dự án đã lưu trữ — không thể tạo nhiệm vụ' : undefined}
                                >
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
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-2 mt-3">
                                <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                                    <p className="text-[10px] font-medium text-gray-500 uppercase">Tổng số (Active)</p>
                                    <p className="text-xl font-bold text-gray-800 mt-0.5">{statCardCounts.total}</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                                    <p className="text-[10px] font-medium text-blue-600 uppercase">Đang làm</p>
                                    <p className="text-xl font-bold text-blue-800 mt-0.5">{statCardCounts.inProgress}</p>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-2.5 border border-yellow-100">
                                    <p className="text-[10px] font-medium text-yellow-600 uppercase">Đã gửi Task</p>
                                    <p className="text-xl font-bold text-yellow-800 mt-0.5">{statCardCounts.waitingConfirm}</p>
                                </div>
                                <div className="bg-red-50 rounded-lg p-2.5 border border-red-100">
                                    <p className="text-[10px] font-medium text-red-600 uppercase">Từ chối</p>
                                    <p className="text-xl font-bold text-red-800 mt-0.5">{statCardCounts.rejected}</p>
                                </div>
                                <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-100">
                                    <p className="text-[10px] font-medium text-amber-600 uppercase">Chờ duyệt</p>
                                    <p className="text-xl font-bold text-amber-800 mt-0.5">{statCardCounts.completedAwaitReview}</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-2.5 border border-green-100">
                                    <p className="text-[10px] font-medium text-green-600 uppercase">Đã hoàn thành</p>
                                    <p className="text-xl font-bold text-green-800 mt-0.5">
                                        {statCardCounts.completed}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                                    <p className="text-[10px] font-medium text-slate-600 uppercase">Task hủy</p>
                                    <p className="text-xl font-bold text-slate-800 mt-0.5">{statCardCounts.cancelled}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area (Task Views) */}
            <div className="flex-1 overflow-hidden">
                <div 
                    ref={scrollContainerRef}
                    className="h-full bg-white rounded-md shadow-soft border border-gray-200 overflow-y-auto custom-scrollbar"
                >
                    <div className="p-4 sm:p-6">
                        {view === 'list' && (
                            <>
                                <TaskList
                                    initialTasks={filteredTasks}
                                    users={users}
                                    allUsersWithDetails={allUsersWithDetails}
                                    currentUserId={currentUserId}
                                    isAdmin={isAdmin} // [NEW] Truyền quyền admin
                                    onTaskUpdated={handleTaskUpdated}
                                    workTypes={workTypes}
                                    platforms={platforms}
                                />
                                
                                {/* Infinite scroll trigger - đặt ở nửa màn hình */}
                                {hasMore && (
                                    <div 
                                        ref={loadMoreTriggerRef}
                                        className="flex items-center justify-center py-4"
                                        style={{ minHeight: '50vh' }}
                                    >
                                        {loadingMore && (
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span className="text-sm">Đang tải thêm công việc...</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* End of list indicator */}
                                {!hasMore && tasks.length > 0 && (
                                    <div className="text-center py-4 text-sm text-gray-500">
                                        Đã hiển thị tất cả {tasks.length} công việc
                                    </div>
                                )}
                            </>
                        )}
                        {view === 'kanban' && (
                            <KanbanBoard 
                                tasks={filteredTasks} 
                                users={allUsersWithDetails} 
                                onTaskUpdate={handleTaskUpdated} 
                                workTypes={workTypes} 
                                platforms={platforms} 
                                currentUserId={currentUserId} 
                                isAdmin={isAdmin}
                                canManageKanban={canManageKanban}
                            />
                        )}
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
                                    {manageableProjects.length > 0 ? (
                                        manageableProjects.map(project => {
                                            // Admin có vai trò admin trong tất cả dự án và có tất cả quyền của manager, owner
                                            let roleLabel = 'Quản lý';
                                            let roleClass = 'text-blue-600 font-medium';
                                            if (isAdmin) {
                                                roleLabel = 'Admin';
                                                roleClass = 'text-purple-600 font-medium';
                                            }

                                            return (
                                                <button
                                                    key={project._id}
                                                    onClick={() => project.isActive !== false && setSelectedProject(project._id)}
                                                    disabled={project.isActive === false}
                                                    title={project.isActive === false ? 'Dự án đã lưu trữ — không thể tạo nhiệm vụ' : `Chọn dự án ${project.name}`}
                                                    className={`block w-full text-left p-3 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${project.isActive === false ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium text-gray-900">{project.name}</p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Vai trò của bạn: <span className={roleClass}>{roleLabel}</span>
                                                            </p>
                                                        </div>
                                                        {project.isActive === false && (
                                                            <span className="text-xs text-gray-500 italic">Đã lưu trữ</span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <p className="text-sm text-gray-500 text-center py-4">
                                            bạn chưa có chức năng Quản lý trong bất kỳ dự án nào
                                        </p>
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
                            projectName={selectedProjectInfo.name}
                            currentUserId={currentUserId}
                            projectMembers={selectedProjectInfo.members || []}
                            canManage={canManageSelectedProject}
                            users={users}

                            workTypes={workTypes}
                            platforms={platforms}

                            isActive={selectedProjectInfo.isActive}

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