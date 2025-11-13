'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createTask as createTaskAction } from '@/actions/task.actions';

/**
 * Hook to create task from DM-Agent bot response.
 * Converts DM-Agent task format to our app's format and calls the server action.
 *
 * @returns {{createTask: (taskData: Record<string, any>) => Promise<Record<string, any>>,
 *            isCreatingTask: boolean,
 *            createTaskError: Error|null,
 *            createdTaskId: string|null}}
 */
export default function useCreateTask() {
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [createTaskError, setCreateTaskError] = useState(null);
  const [createdTaskId, setCreatedTaskId] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const createTask = useCallback(async (taskData) => {
    if (!isMountedRef.current) return;
    
    setIsCreatingTask(true);
    setCreateTaskError(null);
    setCreatedTaskId(null);

    try {
      // Validate required fields
      if (!taskData || typeof taskData !== 'object' || !taskData.name) {
        throw new Error('Task name is required.');
      }

      if (!taskData.project_id && !taskData.project) {
        throw new Error('Project ID is required.');
      }

      // Convert DM-Agent format to our app format
      const formData = new FormData();
      formData.append('title', taskData.name);
      formData.append('projectId', taskData.project_id || taskData.project);
      formData.append('description', taskData.description || '');
      
      // Optional fields
      if (taskData.type) {
        formData.append('type', taskData.type);
      }

      // Call server action
      const result = await createTaskAction(formData);

      if (!isMountedRef.current) return;

      if (!result.success) {
        throw new Error(result.error || 'Failed to create task');
      }

      setIsCreatingTask(false);
      setCreatedTaskId(result.data?._id || result.data?.id || null);
      return result.data;
    } catch (error) {
      if (!isMountedRef.current) return;
      
      setCreateTaskError(error);
      setIsCreatingTask(false);
      throw error;
    }
  }, []);

  return {
    createTask,
    isCreatingTask,
    createTaskError,
    createdTaskId,
  };
}
