/**
 * Hook to fetch real projects data using Server Action
 */

'use client';

import { useState, useEffect } from 'react';
import { listMyProjects } from '@/data/project/actions/list.js';

export function useRealProjects() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchProjects() {
      try {
        setIsLoading(true);
        const result = await listMyProjects();

        if (!mounted) return;

        if (!result.ok) {
          setError(new Error(result.message || 'Failed to load projects'));
          setData([]);
        } else {
          setData(result.data.projects || []);
          setError(null);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err);
        setData([]);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchProjects();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    data,
    isLoading,
    error,
  };
}
