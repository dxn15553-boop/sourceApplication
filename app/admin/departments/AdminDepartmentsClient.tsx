'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Building2, Plus, Pencil, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DepartmentWithCount {
  id: string;
  name: string;
  userCount: number;
}

interface AdminDepartmentsClientProps {
  departments: DepartmentWithCount[];
}

export default function AdminDepartmentsClient({ departments }: AdminDepartmentsClientProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Department name is required.'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to create department.'); return; }
      
      setSuccess(`Department "${name}" created successfully.`);
      setName('');
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
        <button className="btn btn-primary btn-sm" onClick={() => { setShowCreate(true); setError(null); setSuccess(null); setName(''); }}>
          <Plus size={15} /> Add Department
        </button>
      </div>

      {/* Departments table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Department Name', 'Members', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {departments.map((d, idx) => (
              <tr key={d.id} style={{ borderBottom: idx < departments.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent-glow), rgba(255,255,255,0))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent)', flexShrink: 0, border: '1px solid var(--border)'
                    }}>
                      <Building2 size={16} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {d.userCount} user{d.userCount !== 1 && 's'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <button className="btn btn-ghost btn-sm" title="Edit department (coming soon)" disabled>
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {departments.length === 0 && (
          <div className="empty-state">
            <Building2 />
            <p>No departments yet. Create your first department above.</p>
          </div>
        )}
      </div>

      {/* Create department modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Department">
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
            id="name" 
            label="Department Name" 
            required 
            placeholder="e.g. Human Resources" 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Creating…' : <><Plus size={14} /> Create Department</>}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
