'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileCode, Loader2, Info } from 'lucide-react';

interface POCreationPanelProps {
  requestId: string;
}

export default function POCreationPanel({ requestId }: POCreationPanelProps) {
  const router = useRouter();
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poNumber || !poDate) {
      setError('PO Number and PO Date are required.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/requests/${requestId}/create-po`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_number: poNumber,
          po_date: poDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create PO');

      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card glass-strong" style={{ borderTop: '4px solid var(--accent)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
        <FileCode size={18} style={{ color: 'var(--accent)' }} /> Purchase Order (PO)
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        The PR has been logged. Now, please generate the Purchase Order (PO) with the selected vendor and log the details below.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              PO Number *
            </label>
            <input 
              type="text" 
              className="input" 
              value={poNumber} 
              onChange={e => setPoNumber(e.target.value)} 
              placeholder="e.g. PO-2026-8831"
              required 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              PO Date *
            </label>
            <input 
              type="date" 
              className="input" 
              value={poDate} 
              onChange={e => setPoDate(e.target.value)} 
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
          disabled={isSubmitting || !poNumber || !poDate} 
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: 14 }}
        >
          {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Confirm PO Creation'}
        </button>
      </form>
    </div>
  );
}
