'use client';

import { useMemo } from 'react';

/**
 * Mock hook returning an authentication token for DM-Agent integration.
 * Replace with real token retrieval logic (e.g., from cookies or context) in production.
 *
 * @returns {{ token: string|null }}
 */
export function useAuthToken() {
  const token = useMemo(() => 'mock_jwt_token', []);
  return { token };
}
