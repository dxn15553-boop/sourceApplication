'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Building2, Plus, Pencil, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DepartmentWithCount {
  id: string;
  name: string;
  userCount: number;
  hodName: string | null;
  hodEmail: string | null;
}

interface AdminDepartmentsClientProps {
  departments: DepartmentWithCount[];
}

export default function AdminDepartmentsClient({ departments }: AdminDepartmentsClientProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [hodName, setHodName] = useState('');
  const [hodEmail, setHodEmail] = useState('');
  const [hodPassword, setHodPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function resetForm() {
    setName('');
    setHodName('');
    setHodEmail('');
    setHodPassword('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Department name is required.'); return; }

    setSaving(true);
    try {
      const url = '/api/admin/departments';
      const method = showEdit ? 'PUT' : 'POST';
      const body = showEdit ? { id: editId, name } : { name, hodName, hodEmail, hodPassword };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? `Failed to ${showEdit ? 'update' : 'create'} department.`); return; }
      
      setSuccess(`Department "${name}" ${showEdit ? 'updated' : 'created'} successfully.`);
      if (!showEdit) resetForm();
      setTimeout(() => { 
        setSuccess(null); 
        setShowCreate(false); 
        setShowEdit(false);
        router.refresh(); 
      }, 1500);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, deptName: string) {
    if (!confirm(`Are you sure you want to delete the department "${deptName}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/departments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error ?? 'Failed to delete department.'); return; }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowCreate(true); setError(null); setSuccess(null); resetForm(); }}>
          <Plus size={15} /> Add Department
        </button>
      </div>

      {/* Departments Grid */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {departments.map((d) => (
          <div key={d.id} className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '24px' // overriding base card padding if needed, but base is 24px anyway
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="animate-fade-in" style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: 700, color: '#fff', flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                }}>
                  {d.hodName ? d.hodName.charAt(0).toUpperCase() : <Building2 size={20} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                    {d.hodName || 'No HOD Assigned'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>HOD</span>
                    <div className="animate-pulse-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--success)' }}></div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.5)', border: '1px solid var(--border)', padding: '6px', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>
                <button className="btn-ghost" style={{ background: 'none', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }} title="Edit department" onClick={() => { setEditId(d.id); setName(d.name); setShowEdit(true); setError(null); setSuccess(null); }}>
                  <Pencil size={14} />
                </button>
                <div style={{ width: '1px', height: '14px', background: 'var(--border)', alignSelf: 'center' }}></div>
                <button className="btn-ghost" style={{ background: 'none', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', color: 'var(--danger)' }} title="Delete department" onClick={() => handleDelete(d.id, d.name)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(248, 250, 252, 0.6)', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', background: '#fff', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {d.hodEmail || '—'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', background: '#fff', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <Building2 size={13} style={{ color: 'var(--accent)' }} />
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {d.name}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--accent-glow)', border: '1px solid rgba(99,102,241,0.1)', padding: '12px 16px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>
                <span style={{ fontSize: '24px', letterSpacing: '4px', color: 'var(--accent-hover)', lineHeight: 0.6, marginTop: '8px' }}>••••••••</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', cursor: 'pointer', opacity: 0.8, transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity='1'} onMouseLeave={(e) => e.currentTarget.style.opacity='0.8'}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', cursor: 'pointer', opacity: 0.8, transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity='1'} onMouseLeave={(e) => e.currentTarget.style.opacity='0.8'}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </div>
            </div>
          </div>
        ))}

        {departments.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <Building2 />
            <p>No departments yet. Create your first department above.</p>
          </div>
        )}
      </div>

      {/* Create / Edit department modal */}
      <Modal open={showCreate || showEdit} onClose={() => { setShowCreate(false); setShowEdit(false); }} title={showEdit ? "Edit Department" : "Add New Department"}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>
            </div>
          )}
          {success ? (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8 }}>
              <CheckCircle size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#10b981', margin: 0 }}>{success}</p>
            </div>
          ) : (
            <>
              <Input 
                id="name" 
                label="Department Name *" 
                required 
                placeholder="e.g. Human Resources" 
                value={name} 
                onChange={e => setName(e.target.value)} 
              />

              {!showEdit && (
                <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Assign Head of Department (Optional)</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Fill these details to automatically create an HOD for this department.</p>
                  </div>
                  
                  <Input 
                    id="hodName" 
                    label="HOD Full Name" 
                    placeholder="e.g. Jane Doe" 
                    value={hodName} 
                    onChange={e => setHodName(e.target.value)} 
                  />
                  <Input 
                    id="hodEmail" 
                    label="HOD Email Address" 
                    type="email"
                    placeholder="jane.doe@dxn.com" 
                    value={hodEmail} 
                    onChange={e => setHodEmail(e.target.value)} 
                  />
                  <Input 
                    id="hodPassword" 
                    label="HOD Temporary Password" 
                    type="password"
                    placeholder="Min. 8 characters" 
                    value={hodPassword} 
                    onChange={e => setHodPassword(e.target.value)} 
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowCreate(false); setShowEdit(false); }}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? 'Saving…' : (showEdit ? <><Pencil size={14} /> Update</> : <><Plus size={14} /> Create</>)}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </>
  );
}
