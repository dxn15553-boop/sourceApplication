'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Loader2, Info } from 'lucide-react';

interface PaymentPanelProps {
  requestId: string;
}

export default function PaymentPanel({ requestId }: PaymentPanelProps) {
  const router = useRouter();
  const [prlCompleted, setPrlCompleted] = useState(false);
  const [paymentDate, setPaymentDate] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDate) {
      setError('Payment Date is required.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/requests/${requestId}/log-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prl_completed: prlCompleted,
          payment_done_date: paymentDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log payment');

      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card glass-strong" style={{ borderTop: '4px solid var(--accent)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
        <CreditCard size={18} style={{ color: 'var(--accent)' }} /> Payment Details
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Please confirm if the Payment Request Letter (PRL) is completed and log the date the payment was finalized by Finance.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input 
            type="checkbox" 
            id="prlCompleted" 
            checked={prlCompleted} 
            onChange={e => setPrlCompleted(e.target.checked)} 
            style={{ width: 16, height: 16 }}
          />
          <label htmlFor="prlCompleted" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
            PRL (Payment Request Letter) Completed
          </label>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            Payment Done Date *
          </label>
          <input 
            type="date" 
            className="input" 
            value={paymentDate} 
            onChange={e => setPaymentDate(e.target.value)} 
            required 
            style={{ maxWidth: 200 }}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, padding: '10px 14px', background: 'var(--danger-glow)', borderRadius: 6, fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Info size={16} /> {error}
          </div>
        )}

        <button 
          type="submit"
          disabled={isSubmitting || !paymentDate} 
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: 14 }}
        >
          {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Confirm Payment'}
        </button>
      </form>
    </div>
  );
}
