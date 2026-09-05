'use client';

import type { AuditEntry } from '@/lib/types';
import { getActionLabel, ROLE_LABELS } from '@/lib/workflow';
import { CheckCircle2, XCircle, RotateCcw, Send, UserCheck, PlayCircle, Flag, Clock, Ban } from 'lucide-react';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  submitted:          <Send size={16} />,
  approved:           <CheckCircle2 size={16} />,
  rejected:           <XCircle size={16} />,
  returned:           <RotateCcw size={16} />,
  resubmitted:        <Send size={16} />,
  assigned:           <UserCheck size={16} />,
  processing_started: <PlayCircle size={16} />,
  completed:          <Flag size={16} />,
  cancelled:          <Ban size={16} />,
};

const ACTION_COLORS: Record<string, string> = {
  submitted:          '#3b82f6',
  approved:           '#10b981',
  rejected:           '#ef4444',
  returned:           '#f59e0b',
  resubmitted:        '#3b82f6',
  assigned:           '#8b5cf6',
  processing_started: '#06b6d4',
  completed:          '#10b981',
  cancelled:          '#ef4444',
};

interface WorkflowTimelineProps {
  entries: AuditEntry[];
}

export default function WorkflowTimeline({ entries }: WorkflowTimelineProps) {
  if (!entries.length) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        No workflow history yet.
      </div>
    );
  }

  return (
    <div className="timeline">
      {entries.map((entry, idx) => {
        const color = ACTION_COLORS[entry.action] ?? '#94a3b8';
        const icon = ACTION_ICONS[entry.action] ?? <Clock size={16} />;
        const isLast = idx === entries.length - 1;
        const date = new Date(entry.created_at);

        return (
          <div key={entry.id} className="timeline-item animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
            {/* Connector line */}
            {!isLast && <div className="timeline-line" />}

            {/* Icon */}
            <div
              className="timeline-icon"
              style={{ background: `${color}18`, borderColor: `${color}40`, color }}
            >
              {icon}
            </div>

            {/* Content */}
            <div className="timeline-content">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {entry.action === 'assigned' && entry.comment?.startsWith('Assigned to ')
                      ? entry.comment
                      : getActionLabel(entry.action)}
                  </p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color }}>
                      {(entry as any).actor?.full_name ?? 'System'}
                    </span>
                    {(entry as any).actor?.role && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        · {ROLE_LABELS[(entry as any).actor.role as import('@/lib/types').Role] ?? (entry as any).actor.role}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    {date.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    {date.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {entry.comment && !(entry.action === 'assigned' && entry.comment.startsWith('Assigned to ')) && (
                <div style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  background: 'var(--bg-base)',
                  border: `1px solid ${color}30`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: '0 8px 8px 0',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}>
                  &ldquo;{entry.comment}&rdquo;
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
