'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeDollarSign, Loader2, Info } from 'lucide-react';
import Textarea from '@/components/ui/Textarea';

interface VendorEvaluationPanelProps {
  requestId: string;
}

export default function VendorEvaluationPanel({ requestId }: VendorEvaluationPanelProps) {
  const router = useRouter();
  const [l1Vendor, setL1Vendor] = useState('');
  const [l1Price, setL1Price] = useState('');
  
  const [l2Vendor, setL2Vendor] = useState('');
  const [l2Price, setL2Price] = useState('');
  
  const [l3Vendor, setL3Vendor] = useState('');
  const [l3Price, setL3Price] = useState('');
  
  const [selectedVendor, setSelectedVendor] = useState<'L1' | 'L2' | 'L3'>('L1');
  const [reason, setReason] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l1Vendor || !l1Price) {
      setError('L1 Vendor details are required.');
      return;
    }
    if (selectedVendor !== 'L1' && !reason.trim()) {
      setError(`Please provide a reason for selecting ${selectedVendor} instead of L1.`);
      return;
    }
    if (selectedVendor === 'L2' && (!l2Vendor || !l2Price)) {
      setError('L2 Vendor details are required since you selected L2.');
      return;
    }
    if (selectedVendor === 'L3' && (!l3Vendor || !l3Price)) {
      setError('L3 Vendor details are required since you selected L3.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/requests/${requestId}/evaluate-vendor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          l1_vendor: l1Vendor,
          l1_price: l1Price,
          l2_vendor: l2Vendor || undefined,
          l2_price: l2Price || undefined,
          l3_vendor: l3Vendor || undefined,
          l3_price: l3Price || undefined,
          selected_vendor: selectedVendor,
          selection_reason: reason || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit evaluation');

      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card glass-strong" style={{ borderTop: '4px solid var(--primary)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
        <BadgeDollarSign size={18} style={{ color: 'var(--primary)' }} /> Vendor Evaluation
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Please provide pricing details for up to three vendors (L1 = Lowest Bidder). 
        If you select a vendor other than L1, you must provide a justification.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Vendor Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          {/* L1 */}
          <div style={{ background: 'var(--bg-base)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>L1 (Lowest)</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Vendor Name *</label>
              <input type="text" className="input" value={l1Vendor} onChange={e => setL1Vendor(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Price *</label>
              <input type="number" className="input" value={l1Price} onChange={e => setL1Price(e.target.value)} required min="0" step="0.01" />
            </div>
          </div>

          {/* L2 */}
          <div style={{ background: 'var(--bg-base)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>L2 Vendor</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Vendor Name</label>
              <input type="text" className="input" value={l2Vendor} onChange={e => setL2Vendor(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Price</label>
              <input type="number" className="input" value={l2Price} onChange={e => setL2Price(e.target.value)} min="0" step="0.01" />
            </div>
          </div>

          {/* L3 */}
          <div style={{ background: 'var(--bg-base)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>L3 Vendor</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Vendor Name</label>
              <input type="text" className="input" value={l3Vendor} onChange={e => setL3Vendor(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Price</label>
              <input type="number" className="input" value={l3Price} onChange={e => setL3Price(e.target.value)} min="0" step="0.01" />
            </div>
          </div>
        </div>

        {/* Selection & Justification */}
        <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Selected Vendor *
            </label>
            <select 
              className="input" 
              value={selectedVendor} 
              onChange={e => setSelectedVendor(e.target.value as any)}
              style={{ fontWeight: 600 }}
            >
              <option value="L1">L1 Vendor {l1Vendor ? `(${l1Vendor})` : ''}</option>
              <option value="L2">L2 Vendor {l2Vendor ? `(${l2Vendor})` : ''}</option>
              <option value="L3">L3 Vendor {l3Vendor ? `(${l3Vendor})` : ''}</option>
            </select>
          </div>

          {selectedVendor !== 'L1' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <Textarea
                id="selection-reason"
                label={`Reason for selecting ${selectedVendor} instead of L1 *`}
                placeholder="Explain why the lowest bidder was not chosen (e.g. quality, lead time, compatibility)..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                rows={3}
              />
            </div>
          )}
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, padding: '10px 14px', background: 'var(--danger-glow)', borderRadius: 6, fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Info size={16} /> {error}
          </div>
        )}

        <button 
          type="submit"
          disabled={isSubmitting} 
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: 14 }}
        >
          {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Submitting Evaluation...</> : 'Submit Vendor Evaluation'}
        </button>
      </form>
    </div>
  );
}
