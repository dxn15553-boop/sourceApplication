'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, AlertCircle } from 'lucide-react';
import Textarea from '@/components/ui/Textarea';
import type { SourceRequest } from '@/lib/types';

interface ResubmitPanelProps {
  request: SourceRequest;
}

export default function ResubmitPanel({ request }: ResubmitPanelProps) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resubmit', comment: note.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Resubmit failed.'); return; }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // Find the return comment from audit trail
  const returnEntry = (request as any).workflow_actions
    ?.slice()
    .reverse()
    .find((a: any) => a.action === 'returned');

  return (
    <div style={{
      padding: 20,
      background: 'rgba(245,158,11,0.05)',
      border: '1px solid rgba(245,158,11,0.2)',
      borderRadius: 12,
      marginTop: 20,
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#fcd34d', marginBottom: 12 }}>
        ↩ This request was returned for correction
      </p>

      {returnEntry?.comment && (
        <div style={{
          padding: '12px 14px',
          marginBottom: 16,
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderLeft: '3px solid #f59e0b',
          borderRadius: '0 8px 8px 0',
          fontSize: 13,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}>
          <strong style={{ color: '#fcd34d', display: 'block', marginBottom: 4 }}>Reviewer&apos;s comment:</strong>
          &ldquo;{returnEntry.comment}&rdquo;
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
          <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#fca5a5', margin: 0 }}>{error}</p>
        </div>
      )}

      <Textarea
        id="resubmit-note"
        label="Add a note (optional)"
        placeholder="Describe what you have corrected or updated…"
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={3}
      />

      <div style={{ marginTop: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={handleResubmit} disabled={loading}>
          {loading ? 'Resubmitting…' : <><Send size={14} /> Resubmit Request</>}
        </button>
      </div>
    </div>
  );
}
