// components/tasks/CompletedTasksSection.client.js
'use client';

import { useState } from 'react';
import TaskItem from './TaskItem.client'; // Assuming TaskItem is in the same directory
import { ChevronDown, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/button'; // Assuming Button component exists

export default function CompletedTasksSection({
    tasks = [], // Array of older completed tasks (passed from TaskList)
    users, // Simplified user list for Assignee dropdown within TaskItem
    allUsersWithDetails, // Full user details with avatar, email, etc.
    // projectMembers is not needed here, TaskItem gets it from the task object
    workTypes, // Pass down if needed by TaskItem
    platforms, // Pass down if needed by TaskItem
    currentUserId,
    canManage, // General permission context (might be less relevant for viewing completed tasks)
    isAdmin = false, // [NEW] Admin có đầy đủ quyền
    actions, // Pass down action handlers (like onEdit, onDelete if applicable to completed tasks)
    onRefresh, // Pass down refresh callback
    disableItemNavigation = false, // [THÊM] Prop để disable navigation
    parentTask = null // [THÊM] Parent task cho subtask
}) {
    const [isExpanded, setIsExpanded] = useState(false); // State to control visibility

    // If there are no older completed tasks, don't render anything
    if (tasks.length === 0) {
        return null;
    }

    return (
        <div className="mt-6 border-t border-gray-200 pt-4"> {/* Add top margin and border */}
            {/* Button to toggle the section */}
            <Button
                variant="ghost" // Use ghost for a less prominent look
                onClick={() => setIsExpanded(!isExpanded)}
                // Styling for the toggle button
                className="border border-gray-200 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-700 w-full justify-start !px-0 !py-1 mb-2 focus:outline-none"
                aria-expanded={isExpanded} // For accessibility
            >
                <div className='flex px-3 py-2 items-center gap-3'>
                    {/* Chevron icon indicating state */}
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    {/* Label showing the count */}
                    <span >Đã hoàn thành ({tasks.length})</span>
                </div>
            </Button>

            {/* Conditionally render the list of completed tasks */}
            {isExpanded && (
                // Add some indentation and a visual indicator (left border)
                <div className="space-y-2 pl-4 border-l-2 border-gray-200 ml-2 animate-fadeIn"> {/* Added animation */}
                    {tasks.map((task) => {
                        // Determine manage permission specifically for this completed task
                        // It might differ if completed tasks have different rules
                        const projectMembersForTask = task.projectMembers || [];
                        const member = projectMembersForTask.find(m => String(m.userId) === String(currentUserId));
                        // Use general 'canManage' or derive specific permission
                        const canManageTask = canManage || (member && (member.role === 'owner' || member.role === 'manager'));

                        return (
                            <TaskItem
                                key={task._id}
                                task={task} // Pass the individual completed task
                                users={users} // Pass down simplified user list
                                allUsersWithDetails={allUsersWithDetails} // Pass down full user details
                                projectMembers={projectMembersForTask} // Pass specific members if available on task
                                workTypes={workTypes} // Pass down
                                platforms={platforms} // Pass down
                                currentUserId={currentUserId}
                                canManage={canManageTask} // Pass specific permission
                                isAdmin={isAdmin} // [NEW] Truyền quyền admin
                                actions={actions} // Pass down actions
                                onRefresh={onRefresh} // Pass down refresh callback
                                // [THÊM] Props cho subtask
                                disableNavigation={disableItemNavigation}
                                isSubtask={!!parentTask}
                                parentTaskAssignee={parentTask?.assignee || null}
                            />
                        );
                    })}
                </div>
            )}
            {/* Basic CSS for fadeIn animation (add to your global CSS or styles module) */}
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}