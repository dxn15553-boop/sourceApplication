'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Helper to get the set of opened request IDs for a given user from localStorage.
 */
export function getOpenedRequests(userId: string = 'default'): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`dxn_opened_requests_${userId}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {
    console.error('Failed to read opened requests from localStorage:', e);
  }
  return new Set();
}

/**
 * Marks a request as opened in localStorage and broadcasts a custom event.
 */
export function markRequestOpened(requestId: string, userId: string = 'default'): void {
  if (typeof window === 'undefined' || !requestId) return;
  try {
    const key = `dxn_opened_requests_${userId}`;
    const opened = getOpenedRequests(userId);
    if (!opened.has(requestId)) {
      opened.add(requestId);
      localStorage.setItem(key, JSON.stringify(Array.from(opened)));
      window.dispatchEvent(new CustomEvent('dxn_request_opened', { detail: { requestId, userId } }));
    }
  } catch (e) {
    console.error('Failed to mark request as opened:', e);
  }
}

/**
 * React hook to reactively track opened and unopened requests.
 */
export function useOpenedRequests(userId: string = 'default') {
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  const reload = useCallback(() => {
    setOpenedIds(getOpenedRequests(userId));
  }, [userId]);

  useEffect(() => {
    setMounted(true);
    reload();

    const handleCustom = () => reload();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `dxn_opened_requests_${userId}`) {
        reload();
      }
    };

    window.addEventListener('dxn_request_opened', handleCustom);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('dxn_request_opened', handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }, [userId, reload]);

  const markOpened = useCallback(
    (requestId: string) => {
      markRequestOpened(requestId, userId);
    },
    [userId]
  );

  const isOpened = useCallback(
    (requestId: string) => {
      return openedIds.has(requestId);
    },
    [openedIds]
  );

  return { isOpened, markOpened, mounted, openedIds };
}
