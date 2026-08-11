'use client';

import { useState } from 'react';
import StatusBadge from '@/components/requests/StatusBadge';
import WorkflowTimeline from '@/components/requests/WorkflowTimeline';
import { Search, ArrowRight, FileSearch } from 'lucide-react';
import Link from 'next/link';

export default function SearchClient() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    try {
      const res = await fetch(`/api/requests/${encodeURIComponent(query.trim().toUpperCase())}`);
      if (res.status === 404) { setNotFound(true); return; }
      const json = await res.json();
      if (!res.ok) { setNotFound(true); return; }
      setResult(json.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 44, fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, letterSpacing: '0.04em' }}
              placeholder="SRC-2026-0001"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
            {loading ? 'Searching…' : <><Search size={15} /> Search</>}
          </button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
          Enter the Source Request ID (e.g. <code style={{ background: 'var(--bg-base)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>SRC-2026-0001</code>)
        </p>
      </div>

      {notFound && (
        <div className="empty-state animate-fade-in">
          <FileSearch />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>Request not found</p>
          <p style={{ fontSize: 13 }}>No request with ID &ldquo;{query}&rdquo; exists or you don&apos;t have access.</p>
        </div>
      )}

      {result && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
              <div>
                <span className="src-id" style={{ fontSize: 15 }}>{result.id}</span>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: '10px 0 8px', color: 'var(--text-primary)' }}>{result.description}</h2>
                <StatusBadge status={result.status} />
              </div>
              <Link href={`/requests/${result.id}`} className="btn btn-ghost btn-sm">
                Open Request <ArrowRight size={14} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <InfoField label="Requester" value={result.requester?.full_name} />
              <InfoField label="Department" value={result.department?.name} />
              <InfoField label="Created" value={new Date(result.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
              <InfoField label="Time" value={new Date(result.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} />
              {result.assigned_employee && <InfoField label="Assigned To" value={result.assigned_employee.full_name} />}
              <InfoField label="Attachment" value={result.attachment_name ?? 'None'} />
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Workflow History</h3>
            <WorkflowTimeline entries={result.workflow_actions ?? []} />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{value || '—'}</p>
    </div>
  );
}
