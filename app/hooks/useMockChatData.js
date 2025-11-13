'use client';

import { useEffect, useState } from 'react';

/**
 * @template T
 * @typedef {{ data: T|null, isLoading: boolean, error: Error|null }} AsyncResult
 */

const MOCK_USER = {
  id: 'user-001',
  username: 'jane_doe',
  displayName: 'Jane Doe',
  email: 'jane@example.com',
};

const MOCK_TASKS = [
  {
    id: 'task-001',
    name: 'Design Homepage Layout',
    description: 'Create wireframes and high fidelity mockups for the homepage redesign.',
    assignee: 'alex_smith',
  },
  {
    id: 'task-002',
    name: 'Implement Authentication Flow',
    description: 'Develop login, signup, and password reset functionalities using FastAPI and JWT.',
    assignee: 'maria_garcia',
  },
  {
    id: 'task-003',
    name: 'Database Schema Setup',
    description: 'Design and migrate PostgreSQL schema for project and task management tables.',
    assignee: 'john_lee',
  },
];

const MOCK_PROJECTS = [
  {
    id: 'proj-101',
    name: 'Website Redesign',
    description: 'A full redesign of the corporate website focusing on accessibility and performance.',
    creator: 'jane_doe',
  },
  {
    id: 'proj-102',
    name: 'Internal Tools Upgrade',
    description: 'Refactor and improve the internal admin dashboard for better analytics and UX.',
    creator: 'alex_smith',
  },
];

const MOCK_TASK_TYPES = ['Design', 'Development', 'Testing', 'Documentation', 'Deployment'];

/**
 * Returns a random delay between min and max milliseconds.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomDelay(min = 900, max = 1800) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Simulate an asynchronous fetch for mock data.
 * @template T
 * @param {T} data
 * @returns {AsyncResult<T>}
 */
function useMockAsync(data) {
  const [state, setState] = useState(() => ({ data: null, isLoading: true, error: null }));

  useEffect(() => {
    let isActive = true;
    setState({ data: null, isLoading: true, error: null });
    const timeoutId = window.setTimeout(() => {
      if (!isActive) return;

      setState({ data, isLoading: false, error: null });
    }, randomDelay());

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [data]);

  return state;
}

/**
 * Mock hook returning current user info.
 * @returns {AsyncResult<typeof MOCK_USER>}
 */
export function useCurrentUser() {
  return useMockAsync(MOCK_USER);
}

/**
 * Mock hook returning tasks list.
 * @returns {AsyncResult<typeof MOCK_TASKS>}
 */
export function useAppTasks() {
  return useMockAsync(MOCK_TASKS);
}

/**
 * Mock hook returning projects list.
 * @returns {AsyncResult<typeof MOCK_PROJECTS>}
 */
export function useAppProjects() {
  return useMockAsync(MOCK_PROJECTS);
}

/**
 * Mock hook returning task types list.
 * @returns {AsyncResult<typeof MOCK_TASK_TYPES>}
 */
export function useAppTaskTypes() {
  return useMockAsync(MOCK_TASK_TYPES);
}
