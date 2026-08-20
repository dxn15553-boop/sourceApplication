'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Textarea from '@/components/ui/Textarea';
import FileUpload from '@/components/ui/FileUpload';
import { FilePlus, Send, AlertCircle, CheckCircle } from 'lucide-react';

export default function NewRequestForm({ userDepartments, availableStaff }: { userDepartments: { id: string, name: string }[], availableStaff: any[] }) {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [descError, setDescError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState(userDepartments.length > 0 ? userDepartments[0].id : '');
  const [staffRequesterId, setStaffRequesterId] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDescError('');

    if (!staffRequesterId) {
      setError('Please select who is submitting this request.');
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
          department_id: departmentId,
          staff_requester_id: staffRequesterId,
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
            ℹ️ Please select who you are submitting this request on behalf of.
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="staffRequesterId">Submitting On Behalf Of <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select 
              id="staffRequesterId"
              className="form-input form-select" 
              value={staffRequesterId} 
              onChange={(e) => {
                const staffId = e.target.value;
                setStaffRequesterId(staffId);
                const staffMember = availableStaff.find(s => s.id === staffId);
                if (staffMember) {
                  setDepartmentId(staffMember.department_id);
                }
              }}
              required
            >
              <option value="">— Select Staff Member —</option>
              {availableStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>{staff.full_name}</option>
              ))}
            </select>
          </div>

          {userDepartments.length > 1 && (
            <div className="form-group">
              <label className="form-label" htmlFor="departmentId">Department <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select 
                id="departmentId"
                className="form-input form-select" 
                value={departmentId} 
                onChange={(e) => setDepartmentId(e.target.value)}
                required
                disabled
              >
                {userDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Auto-selected based on the staff member.</p>
            </div>
          )}

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
