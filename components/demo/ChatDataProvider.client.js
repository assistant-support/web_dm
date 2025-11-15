'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import useDmAgentSocket from '@/hooks/useDmAgentSocket';
import DmAgentChatDemo from './DmAgentChatDemo.client';
import { useAuthToken } from '@/hooks/useAuthToken';
import { useAppTasks, useAppTaskTypes } from '@/app/hooks/useMockChatData';
import { useRealProjects } from '@/hooks/useRealProjects';
import useCreateTask from '@/hooks/useCreateTask';
import { saveChatHistory, loadChatHistory } from '@/lib/chat-storage';

/**
 * ChatDataProvider is responsible for fetching app data and wiring the DM-Agent socket hook.
 * It keeps data-fetching separate from UI and passes all socket state/handlers to the dumb component.
 *
 * The provider shows a loading or error state while fetching application data.
 */
export default function ChatDataProvider({ onClose } = {}) {
  const { data: session } = useSession();
  const { token } = useAuthToken();
  const username = session?.user?.username || session?.user?.email || null;
  const mountedRef = React.useRef(false);

  const tasksHook = useAppTasks();
  const projectsHook = useRealProjects(); // ← Use real projects data
  const taskTypesHook = useAppTaskTypes();

  const {
    createTask,
    isCreatingTask,
    createTaskError,
    createdTaskId,
  } = useCreateTask();

  const isLoading = tasksHook.isLoading || projectsHook.isLoading || taskTypesHook.isLoading;
  const fetchError = tasksHook.error || projectsHook.error || taskTypesHook.error || null;

  const tasksData = tasksHook.data;
  const projectsData = projectsHook.data;
  const taskTypesData = taskTypesHook.data;

  const processedApprovalsRef = React.useRef(new Set());
  const [userMessages, setUserMessages] = React.useState([]);
  const [isWaitingResponse, setIsWaitingResponse] = React.useState(false);
  const [taskCreatedSuccess, setTaskCreatedSuccess] = React.useState(false);
  const [needsProjectSelection, setNeedsProjectSelection] = React.useState(false);
  const [pendingTaskData, setPendingTaskData] = React.useState(null);
  const [chatHistoryLoaded, setChatHistoryLoaded] = React.useState(false);
  const [initialBotMessages, setInitialBotMessages] = React.useState([]);
  const saveTimeoutRef = React.useRef(null);

  // Prepare available projects list with full info for display
  const availableProjects = React.useMemo(() => {
    return Array.isArray(projectsData) ? projectsData.map(p => ({
      id: p._id || p.id,
      _id: p._id || p.id, // Keep both for compatibility
      name: p.name || 'Dự án không có tên',
      description: p.description,
      isActive: p.isActive !== false, // Default to true if not specified
      members: p.members || [],
      creator: p.creator,
      team: p.team,
    })) : [];
  }, [projectsData]);

  // Load chat history FIRST (synchronous, before any async operations)
  React.useEffect(() => {
    if (!username || chatHistoryLoaded) return;
    
    const history = loadChatHistory(username);
    if (history && history.userMessages && history.botMessages) {
      setUserMessages(history.userMessages);
      setInitialBotMessages(history.botMessages);
      setChatHistoryLoaded(true);
      console.log('✓ Loaded chat history:', history.userMessages.length, 'user messages,', history.botMessages.length, 'bot messages');
    } else {
      setChatHistoryLoaded(true);
    }
  }, [username, chatHistoryLoaded]);

  // Compose contextPayload only when all data is ready; otherwise null.
  const contextPayload = React.useMemo(() => {
    if (isLoading || fetchError) return null;

    const username = session?.user?.username || session?.user?.email || 'unknown_user';
    const authToken = token || null;

    const tasksArray = Array.isArray(tasksData) ? tasksData : [];
    const projectsArray = Array.isArray(projectsData) ? projectsData : [];
    const taskTypesArray = Array.isArray(taskTypesData) ? taskTypesData : [];

    const tasks_data = tasksArray.map((t) => ({
      id: t._id || t.id || '',
      name: t.name || '',
      description: t.description || '',
      assignee: (t.assignee && (t.assignee.username || t.assignee.displayName)) || (typeof t.assignee === 'string' ? t.assignee : 'Unknown'),
    }));

    const projects_data = projectsArray.map((p) => ({
      id: p._id || p.id || '',
      name: p.name || '',
      description: p.description || '',
      creator: (p.creator && (p.creator.username || p.creator.displayName)) || (typeof p.creator === 'string' ? p.creator : 'Unknown'),
    }));

    const task_types = taskTypesArray.length ? taskTypesArray : [];

    return {
      username,
      tasks_data,
      projects_data,
      task_types,
    };
  }, [isLoading, fetchError, session, tasksData, projectsData, taskTypesData, token]);

  // Call the socket hook with the contextPayload (may be null). Hook will only connect when payload is non-null.
  // initialBotMessages will be [] on first render, then populated by useEffect above
  const socket = useDmAgentSocket(contextPayload, {
    initialMessages: initialBotMessages,
  });

  // Auto-save chat history (debounced) - runs silently in background
  React.useEffect(() => {
    if (!username || !chatHistoryLoaded) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce save by 2 seconds
    saveTimeoutRef.current = setTimeout(() => {
      const chatData = {
        userMessages,
        botMessages: socket.messages,
        timestamp: Date.now(),
      };
      
      saveChatHistory(username, chatData);
      // Silent save - no loading indicator
    }, 2000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [username, userMessages, socket.messages, chatHistoryLoaded]);

  // Track when bot responds to hide waiting indicator
  React.useEffect(() => {
    if (socket.messages.length > 0) {
      setIsWaitingResponse(false);
    }
  }, [socket.messages.length]);

  const [botLanguageWarning, setBotLanguageWarning] = React.useState(false);

  // Enhanced sendMessage wrapper to track user messages
  const handleSendMessage = React.useCallback((text) => {
    setUserMessages(prev => [...prev, { text, timestamp: Date.now() }]);
    setIsWaitingResponse(true);
    setTaskCreatedSuccess(false);
    setBotLanguageWarning(false);
    socket.sendMessage(text);
  }, [socket]);

  // Handle clear history
  const handleClearHistory = React.useCallback(() => {
    if (!username) return;
    
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat? Hành động này không thể hoàn tác.')) {
      // Clear state
      setUserMessages([]);
      
      // Clear localStorage
      import('@/lib/chat-storage').then(({ clearChatHistory }) => {
        clearChatHistory(username);
        console.log('🗑️ Cleared chat history');
      });
      
      // Note: socket.messages is managed by the hook, we can't clear it directly
      // But new sessions will start fresh
    }
  }, [username]);

  // Detect if bot responds in English
  React.useEffect(() => {
    const latestMessage = socket.latestMessage;
    if (!latestMessage) return;

    const message = latestMessage.message.toLowerCase();
    const englishKeywords = ['okay', 'please', 'would you like', 'task', 'submit', 'generated', 'create'];
    const vietnameseKeywords = ['được', 'vâng', 'công việc', 'tạo', 'gửi', 'bạn có muốn'];
    
    const hasEnglish = englishKeywords.some(word => message.includes(word));
    const hasVietnamese = vietnameseKeywords.some(word => message.includes(word));
    
    // If has English keywords but no Vietnamese, show warning
    if (hasEnglish && !hasVietnamese && message.length > 10) {
      setBotLanguageWarning(true);
    }
  }, [socket.latestMessage]);

  // Check if task needs project selection
  React.useEffect(() => {
    const latestMessage = socket.latestMessage;
    if (!latestMessage || !latestMessage.task || latestMessage.approved !== false) {
      setNeedsProjectSelection(false);
      return;
    }

    // Check if project is missing or null (check both fields)
    const projectId = latestMessage.task.project_id || latestMessage.task.project;
    if (!projectId || projectId === 'null' || projectId === null) {
      setNeedsProjectSelection(true);
      setPendingTaskData(latestMessage.task);
    } else {
      setNeedsProjectSelection(false);
    }
  }, [socket.latestMessage]);

  // Handle project selection
  const handleSelectProject = React.useCallback((projectId) => {
    if (!pendingTaskData) return;

    const updatedTask = {
      ...pendingTaskData,
      project: projectId,
      project_id: projectId, // Set both fields for compatibility
    };

    setNeedsProjectSelection(false);
    
    // Create task with selected project
    createTask(updatedTask)
      .then(() => {
        setTaskCreatedSuccess(true);
        setTimeout(() => setTaskCreatedSuccess(false), 5000);
      })
      .catch(() => {
        // Error handled by createTaskError
      });
  }, [pendingTaskData, createTask]);

  // Auto-create task when approved
  React.useEffect(() => {
    const latestMessage = socket.latestMessage;
    if (!latestMessage || latestMessage.approved !== true || !latestMessage.task) {
      return;
    }

    const messageId = latestMessage.receivedAt;
    if (processedApprovalsRef.current.has(messageId)) {
      return;
    }

    processedApprovalsRef.current.add(messageId);

    // Check if project is required (check both fields)
    const projectId = latestMessage.task.project_id || latestMessage.task.project;
    if (!projectId || projectId === 'null' || projectId === null) {
      setNeedsProjectSelection(true);
      setPendingTaskData(latestMessage.task);
      return;
    }

    createTask(latestMessage.task)
      .then(() => {
        setTaskCreatedSuccess(true);
        setTimeout(() => setTaskCreatedSuccess(false), 5000);
      })
      .catch(() => {
        // Error state handled by useCreateTask hook
      });
  }, [socket.latestMessage, createTask]);

  // Mark component as mounted and clean old histories
  React.useEffect(() => {
    mountedRef.current = true;
    
    // Clean histories older than 30 days on mount (runs in background)
    import('@/lib/chat-storage').then(({ clearOldChatHistories }) => {
      clearOldChatHistories(30);
    });
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Save on unmount (when dialog closes)
  React.useEffect(() => {
    return () => {
      if (username && chatHistoryLoaded && mountedRef.current) {
        // Force save immediately when unmounting
        const chatData = {
          userMessages,
          botMessages: socket.messages,
          timestamp: Date.now(),
        };
        saveChatHistory(username, chatData);
        console.log('💾 Saved chat history on close');
      }
    };
  }, [username, userMessages, socket.messages, chatHistoryLoaded]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">Đang tải dữ liệu chat...</div>
    );
  }

  if (fetchError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">Lỗi khi tải dữ liệu: {String(fetchError)}</div>
    );
  }

  return (
    <DmAgentChatDemo
      connectionStatus={socket.connectionStatus}
      error={socket.error}
      messages={socket.messages}
      userMessages={userMessages}
      latestMessage={socket.latestMessage}
      sendMessage={handleSendMessage}
      isWaitingResponse={isWaitingResponse}
      isCreatingTask={isCreatingTask}
      taskCreatedSuccess={taskCreatedSuccess}
      createTaskError={createTaskError}
      createdTaskId={createdTaskId}
      reconnect={socket.reconnect}
      availableProjects={availableProjects}
      onSelectProject={handleSelectProject}
      needsProjectSelection={needsProjectSelection}
      botLanguageWarning={botLanguageWarning}
      onClearHistory={handleClearHistory}
    />
  );
}
