'use client';

import Link from 'next/link';
import { FileText, ArrowRight, CheckCircle2 } from 'lucide-react';
import StatusBadge from '@/components/requests/StatusBadge';
import { useOpenedRequests } from '@/lib/useOpenedRequests';

interface PendingRequestsListProps {
  pendingRequests: any[];
  userId?: string;
}

export default function PendingRequestsList({ pendingRequests, userId = 'default' }: PendingRequestsListProps) {
  const { isOpened, markOpened, mounted } = useOpenedRequests(userId);

  if (!pendingRequests || pendingRequests.length === 0) {
    return (
      <div className="empty-state">
        <CheckCircle2 size={40} style={{ color: 'var(--success)', opacity: 0.6 }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>All caught up!</p>
        <p style={{ fontSize: 13 }}>No requests are waiting for your action.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="stagger">
      {pendingRequests.map((req: any) => {
        // A request is unopened if the client is mounted and the request has not been marked opened yet
        const isUnopened = mounted && !isOpened(req.id);

        return (
          <Link
            key={req.id}
            href={`/requests/${req.id}`}
            onClick={() => markOpened(req.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 18px',
              background: isUnopened ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-base)',
              border: isUnopened ? '1.5px solid rgba(99, 102, 241, 0.35)' : '1px solid var(--border)',
              borderLeft: isUnopened ? '4.5px solid #6366f1' : '1px solid var(--border)',
              boxShadow: isUnopened ? '0 4px 16px rgba(99, 102, 241, 0.10)' : 'none',
              borderRadius: 10,
              textDecoration: 'none',
              transition: 'all 0.18s ease',
              flexWrap: 'wrap',
              position: 'relative',
            }}
            className="animate-fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 240px', minWidth: 0 }}>
              {/* Unopened NEW badge */}
              {isUnopened && (
                <span className="badge-new" title="New request not yet opened">
                  <span className="badge-new-dot" />
                  NEW
                </span>
              )}

              {/* SRC ID */}
              <span className="src-id" style={{ flexShrink: 0 }}>
                {req.id}
              </span>

              {/* Description & metadata */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13.5,
                    fontWeight: isUnopened ? 750 : 600,
                    color: isUnopened ? '#0f172a' : 'var(--text-primary)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    letterSpacing: isUnopened ? '-0.015em' : 'normal',
                  }}
                >
                  {req.description}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    margin: '3px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  {req.priority && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 6,
                        background:
                          ['URGENT', 'Urgent'].includes(req.priority)
                            ? 'rgba(239,68,68,0.12)'
                            : ['HIGH', 'High'].includes(req.priority)
                            ? 'rgba(245,158,11,0.12)'
                            : ['NORMAL', 'Normal', 'LOW', 'Low'].includes(req.priority)
                            ? 'rgba(16,185,129,0.12)'
                            : 'rgba(59,130,246,0.12)',
                        color:
                          ['URGENT', 'Urgent'].includes(req.priority)
                            ? 'var(--danger)'
                            : ['HIGH', 'High'].includes(req.priority)
                            ? 'var(--warning)'
                            : ['NORMAL', 'Normal', 'LOW', 'Low'].includes(req.priority)
                            ? 'var(--success)'
                            : 'var(--info)',
                      }}
                    >
                      {['URGENT', 'Urgent'].includes(req.priority) && '🔴 '}
                      {['HIGH', 'High'].includes(req.priority) && '🟠 '}
                      {['IMPORTANT', 'Important', 'MEDIUM', 'Medium'].includes(req.priority) && '🔵 '}
                      {['NORMAL', 'Normal', 'LOW', 'Low'].includes(req.priority) && '🟢 '}
                      {req.priority}
                    </span>
                  )}
                  <span>{req.department?.name}</span>
                  <span>·</span>
                  <span>
                    {new Date(req.created_at).toLocaleDateString('en-GB', {
                      timeZone: 'Asia/Kolkata',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </p>
              </div>
            </div>

            {/* Right section: SRF download, Status badge, and arrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
              {req.srf_number && (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(`/requests/${req.id}/srf?download=1`, '_blank');
                  }}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#0284c7',
                    background: 'rgba(2, 132, 199, 0.12)',
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(2, 132, 199, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                  }}
                  title="Download Official SRF PDF"
                >
                  <FileText size={12} />
                  <span>{req.srf_number} PDF 📥</span>
                </span>
              )}
              <StatusBadge status={req.status as any} animate />
              <ArrowRight size={16} style={{ color: isUnopened ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
