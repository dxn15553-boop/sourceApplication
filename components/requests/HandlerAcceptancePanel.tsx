'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, Loader2, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import type { SourceRequest } from '@/lib/types';

interface HandlerAcceptancePanelProps {
  request: SourceRequest;
  assignedHandlerName?: string;
}

export default function HandlerAcceptancePanel({ request, assignedHandlerName }: HandlerAcceptancePanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/accept-assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to accept assignment');
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  }

  return (
    <div className="card glass-strong animate-fade-in" style={{ borderTop: '4px solid #8b5cf6', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <UserCheck size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Step 9: Handler Assignment Acceptance
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Section Manager has assigned this request to <strong>{assignedHandlerName || 'you'}</strong>.
          </p>
        </div>
      </div>

      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(139, 92, 246, 0.08)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: 8,
          marginBottom: 18,
          fontSize: 13,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}
      >
        Clicking <strong>Accept Assignment</strong> will record your acceptance timestamp and move this request directly into <strong>Step 10: Vendor Evaluation (L1/L2/L3 Survey)</strong>.
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 8,
            marginBottom: 16,
            color: 'var(--danger)',
            fontSize: 13,
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleAccept}
        disabled={loading}
        className="btn btn-primary"
        style={{
          width: '100%',
          padding: '12px 18px',
          fontSize: 14,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
        }}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Accepting Assignment…
          </>
        ) : (
          <>
            <UserCheck size={16} />
            Accept Assignment & Begin Sourcing <ArrowRight size={15} />
          </>
        )}
      </button>
    </div>
  );
}
