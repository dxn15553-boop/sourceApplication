'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { UserPlus, Pencil, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import type { Profile, Department, Role } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/workflow';
import { useRouter } from 'next/navigation';

const ROLES: Role[] = ['user', 'hod', 'final_head', 'procurement_manager', 'section_manager', 'employee', 'admin'];

const DEPT_REQUIRED_ROLES: Role[] = ['user', 'hod', 'employee'];

interface AdminUsersClientProps {
  users: Profile[];
  departments: Department[];
}

interface UserForm {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  department_id: string;
}

const emptyForm = (): UserForm => ({ email: '', password: '', full_name: '', role: 'user', department_id: '' });

export default function AdminUsersClient({ users, departments }: AdminUsersClientProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function set(key: keyof UserForm, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.email || !form.password || !form.full_name) { setError('Email, password, and name are required.'); return; }
    if (DEPT_REQUIRED_ROLES.includes(form.role) && !form.department_id) { setError('Department is required for this role.'); return; }

    setSaving(true);
    try {
      // Use Supabase Auth admin API via server action substitute
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to create user.'); return; }
      setSuccess(`User "${form.full_name}" created successfully.`);
      setForm(emptyForm());
      setTimeout(() => { setSuccess(null); setShowCreate(false); router.refresh(); }, 1800);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowCreate(true); setError(null); setSuccess(null); setForm(emptyForm()); }}>
          <UserPlus size={15} /> Add User
        </button>
      </div>

      {/* Users table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Role', 'Department', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => (
              <tr key={u.id} style={{ borderBottom: idx < users.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {u.full_name.charAt(0)}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{u.full_name}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span className="role-badge">{ROLE_LABELS[u.role]}</span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {(u as any).department?.name ?? '—'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <button className="btn btn-ghost btn-sm" title="Edit user (coming soon)" disabled>
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="empty-state">
            <UserPlus />
            <p>No users yet. Add your first user above.</p>
          </div>
        )}
      </div>

      {/* Create user modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New User">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#fca5a5', margin: 0 }}>{error}</p>
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8 }}>
              <CheckCircle size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#6ee7b7', margin: 0 }}>{success}</p>
            </div>
          )}

          <Input id="full_name" label="Full Name" required placeholder="e.g. Ahmad Faris" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          <Input id="email" label="Email Address" type="email" required placeholder="user@dxn.com" value={form.email} onChange={e => set('email', e.target.value)} />
          <Input id="password" label="Temporary Password" type="password" required placeholder="Min. 8 characters" value={form.password} onChange={e => set('password', e.target.value)} />

          <div className="form-group">
            <label className="form-label">Role <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select className="form-input form-select" value={form.role} onChange={e => set('role', e.target.value as Role)}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>

          {DEPT_REQUIRED_ROLES.includes(form.role) && (
            <div className="form-group">
              <label className="form-label">Department <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select className="form-input form-select" value={form.department_id} onChange={e => set('department_id', e.target.value)}>
                <option value="">— Select department —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Creating…' : <><UserPlus size={14} /> Create User</>}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
