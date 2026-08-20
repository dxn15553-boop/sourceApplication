'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Users, Plus, Pencil, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AdminStaffClientProps {
  staffList: any[];
  departments: any[];
}

export default function AdminStaffClient({ staffList, departments }: AdminStaffClientProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [fullName, setFullName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [isHod, setIsHod] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !departmentId) { setError('Name and department are required.'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, department_id: departmentId, is_hod: isHod }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to add staff.'); return; }
      
      setSuccess(`${fullName} added successfully.`);
      setFullName('');
      setDepartmentId('');
      setIsHod(false);
      setTimeout(() => { 
        setSuccess(null); 
        setShowCreate(false); 
        router.refresh(); 
      }, 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowCreate(true); setError(null); setSuccess(null); setFullName(''); }}>
          <Plus size={15} /> Add Staff Member
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Department', 'Is HOD', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staffList.map((s, idx) => (
              <tr key={s.id} style={{ borderBottom: idx < staffList.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent-glow), rgba(255,255,255,0))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent)', flexShrink: 0, border: '1px solid var(--border)'
                    }}>
                      {s.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{s.full_name}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {s.department?.name ?? '—'}
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13 }}>
                  {s.is_hod ? <span className="role-badge" style={{ background: 'var(--success-glow)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)' }}>Yes</span> : <span style={{ color: 'var(--text-muted)' }}>No</span>}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <button className="btn btn-ghost btn-sm" title="Edit staff (coming soon)" disabled>
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {staffList.length === 0 && (
          <div className="empty-state">
            <Users />
            <p>No staff directory entries yet.</p>
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Staff Member">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8 }}>
              <CheckCircle size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#10b981', margin: 0 }}>{success}</p>
            </div>
          )}

          <Input 
            id="fullName" 
            label="Full Name" 
            required 
            placeholder="e.g. John Doe" 
            value={fullName} 
            onChange={e => setFullName(e.target.value)} 
          />

          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-input form-select" value={departmentId} onChange={e => setDepartmentId(e.target.value)} required>
              <option value="">— Select department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <input type="checkbox" id="isHod" checked={isHod} onChange={e => setIsHod(e.target.checked)} />
            <label htmlFor="isHod" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Is HOD?</label>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Adding…' : <><Plus size={14} /> Add Staff</>}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
