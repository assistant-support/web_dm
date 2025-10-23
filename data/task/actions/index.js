// data/task/actions/index.js
// Export tất cả task actions để dễ import

// Basic CRUD
export {
    listByProject,
    listMyTasks,
    getTaskDetail,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    assignTask,
    updateKanbanOrder,
} from './server.js';

// Subtasks
export {
    listSubtasks,
    getSubtaskStatsAction,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    getTaskWithSubtasks,
    reorderSubtasks,
} from './subtasks.server.js';

// Approval workflow
export {
    approveTaskCreation,
    confirmAssignment,
    approveTaskCompletion,
} from './approval.server.js';

// Collaborators
export {
    inviteCollaborator,
    acceptCollaboratorInvite,
    removeCollaboratorFromTask,
    listTaskCollaborators,
} from './collaborators.server.js';

// Subtask approval & points
export {
    approveSubtaskCompletion,
    distributePointsToSubtasks,
    getTaskProgress,
} from './subtask-approval.server.js';

// Project tasks (public board)
export {
    createDraft,
    publish,
    unpublish,
    claim,
    decide,
    approveCompletionWithSplitAction,
    listOpen,
} from './project.server.js';
