'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Info } from 'lucide-react';

interface PRCreationPanelProps {
  requestId: string;
}

export default function PRCreationPanel({ requestId }: PRCreationPanelProps) {
  const router = useRouter();
  const [prNumber, setPrNumber] = useState('');
  const [prDate, setPrDate] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prNumber || !prDate) {
      setError('PR Number and PR Date are required.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/requests/${requestId}/create-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pr_number: prNumber,
          pr_date: prDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create PR');

      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card glass-strong" style={{ borderTop: '4px solid var(--primary)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
        <FileText size={18} style={{ color: 'var(--primary)' }} /> Purchase Requisition (PR)
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        The vendor evaluation is complete. Please generate the Purchase Requisition (PR) and log the details below.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              PR Number *
            </label>
            <input 
              type="text" 
              className="input" 
              value={prNumber} 
              onChange={e => setPrNumber(e.target.value)} 
              placeholder="e.g. PR-2026-1029"
              required 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              PR Date *
            </label>
            <input 
              type="date" 
              className="input" 
              value={prDate} 
              onChange={e => setPrDate(e.target.value)} 
              required 
            />
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, padding: '10px 14px', background: 'var(--danger-glow)', borderRadius: 6, fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Info size={16} /> {error}
          </div>
        )}

        <button 
          type="submit"
          disabled={isSubmitting || !prNumber || !prDate} 
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: 14 }}
        >
          {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Confirm PR Creation'}
        </button>
      </form>
    </div>
  );
}
