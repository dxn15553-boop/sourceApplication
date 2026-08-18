'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Loader2, Info } from 'lucide-react';

interface DeliveryPanelProps {
  requestId: string;
}

export default function DeliveryPanel({ requestId }: DeliveryPanelProps) {
  const router = useRouter();
  
  const [orderedQty, setOrderedQty] = useState('');
  const [acceptedQty, setAcceptedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [promisedDate, setPromisedDate] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [receivedDate, setReceivedDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderedQty || !acceptedQty || !rejectedQty) {
      setError('Ordered, Accepted, and Rejected quantities are required.');
      return;
    }
    if (Number(rejectedQty) > 0 && !rejectionReason.trim()) {
      setError('Please provide a reason for the rejected quantity.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/requests/${requestId}/log-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordered_qty: Number(orderedQty),
          accepted_qty: Number(acceptedQty),
          rejected_qty: Number(rejectedQty),
          rejection_reason: rejectionReason,
          promised_delivery_date: promisedDate,
          material_dispatch_date: dispatchDate,
          material_received_date: receivedDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log delivery');

      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card glass-strong" style={{ borderTop: '4px solid var(--primary)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
        <Package size={18} style={{ color: 'var(--primary)' }} /> Delivery Logistics
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Track the physical delivery of materials. Ensure all quantities and dates are accurately logged.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Ordered Qty *</label>
            <input type="number" min="0" className="input" value={orderedQty} onChange={e => setOrderedQty(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Accepted Qty *</label>
            <input type="number" min="0" className="input" value={acceptedQty} onChange={e => setAcceptedQty(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Rejected Qty *</label>
            <input type="number" min="0" className="input" value={rejectedQty} onChange={e => setRejectedQty(e.target.value)} required />
          </div>
        </div>

        {Number(rejectedQty) > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Rejection Reason *</label>
            <textarea className="input" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={2} required />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Promised Date</label>
            <input type="date" className="input" value={promisedDate} onChange={e => setPromisedDate(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Dispatch Date</label>
            <input type="date" className="input" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Received Date</label>
            <input type="date" className="input" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} />
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, padding: '10px 14px', background: 'var(--danger-glow)', borderRadius: 6, fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Info size={16} /> {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 14 }}>
          {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Log Delivery Details'}
        </button>
      </form>
    </div>
  );
}
