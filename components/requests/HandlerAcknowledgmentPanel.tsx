'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, CheckCircle2, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react';
import type { SourceRequest } from '@/lib/types';
import Link from 'next/link';

interface HandlerAcknowledgmentPanelProps {
  request: SourceRequest;
}

export default function HandlerAcknowledgmentPanel({ request }: HandlerAcknowledgmentPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const srfNo = request.srf_number || request.id.replace('SRC-', 'SRF-');

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/accept-assignment`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to acknowledge assignment.');
        return;
      }
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'A network error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: '22px 24px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.06) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--success)',
                fontSize: 11.5,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 99,
                border: '1px solid rgba(16, 185, 129, 0.3)',
                textTransform: 'uppercase',
              }}
            >
              <CheckCircle2 size={13} />
              Step: Nominated Handler Acknowledgment
            </span>
            <span
              style={{
                fontSize: 12,
                fontFamily: 'monospace',
                fontWeight: 700,
                color: 'var(--accent)',
                background: 'var(--accent-glow)',
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              SRF No: {srfNo}
            </span>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
            Action Required: Review SRF & Acknowledge Procurement Assignment
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            You have been nominated as the Procurement Handler for this approved source request. Please review the official <strong>Source Request Form (SRF)</strong> and acknowledge to proceed to Vendor Evaluation.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#fca5a5', margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Link
          href={`/requests/${request.id}/srf`}
          target="_blank"
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
        >
          <FileText size={15} />
          <span>Preview / Download SRF 📥</span>
          <ExternalLink size={13} style={{ opacity: 0.7 }} />
        </Link>

        <button
          className="btn btn-primary"
          onClick={handleAccept}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600,
            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.25)',
          }}
        >
          {loading ? (
            'Acknowledging Assignment…'
          ) : (
            <>
              <CheckCircle2 size={16} />
              <span>Acknowledge & Start Procurement Process</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
