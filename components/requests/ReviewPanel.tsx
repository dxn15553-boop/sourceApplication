'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, ShieldAlert, Loader2 } from 'lucide-react';

export default function ReviewPanel({ reviewId, departmentName }: { reviewId: string, departmentName: string }) {
  const router = useRouter();
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (action: 'Approved' | 'Rejected') => {
    if (action === 'Rejected' && !remarks.trim()) {
      setError('Remarks are required for rejection.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/requests/required-reviews/${reviewId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card glass-strong" style={{ borderTop: '4px solid #f59e0b' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
        <ShieldAlert size={18} style={{ color: '#f59e0b' }} /> Required Review: {departmentName}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Your department has been assigned to review this request. Please provide your approval or rejection.
      </p>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          Remarks (optional for approval)
        </label>
        <textarea
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          placeholder="Add your comments here..."
          rows={3}
          style={{ width: '100%', resize: 'vertical' }}
          className="input"
        />
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, padding: '8px 12px', background: 'var(--danger-glow)', borderRadius: 6, fontWeight: 500 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => handleSubmit('Approved')}
          disabled={isSubmitting}
          className="btn btn-primary"
          style={{ flex: 1, background: 'var(--success)', color: 'white', borderColor: 'var(--success)' }}
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Approve
        </button>
        <button
          onClick={() => handleSubmit('Rejected')}
          disabled={isSubmitting}
          className="btn"
          style={{ flex: 1, color: 'var(--danger)', borderColor: 'var(--danger)' }}
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Reject
        </button>
      </div>
    </div>
  );
}
