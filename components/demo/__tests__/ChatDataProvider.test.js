import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ChatDataProvider from '../ChatDataProvider.client';

const mockUseDmAgentSocket = jest.fn();
const mockDmAgentChatDemo = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/hooks/useAuthToken', () => ({
  useAuthToken: jest.fn(),
}));

jest.mock('@/hooks/data/useAppQuery', () => ({
  useAppQuery: jest.fn(),
}));

jest.mock('@/hooks/api/taskMutations', () => ({
  useCreateTaskMutation: jest.fn(),
}));

jest.mock('@/hooks/useDmAgentSocket', () => ({
  __esModule: true,
  default: jest.fn((payload) => mockUseDmAgentSocket(payload)),
}));

jest.mock('../DmAgentChatDemo.client', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props) => {
      mockDmAgentChatDemo(props);
      return <div data-testid="dm-agent-chat-demo">Mock Chat Demo</div>;
    },
  };
});

const { useSession } = require('next-auth/react');
const { useAuthToken } = require('@/hooks/useAuthToken');
const { useAppQuery } = require('@/hooks/data/useAppQuery');
const { useCreateTaskMutation } = require('@/hooks/api/taskMutations');

describe('ChatDataProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();

  useSession.mockReturnValue({ data: { user: { username: 'jane_doe' } }, status: 'authenticated' });
    useAuthToken.mockReturnValue({ token: 'mock_jwt_token' });
    useCreateTaskMutation.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
      error: null,
    });

    mockUseDmAgentSocket.mockReturnValue({
      connectionStatus: 'ready',
      error: null,
      messages: [],
      latestMessage: null,
      sendMessage: jest.fn(),
      reconnect: jest.fn(),
      close: jest.fn(),
    });
  });

  test('renders loading state while data is fetching', () => {
    useAppQuery.mockImplementation((key) => {
      if (key === 'tasks') {
        return { data: null, isLoading: true, error: null };
      }
      return { data: null, isLoading: false, error: null };
    });

    render(<ChatDataProvider />);

    expect(screen.getByText('Đang tải dữ liệu chat...')).toBeInTheDocument();
    expect(mockDmAgentChatDemo).not.toHaveBeenCalled();
  });

  test('renders error state when fetching fails', () => {
    const error = new Error('Failed to load');
    useAppQuery.mockImplementation(() => ({ data: null, isLoading: false, error }));

    render(<ChatDataProvider />);

    expect(screen.getByText(/Lỗi khi tải dữ liệu/i)).toBeInTheDocument();
    expect(screen.getByText(String(error))).toBeInTheDocument();
    expect(mockDmAgentChatDemo).not.toHaveBeenCalled();
  });

  test('renders chat demo with transformed context payload', () => {
    useAppQuery.mockImplementation((key) => {
      switch (key) {
        case 'tasks':
          return {
            data: [
              {
                _id: 'task-001',
                name: 'Design Homepage Layout',
                description: 'Create design mockups.',
                assignee: { username: 'alex_smith', displayName: 'Alex Smith' },
              },
            ],
            isLoading: false,
            error: null,
          };
        case 'projects':
          return {
            data: [
              {
                _id: 'proj-101',
                name: 'Website Redesign',
                description: 'Full redesign initiative.',
                creator: { username: 'jane_doe', displayName: 'Jane Doe' },
              },
            ],
            isLoading: false,
            error: null,
          };
        case 'task_types':
          return {
            data: ['Design', 'Development'],
            isLoading: false,
            error: null,
          };
        default:
          return { data: null, isLoading: false, error: null };
      }
    });

    render(<ChatDataProvider />);

    expect(screen.getByTestId('dm-agent-chat-demo')).toBeInTheDocument();
    expect(mockDmAgentChatDemo).toHaveBeenCalled();

    expect(mockUseDmAgentSocket).toHaveBeenCalledWith({
      username: 'jane_doe',
      authToken: 'mock_jwt_token',
      tasks_data: [
        {
          id: 'task-001',
          name: 'Design Homepage Layout',
          description: 'Create design mockups.',
          assignee: 'alex_smith',
        },
      ],
      projects_data: [
        {
          id: 'proj-101',
          name: 'Website Redesign',
          description: 'Full redesign initiative.',
          creator: 'jane_doe',
        },
      ],
      task_types: ['Design', 'Development'],
    });
  });

  test('calls createTask once when agent approval arrives', async () => {
  const mutateMock = jest.fn();
    useCreateTaskMutation.mockReturnValue({
      mutate: mutateMock,
      isLoading: false,
      error: null,
    });

    useAppQuery.mockImplementation(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    const approvedTask = { name: 'Homework Tasks', description: 'Complete homework.' };
    mockUseDmAgentSocket.mockReturnValue({
      connectionStatus: 'context_sent',
      error: null,
      messages: [],
      latestMessage: {
        approved: true,
        task: approvedTask,
        receivedAt: 1731436800000,
      },
      sendMessage: jest.fn(),
      reconnect: jest.fn(),
      close: jest.fn(),
    });

    render(<ChatDataProvider />);

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock).toHaveBeenCalledWith(approvedTask);
  });
});
