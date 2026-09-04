'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RequestDescriptionInput from '@/components/requests/RequestDescriptionInput';
import FileUpload from '@/components/ui/FileUpload';
import { FilePlus, Send, AlertCircle, CheckCircle } from 'lucide-react';

export default function NewRequestForm({
  departmentId,
  departmentName,
}: {
  departmentId: string;
  departmentName: string;
}) {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [descError, setDescError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requesterName, setRequesterName] = useState('');
  const [requesterDesignation, setRequesterDesignation] = useState('');
  const [requestDate, setRequestDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('IMPORTANT');
  const [requiredByDate, setRequiredByDate] = useState('');
  const [purposeJustification, setPurposeJustification] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDescError('');

    if (!requesterName.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!requesterDesignation.trim()) {
      setError('Please enter your designation.');
      return;
    }

    if (!description.trim()) {
      setDescError('Description is required. Please describe what you are requesting.');
      return;
    }

    const requiresUrs = description.toLowerCase().includes('machinery');
    if (requiresUrs && files.length === 0) {
      setError('A URS (User Requirement Specification) document is mandatory when requesting New Machinery Purchase. Please upload the URS document below.');
      return;
    }

    setLoading(true);
    try {
      let uploadedAttachments: { name: string; path: string; size?: number }[] = [];

      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((f) => formData.append('files', f));
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) { setError(uploadJson.error ?? 'File upload failed.'); return; }
        uploadedAttachments = uploadJson.files || [];
      }

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_id: departmentId,
          requester_name: requesterName.trim(),
          requester_designation: requesterDesignation.trim(),
          priority,
          request_date: requestDate || undefined,
          required_by_date: requiredByDate || undefined,
          purpose_justification: purposeJustification.trim() || undefined,
          description: description.trim(),
          attachment_path: uploadedAttachments[0]?.path ?? null,
          attachment_name: uploadedAttachments[0]?.name ?? null,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
        }),
      });
      const json = await res.json();

      if (!res.ok) { setError(json.error ?? 'Failed to create request.'); return; }

      setSuccess(`Request ${json.data.id} created! Redirecting…`);
      setTimeout(() => router.push(`/requests/${json.data.id}`), 1800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Info header */}
      <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FilePlus size={20} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Source Request Form</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Your request will receive a unique ID and be routed to your HOD automatically.</p>
          </div>
        </div>
      </div>

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', marginBottom: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10 }}>
          <CheckCircle size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#6ee7b7', margin: 0, fontWeight: 600 }}>{success}</p>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', marginBottom: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
          <AlertCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#fca5a5', margin: 0 }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: '12px 16px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
            ℹ️ Please enter your full name. Your request will be routed to the <strong>{departmentName}</strong> department's HOD.
          </div>
          <div className="form-group" style={{ display: 'none' }}>
            <input type="hidden" id="departmentId" value={departmentId} />
          </div>

          {/* Permission Required From field is now managed by HODs in the approval panel */}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="requesterName">Requester Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                id="requesterName"
                type="text"
                className="form-input"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="requesterDesignation">Designation <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                id="requesterDesignation"
                type="text"
                className="form-input"
                value={requesterDesignation}
                onChange={(e) => setRequesterDesignation(e.target.value)}
                placeholder="Enter your designation (e.g., Engineer, Manager)"
                required
              />
            </div>
          </div>

          {/* Date of Request, Expected Date, and Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="requestDate">Date of Request <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                id="requestDate"
                type="date"
                className="form-input"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="requiredByDate">Expected Date</label>
              <input
                id="requiredByDate"
                type="date"
                className="form-input"
                value={requiredByDate}
                onChange={(e) => setRequiredByDate(e.target.value)}
                min={requestDate || new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['NORMAL', 'IMPORTANT', 'URGENT'] as const).map((p) => {
                  const isSelected = priority === p;
                  const colors = {
                    NORMAL: { bg: 'rgba(16,185,129,0.12)', border: '#10b981', text: '#10b981', dot: '🟢' },
                    IMPORTANT: { bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', text: '#3b82f6', dot: '🔵' },
                    URGENT: { bg: 'rgba(239,68,68,0.12)', border: '#ef4444', text: '#ef4444', dot: '🔴' },
                  }[p];

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected ? `1.5px solid ${colors.border}` : '1px solid var(--border)',
                        background: isSelected ? colors.bg : 'var(--bg-hover)',
                        color: isSelected ? colors.text : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <span>{colors.dot}</span>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="purposeJustification">Purpose / Justification (Optional)</label>
            <textarea
              id="purposeJustification"
              rows={2}
              className="form-input"
              placeholder="Explain the business need, purpose, or reason for this request..."
              value={purposeJustification}
              onChange={(e) => setPurposeJustification(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <RequestDescriptionInput
            id="description"
            value={description}
            onChange={(val) => {
              setDescription(val);
              if (val.trim()) setDescError('');
            }}
            error={descError}
            required
          />

          {description.toLowerCase().includes('machinery') && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px dashed rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 22 }}>📄</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>
                  URS Document Upload Mandatory
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                  You have items categorized under <strong>New Machinery Purchase</strong>. A valid User Requirement Specification (URS) document must be attached below.
                </p>
              </div>
            </div>
          )}

          <FileUpload onFilesSelect={setFiles} maxSizeMb={15} />

          <div style={{ padding: '14px 16px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#60a5fa', margin: '0 0 6px' }}>After submission, this request will:</p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 2 }}>
              <li>Receive a unique <strong style={{ color: 'var(--text-primary)' }}>SRC-YYYY-XXXX</strong> ID</li>
              <li>Be automatically routed to your <strong style={{ color: 'var(--text-primary)' }}>HOD</strong></li>
              <li>Move through the full approval chain</li>
              <li>Provide full status visibility at every stage</li>
            </ol>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={() => router.back()} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !!success}>
              {loading ? (
                <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Submitting…</>
              ) : <><Send size={15} />Submit Request</>}
            </button>
          </div>
        </div>
      </form>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
