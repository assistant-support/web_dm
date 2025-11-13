'use client';

import React from 'react';
import { Send, CheckCircle, Edit3, Loader2 } from 'lucide-react';
import TaskPreviewCard from './TaskPreviewCard.client';

/**
 * Dumb UI component for DM-Agent chat.
 * Receives all state and handlers from parent via props.
 *
 * @param {Object} props
 * @param {'connecting'|'ready'|'context_sent'|'error'|'closed'} props.connectionStatus
 * @param {string|null} props.error
 * @param {Array} props.messages - Bot messages from server
 * @param {Array} props.userMessages - User sent messages
 * @param {Object|null} props.latestMessage
 * @param {(text:string)=>void} props.sendMessage
 * @param {boolean} [props.isWaitingResponse] - Waiting for bot response
 * @param {boolean} [props.isCreatingTask]
 * @param {boolean} [props.taskCreatedSuccess]
 * @param {Error|null} [props.createTaskError]
 * @param {() => void} [props.reconnect]
 * @param {Array} [props.availableProjects]
 * @param {(projectId:string)=>void} [props.onSelectProject]
 * @param {boolean} [props.needsProjectSelection]
 */
export default function DmAgentChatDemo({
  connectionStatus,
  error,
  messages,
  userMessages = [],
  latestMessage,
  sendMessage,
  isWaitingResponse = false,
  isCreatingTask = false,
  taskCreatedSuccess = false,
  createTaskError = null,
  createdTaskId = null,
  reconnect,
  availableProjects = [],
  onSelectProject,
  needsProjectSelection = false,
  botLanguageWarning = false,
  onClearHistory,
}) {
  // Format project display for selection
  const formatProjectForDisplay = (project) => {
    const memberCount = project.members?.length || 0;
    const statusBadge = project.isActive !== false ? '🟢' : '⏸️';
    return {
      id: project.id,
      name: project.name,
      subtitle: `${statusBadge} ${memberCount} thành viên`,
    };
  };
  const [inputValue, setInputValue] = React.useState('');
  const [showQuickCommands, setShowQuickCommands] = React.useState(true);
  const messagesEndRef = React.useRef(null);

  const quickCommands = [
    { label: 'Tạo 1 công việc', text: 'Tôi muốn tạo một công việc mới' },
    { label: 'Tạo 1 dự án', text: 'Tôi muốn tạo một dự án mới' },
    { label: 'Xem danh sách dự án', text: 'Hiển thị danh sách dự án của tôi' },
    { label: 'Chỉnh sửa công việc', text: 'Tôi muốn chỉnh sửa công việc' },
    { label: 'Chỉnh sửa dự án', text: 'Tôi muốn chỉnh sửa dự án' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, userMessages, isWaitingResponse, isCreatingTask]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  const shouldShowTaskPreview = React.useMemo(() => {
    if (!latestMessage || !latestMessage.task) return false;
    if (latestMessage.approved !== false) return false;
    if (isCreatingTask) return false;
    return true;
  }, [latestMessage, isCreatingTask]);

  const isConnected = connectionStatus === 'context_sent';
  const isConnecting = connectionStatus === 'connecting' || connectionStatus === 'ready';

  const getStatusDisplay = () => {
    if (connectionStatus === 'error') return { text: 'Lỗi kết nối', color: 'text-red-600' };
    if (connectionStatus === 'closed') return { text: 'Đã ngắt kết nối', color: 'text-gray-500' };
    if (isConnecting) return { text: 'Đang kết nối...', color: 'text-blue-600' };
    if (isConnected) return { text: 'Đã kết nối', color: 'text-emerald-600' };
    return { text: 'Chưa kết nối', color: 'text-gray-500' };
  };

  const statusDisplay = getStatusDisplay();

  const handleConfirmTask = () => {
    if (!latestMessage?.task) return;
    
    // Check if project is required but missing
    const projectId = latestMessage.task.project_id || latestMessage.task.project;
    if (!projectId || projectId === 'null') {
      // Don't send confirmation, let needsProjectSelection UI show
      return;
    }
    
    sendMessage('Vâng, hãy tạo công việc này');
  };

  const handleEditTask = () => {
    setInputValue('Vui lòng điều chỉnh công việc: ');
  };

  const handleSelectProject = (projectId) => {
    if (onSelectProject) {
      onSelectProject(projectId);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      {/* Header - Compact status bar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : isConnecting ? 'animate-pulse bg-blue-500' : 'bg-gray-400'}`} />
            <span className={`text-sm font-medium ${statusDisplay.color}`}>
              {statusDisplay.text}
            </span>
          </div>
          {messages.length > 0 && (
            <span className="text-xs text-gray-500">
              {messages.length} tin nhắn
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && onClearHistory && (
            <button
              type="button"
              className="rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
              onClick={onClearHistory}
              title="Xóa lịch sử chat"
            >
              🗑️ Xóa lịch sử
            </button>
          )}
          {connectionStatus === 'error' && reconnect && (
            <button
              type="button"
              className="rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
              onClick={reconnect}
            >
              Thử lại
            </button>
          )}
        </div>
      </div>

      {/* Chat messages area - Only this section scrolls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 flex-1 ">
        {/* Language warning banner */}
        {botLanguageWarning && (
          <div className="rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-amber-600">⚠️</span>
              <div className="flex-1">
                <p className="font-medium text-amber-900">Bot AI đang trả lời bằng tiếng Anh</p>
                <p className="mt-1 text-xs text-amber-700">
                  Hệ thống đã yêu cầu bot trả lời bằng tiếng Việt, nhưng bot vẫn phản hồi bằng tiếng Anh. 
                  Bạn có thể thử gửi tin nhắn: &ldquo;Vui lòng trả lời bằng tiếng Việt&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 && userMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Bắt đầu cuộc trò chuyện với DM-Agent...
          </div>
        ) : (
          <>
            {/* Render conversation history - interleave user and bot messages */}
            {messages.map((msg, idx) => {
              const userMsg = userMessages[idx];
              return (
                <div key={msg.receivedAt} className="space-y-3">
                  {/* User message */}
                  {userMsg && (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow-sm">
                        <p>{userMsg.text}</p>
                        <span className="mt-1 block text-xs text-blue-100 opacity-75">
                          {new Date(userMsg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bot response */}
                  <div className="flex justify-start">
                    <div className="max-w-[85%] space-y-2">
                      <div className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-900 shadow-sm">
                        {msg.message}
                      </div>

                      {/* Debug: Show raw message data */}
                      {process.env.NODE_ENV === 'development' && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-500">Debug: Raw message data</summary>
                          <pre className="mt-2 rounded bg-gray-800 p-2 text-white overflow-auto max-h-40">
                            {JSON.stringify(msg, null, 2)}
                          </pre>
                        </details>
                      )}

                      {/* Task preview with action buttons */}
                      {msg.task && msg.approved === false && (
                        <div className="space-y-2">
                          <TaskPreviewCard task={msg.task} availableProjects={availableProjects} />
                          
                          {/* Only show interactive elements for the latest message */}
                          {idx === messages.length - 1 && (
                            <>
                              {/* Project selection if needed */}
                              {needsProjectSelection && (
                            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
                              <div className="mb-3 flex items-center gap-2">
                                <span className="text-lg">📁</span>
                                <div>
                                  <p className="text-sm font-semibold text-amber-900">
                                    Vui lòng chọn dự án cho công việc này
                                  </p>
                                  <p className="text-xs text-amber-700 mt-1">
                                    Công việc cần được gán vào một dự án để có thể tạo
                                  </p>
                                </div>
                              </div>
                              {availableProjects.length === 0 ? (
                                <div className="rounded-lg bg-amber-100 p-4 text-center">
                                  <p className="text-sm text-amber-800">
                                    Bạn chưa có dự án nào. Vui lòng tạo dự án trước.
                                  </p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                                  {availableProjects.map((project) => {
                                    const display = formatProjectForDisplay(project);
                                    return (
                                      <button
                                        key={project.id}
                                        type="button"
                                        onClick={() => handleSelectProject(project.id)}
                                        className="group flex items-center gap-3 rounded-lg border-2 border-amber-200 bg-white px-4 py-3 text-left transition-all hover:border-amber-400 hover:bg-amber-50 hover:shadow-sm"
                                      >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-lg group-hover:bg-amber-200">
                                          📂
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-gray-900 truncate">{display.name}</div>
                                          <div className="mt-0.5 text-xs text-gray-600">{display.subtitle}</div>
                                        </div>
                                        <div className="text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                          →
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                              )}

                              {/* Action buttons */}
                              {!isCreatingTask && !needsProjectSelection && (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={handleConfirmTask}
                                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition-colors"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    Xác nhận tạo
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleEditTask}
                                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                    Chỉnh sửa
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Success indicator */}
                      {msg.approved === true && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Đã tạo thành công</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Show user's latest message while waiting for bot response */}
            {userMessages.length > messages.length && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow-sm">
                  <p>{userMessages[userMessages.length - 1].text}</p>
                  <span className="mt-1 block text-xs text-blue-100 opacity-75">
                    {new Date(userMessages[userMessages.length - 1].timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )}

            {/* Waiting for bot response indicator */}
            {isWaitingResponse && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang chờ phản hồi...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Creating task indicator */}
            {isCreatingTask && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Đang tạo công việc...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Task creation success */}
            {taskCreatedSuccess && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    <div>
                      <span className="font-medium">✓ Công việc đã được tạo thành công!</span>
                      {createdTaskId && (
                        <div className="mt-2">
                          <a 
                            href={`/tasks/${createdTaskId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                          >
                            Xem công việc →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error indicator */}
            {createTaskError && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                  <p className="font-medium">Lỗi khi tạo công việc:</p>
                  <p className="mt-1">{createTaskError.message}</p>
                </div>
              </div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area - Fixed at bottom like footer */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
        {/* Quick Commands */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowQuickCommands(!showQuickCommands)}
            className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>{showQuickCommands ? '▼' : '▶'}</span>
            <span>Câu lệnh phổ biến</span>
          </button>
          
          {showQuickCommands && (
            <div className="mt-2 flex flex-wrap gap-2">
              {quickCommands.map((cmd) => (
                <button
                  key={cmd.label}
                  type="button"
                  onClick={() => setInputValue(cmd.text)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  {cmd.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <form className="flex gap-2" onSubmit={handleSubmit}>
          <input
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder={isConnected ? "Nhập tin nhắn..." : "Đang kết nối..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={!isConnected}
          />
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            disabled={!isConnected || !inputValue.trim()}
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Gửi</span>
          </button>
        </form>
      </div>
    </div>
  );
}
