'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Loader2, Info, CheckCircle, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';

interface DeliveryPanelProps {
  requestId: string;
}

export default function DeliveryPanel({ requestId }: DeliveryPanelProps) {
  const router = useRouter();

  const [orderedQty, setOrderedQty] = useState('');
  const [receivedQty, setReceivedQty] = useState('');
  const [acceptedQty, setAcceptedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('');
  const [qcStatus, setQcStatus] = useState<'Passed' | 'Conditionally Accepted' | 'Failed'>('Passed');
  const [rejectionReason, setRejectionReason] = useState('');
  const [qcRemarks, setQcRemarks] = useState('');

  const [promisedDate, setPromisedDate] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [receivedDate, setReceivedDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Rejection rate calculation
  const rejectionRate = useMemo(() => {
    const rec = Number(receivedQty) || (Number(acceptedQty) + Number(rejectedQty)) || 0;
    const rej = Number(rejectedQty) || 0;
    if (rec > 0 && rej > 0) {
      return ((rej / rec) * 100).toFixed(1);
    }
    return null;
  }, [receivedQty, acceptedQty, rejectedQty]);

  // On-time delivery check
  const onTimeStatus = useMemo(() => {
    if (promisedDate && receivedDate) {
      const p = new Date(promisedDate);
      const r = new Date(receivedDate);
      return r <= p;
    }
    return null;
  }, [promisedDate, receivedDate]);

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

    const calculatedReceived = Number(receivedQty) || (Number(acceptedQty) + Number(rejectedQty));

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/requests/${requestId}/log-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordered_qty: Number(orderedQty),
          received_qty: calculatedReceived,
          accepted_qty: Number(acceptedQty),
          rejected_qty: Number(rejectedQty),
          qc_status: qcStatus,
          rejection_reason: rejectionReason,
          qc_remarks: qcRemarks,
          promised_delivery_date: promisedDate || undefined,
          material_dispatch_date: dispatchDate || undefined,
          material_received_date: receivedDate || undefined,
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
    <div className="card glass-strong animate-fade-in" style={{ borderTop: '4px solid var(--primary)', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
          <Package size={18} style={{ color: 'var(--primary)' }} /> Step 15: Delivery Logistics & QC Inspection
        </h2>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Log physical delivery receipt, quantities, and quality control (QC) inspection acceptance.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Quantities Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, marginBottom: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Ordered Qty <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input type="number" min="0" className="form-input" value={orderedQty} onChange={(e) => setOrderedQty(e.target.value)} required placeholder="e.g. 100" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Received Qty
            </label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={receivedQty}
              onChange={(e) => setReceivedQty(e.target.value)}
              placeholder="e.g. 100"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Accepted Qty <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input type="number" min="0" className="form-input" value={acceptedQty} onChange={(e) => setAcceptedQty(e.target.value)} required placeholder="e.g. 95" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Rejected Qty <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input type="number" min="0" className="form-input" value={rejectedQty} onChange={(e) => setRejectedQty(e.target.value)} required placeholder="e.g. 5" />
          </div>
        </div>

        {/* Live Rejection Rate Indicator */}
        {rejectionRate !== null && Number(rejectionRate) > 0 && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              marginBottom: 16,
              fontSize: 12.5,
              color: 'var(--danger)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle size={15} />
            Rejection Rate: <strong>{rejectionRate}%</strong> ({rejectedQty} of {receivedQty || Number(acceptedQty) + Number(rejectedQty)} items rejected)
          </div>
        )}

        {/* QC Status Selection */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            QC Inspection Status <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['Passed', 'Conditionally Accepted', 'Failed'] as const).map((status) => {
              const isSelected = qcStatus === status;
              const config = {
                Passed: { bg: 'rgba(16,185,129,0.12)', border: '#10b981', color: '#10b981', icon: CheckCircle },
                'Conditionally Accepted': { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', color: '#f59e0b', icon: AlertTriangle },
                Failed: { bg: 'rgba(239,68,68,0.12)', border: '#ef4444', color: '#ef4444', icon: XCircle },
              }[status];
              const Icon = config.icon;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setQcStatus(status)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: isSelected ? 700 : 500,
                    border: isSelected ? `1.5px solid ${config.border}` : '1px solid var(--border)',
                    background: isSelected ? config.bg : 'var(--bg-hover)',
                    color: isSelected ? config.color : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={14} />
                  {status}
                </button>
              );
            })}
          </div>
        </div>

        {Number(rejectedQty) > 0 && (
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Rejection Reason <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea className="form-input" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={2} required placeholder="Specify defects, damage, or non-compliance reasons..." />
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            QC Remarks & Inspection Notes (Optional)
          </label>
          <input type="text" className="form-input" value={qcRemarks} onChange={(e) => setQcRemarks(e.target.value)} placeholder="e.g. Visual inspection passed, dimension verified against drawing..." />
        </div>

        {/* Dates Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Promised Delivery Date</label>
            <input type="date" className="form-input" value={promisedDate} onChange={(e) => setPromisedDate(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Material Dispatch Date (MDD)</label>
            <input type="date" className="form-input" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Material Received Date (MRD)</label>
            <input type="date" className="form-input" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
          </div>
        </div>

        {/* Live On-Time Delivery Indicator */}
        {onTimeStatus !== null && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: onTimeStatus ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${onTimeStatus ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
              marginBottom: 16,
              fontSize: 12.5,
              color: onTimeStatus ? 'var(--success)' : 'var(--danger)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {onTimeStatus ? <CheckCircle size={15} /> : <XCircle size={15} />}
            {onTimeStatus ? 'Delivery Status: On-Time (Received on or before Promised Date)' : 'Delivery Status: Delayed (Received after Promised Date)'}
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Info size={16} /> {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 14 }}>
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Submitting Delivery & QC…
            </>
          ) : (
            'Complete Delivery Logistics & QC Inspection'
          )}
        </button>
      </form>
    </div>
  );
}
