'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, AlertCircle } from 'lucide-react';
import type { SourceRequest } from '@/lib/types';

interface CompletePanelProps {
  request: SourceRequest;
}

export default function CompletePanel({ request }: CompletePanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    if (!confirmed) { setError('Please confirm that you have completed the task.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Completion failed.'); return; }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      padding: 20,
      background: 'rgba(16,185,129,0.05)',
      border: '1px solid rgba(16,185,129,0.2)',
      borderRadius: 12,
      marginTop: 20,
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#6ee7b7', marginBottom: 12 }}>
        <Flag size={15} style={{ display: 'inline', marginRight: 6 }} />
        Mark This Request as Completed
      </p>

      {error && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
          <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#fca5a5', margin: 0 }}>{error}</p>
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => { setConfirmed(e.target.checked); setError(null); }}
          style={{ width: 16, height: 16, accentColor: 'var(--success)', cursor: 'pointer' }}
        />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          I confirm that I have completed the source request procedure for <strong style={{ color: 'var(--text-primary)' }}>{request.id}</strong>.
        </span>
      </label>

      <button
        className="btn btn-success btn-sm"
        onClick={handleComplete}
        disabled={loading || !confirmed}
      >
        {loading ? 'Recording completion…' : <><Flag size={14} /> Mark as Completed</>}
      </button>
    </div>
  );
}
