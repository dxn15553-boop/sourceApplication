'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, FilePlus, ArrowRight, Filter, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import StatusBadge from '@/components/requests/StatusBadge';
import type { SourceRequest } from '@/lib/types';

interface RequestsListClientProps {
  userRole: string;
}

export default function RequestsListClient({ userRole }: RequestsListClientProps) {
  const [requests, setRequests] = useState<SourceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/requests?${params}`);
      const json = await res.json();
      setRequests(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const statusOptions = [
    'Submitted', 'HOD Approved', 'Final Head Approved',
    'Procurement Approved', 'Assigned', 'Completed',
    'HOD Rejected', 'Final Head Rejected', 'Procurement Rejected',
    'HOD Returned', 'Final Head Returned', 'Procurement Returned',
  ];

  const canCreateRequest = userRole === 'user' || userRole === 'admin';

  return (
    <>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 42 }}
            placeholder="Search by SRC ID (e.g. SRC-2026-0001)…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <Filter size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <select
            className="form-input form-select"
            style={{ paddingLeft: 36, minWidth: 200 }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={fetchRequests} className="btn btn-ghost btn-sm" title="Refresh">
          <RefreshCw size={15} />
        </button>
        {canCreateRequest && (
          <Link href="/requests/new" className="btn btn-primary btn-sm">
            <FilePlus size={15} /> New Request
          </Link>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="empty-state">
          <div style={{ width: 32, height: 32, border: '3px solid var(--border-strong)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading requests…</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <FilePlus />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>No requests found</p>
          <p style={{ fontSize: 13 }}>
            {search || statusFilter ? 'Try adjusting your filters.' : 'No source requests to display.'}
          </p>
          {canCreateRequest && (
            <Link href="/requests/new" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
              <FilePlus size={15} /> New Request
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="stagger">
          {requests.map((req) => (
            <Link
              key={req.id}
              href={`/requests/${req.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              className="animate-fade-in"
            >
              <span className="src-id" style={{ flexShrink: 0 }}>{req.id}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {req.description}
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {(req as any).department?.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    by {(req as any).requester_name || (req as any).requester?.full_name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(req.created_at).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <StatusBadge status={req.status} />
              <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
