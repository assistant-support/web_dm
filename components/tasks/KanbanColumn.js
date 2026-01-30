// components/tasks/KanbanColumn.js
'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * KanbanColumn - Droppable column for Kanban board
 */
export default function KanbanColumn({ 
    column, 
    tasks,
    allTasksCount = 0, // [NEW] Tổng số task trong cột
    visibleCount = 5, // [NEW] Số lượng task đang hiển thị
    projectId,
    canManage = false,
    currentUserId = '',
    users = [],
    projectMembers = [],
    isAdmin = false, // [NEW] Admin có đầy đủ quyền
    isOver: isOverProp = false, // [NEW] Highlight khi drag over (từ parent)
    canDrag = false, // [NEW] Quyền thao tác kanban
    hasMore = false, // [NEW] Còn task để load thêm
    onLoadMore = null, // [NEW] Hàm load thêm task
    onCollapse = null // [NEW] Hàm thu gọn về 5 task
}) {
    // [FIX] Làm toàn bộ column (bao gồm header) có thể nhận drop
    const { setNodeRef, isOver: isOverLocal } = useDroppable({
        id: column.id,
        data: {
            type: 'column',
            column,
        },
    });

    const taskIds = tasks.map(t => t._id);

    const getColumnColor = (id, isHighlighted = false) => {
        const baseColors = {
            'todo': { bg: 'bg-gray-50', border: 'border-gray-300' },
            'in_progress': { bg: 'bg-blue-50', border: 'border-blue-300' },
            'review': { bg: 'bg-yellow-50', border: 'border-yellow-300' },
            'completed': { bg: 'bg-green-50', border: 'border-green-300' },
        };
        
        const colors = baseColors[id] || { bg: 'bg-gray-50', border: 'border-gray-300' };
        
        // [NEW] Highlight khi drag over
        if (isHighlighted) {
            return `${colors.bg} ${colors.border} border-2 ring-2 ring-blue-400 ring-opacity-50 shadow-lg`;
        }
        
        return `${colors.bg} ${colors.border}`;
    };

    // [FIX] Sử dụng isOver từ useDroppable (local) hoặc prop isOver từ parent
    const isHighlighted = isOverLocal || isOverProp;
    
    return (
        <div 
            ref={setNodeRef}
            className="flex flex-col flex-shrink-0 w-80 transition-all duration-200"
        >
            {/* Column header - cũng là phần của droppable */}
            <div className={`p-3 rounded-t-lg border-t border-l border-r transition-all duration-200 ${getColumnColor(column.id, isHighlighted)}`}>
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-gray-900">
                        {column.title}
                    </h3>
                    <span className="text-xs font-medium text-gray-600 bg-white px-2 py-0.5 rounded">
                        {allTasksCount || tasks.length}
                    </span>
                </div>
            </div>

            {/* Droppable area */}
            <div
                className={`flex-1 p-3 border-l border-r border-b rounded-b-lg min-h-[200px] transition-all duration-200 ${getColumnColor(column.id, isHighlighted)}`}
            >
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    {tasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            Kéo thả task vào đây
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {tasks.map((task) => (
                                    <KanbanCard 
                                        key={task._id} 
                                        task={task}
                                        projectId={projectId}
                                        canManage={canManage}
                                        currentUserId={currentUserId}
                                        users={users}
                                        projectMembers={projectMembers}
                                        isAdmin={isAdmin} // [NEW] Truyền quyền admin
                                        canDrag={canDrag} // [NEW] Truyền quyền drag
                                    />
                                ))}
                            </div>
                            
                            {/* [NEW] Buttons load thêm và thu gọn */}
                            {(hasMore || visibleCount > 5) && (
                                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                    {/* Button thu gọn - hiển thị khi đã load nhiều hơn 5 task */}
                                    {visibleCount > 5 && onCollapse && (
                                        <button
                                            onClick={onCollapse}
                                            className="w-full flex items-center justify-center gap-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 py-2 px-3 rounded-md transition-colors"
                                            title="Thu gọn về 5 công việc đầu tiên"
                                        >
                                            <ChevronUp className="w-4 h-4" />
                                            <span>Thu gọn</span>
                                        </button>
                                    )}
                                    
                                    {/* Button xem thêm - hiển thị khi còn task để load */}
                                    {hasMore && onLoadMore && (
                                        <button
                                            onClick={onLoadMore}
                                            className="w-full flex items-center justify-center gap-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 py-2 px-3 rounded-md transition-colors"
                                            title="Xem thêm 5 công việc"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                            <span>Xem thêm</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </SortableContext>
            </div>
        </div>
    );
}
