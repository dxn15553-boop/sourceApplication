'use client';

import { useEffect } from 'react';
import { markRequestOpened } from '@/lib/useOpenedRequests';

interface MarkAsOpenedProps {
  requestId: string;
  userId?: string;
}

export default function MarkAsOpened({ requestId, userId = 'default' }: MarkAsOpenedProps) {
  useEffect(() => {
    if (requestId) {
      markRequestOpened(requestId, userId);
    }
  }, [requestId, userId]);

  return null;
}
