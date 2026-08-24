'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Textarea from '@/components/ui/Textarea';
import FileUpload from '@/components/ui/FileUpload';
import { FilePlus, Send, AlertCircle, CheckCircle } from 'lucide-react';

export default function NewRequestForm({ 
  departmentId, 
  departmentName, 
  allDepartments,
  userRole
}: { 
  departmentId: string; 
  departmentName: string; 
  allDepartments: { id: string; name: string }[];
  userRole: string;
}) {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [descError, setDescError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requesterName, setRequesterName] = useState('');
  const [targetDepartmentIds, setTargetDepartmentIds] = useState<string[]>([]);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDescError('');

    if (!requesterName.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!description.trim()) {
      setDescError('Description is required. Please describe what you are requesting.');
      return;
    }

    setLoading(true);
    try {
      let attachmentPath: string | undefined;
      let attachmentName: string | undefined;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) { setError(uploadJson.error ?? 'File upload failed.'); return; }
        attachmentPath = uploadJson.path;
        attachmentName = uploadJson.name;
      }

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          department_ids: targetDepartmentIds,
          requester_name: requesterName.trim(),
          description: description.trim(), 
          attachment_path: attachmentPath, 
          attachment_name: attachmentName 
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

          {userRole === 'hod' && (
            <div className="form-group">
              <label className="form-label" style={{ marginBottom: 4 }}>
                Permission Required From (Select all that apply)
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.4)',
                border: '1px solid var(--border)',
                padding: '16px',
                borderRadius: '12px'
              }}>
                {allDepartments
                  .filter(d => ['IT', 'Maintenance', 'QA', 'EHS', 'Admin', 'IWH', 'QC', 'Engineering', 'Legal', 'Others'].includes(d.name) && d.id !== departmentId)
                  .map(dept => {
                    const isChecked = targetDepartmentIds.includes(dept.id);
                    return (
                      <label 
                        key={dept.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          fontSize: '13px', 
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTargetDepartmentIds([...targetDepartmentIds, dept.id]);
                            } else {
                              setTargetDepartmentIds(targetDepartmentIds.filter(id => id !== dept.id));
                            }
                          }}
                          disabled={loading}
                          style={{
                            width: '15px',
                            height: '15px',
                            cursor: 'pointer',
                            accentColor: 'var(--accent)'
                          }}
                        />
                        <span>{dept.name}</span>
                      </label>
                    );
                  })}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, marginBottom: 0 }}>
                HOD of each selected department must approve this request before it can proceed to the Regional Head.
              </p>
            </div>
          )}

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

          <Textarea
            id="description"
            label="Source Request Description"
            placeholder="Describe what you are requesting — source, product, specification, quantity, purpose, or any relevant details…"
            value={description}
            onChange={e => { setDescription(e.target.value); if (e.target.value.trim()) setDescError(''); }}
            error={descError}
            required
            rows={6}
          />

          <FileUpload onFileSelect={setFile} maxSizeMb={10} />

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
