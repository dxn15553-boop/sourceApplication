'use client';

import type { WorkflowStatus } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/workflow';

interface StatusBadgeProps {
  status: WorkflowStatus;
  animate?: boolean;
}

export default function StatusBadge({ status, animate = false }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;

  return (
    <span
      className={`status-badge ${cfg.bg} ${cfg.color} ${cfg.border} backdrop-blur-md`}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
    >
      <span
        className={`status-dot ${cfg.dot} ${animate ? 'animate-pulse-dot' : ''}`}
      />
      {cfg.label}
    </span>
  );
}
