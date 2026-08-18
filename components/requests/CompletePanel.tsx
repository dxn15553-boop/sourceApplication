'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, AlertCircle, Loader2 } from 'lucide-react';
import type { SourceRequest } from '@/lib/types';

interface CompletePanelProps {
  request: SourceRequest;
}

export default function CompletePanel({ request }: CompletePanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [workCompletionDate, setWorkCompletionDate] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    if (!confirmed) { setError('Please confirm that you have completed the task.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/close-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_completion_date: workCompletionDate }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Completion failed.'); return; }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card glass-strong" style={{ borderTop: '4px solid var(--success)', marginTop: 20 }}>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Flag size={18} /> Close Request
      </p>
      
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        The materials have been delivered. If this was a service request, please optionally log the work completion date. Check the box to formally close the request.
      </p>

      {error && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
          <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#fca5a5', margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
          Work Completion Date (Optional)
        </label>
        <input 
          type="date" 
          className="input" 
          value={workCompletionDate} 
          onChange={e => setWorkCompletionDate(e.target.value)} 
          style={{ maxWidth: 200 }}
        />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => { setConfirmed(e.target.checked); setError(null); }}
          style={{ width: 16, height: 16, accentColor: 'var(--success)', cursor: 'pointer' }}
        />
        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
          I confirm that all procedures are finished and I am ready to close <strong style={{ color: 'var(--primary)' }}>{request.id}</strong>.
        </span>
      </label>

      <button
        className="btn btn-success"
        style={{ width: '100%', padding: '12px', fontSize: 14 }}
        onClick={handleComplete}
        disabled={loading || !confirmed}
      >
        {loading ? <><Loader2 size={16} className="animate-spin" /> Closing...</> : <><Flag size={16} /> Mark as Completed</>}
      </button>
    </div>
  );
}
