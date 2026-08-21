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
  departmentIds: string[];
}

const emptyForm = (): UserForm => ({ email: '', password: '', full_name: '', role: 'user', departmentIds: [] });

export default function AdminUsersClient({ users, departments }: AdminUsersClientProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function set(key: keyof UserForm, val: any) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function handleEditClick(u: any) {
    setForm({
      email: u.email,
      password: '',
      full_name: u.full_name,
      role: u.role,
      departmentIds: u.profileDepartments?.map((pd: any) => pd.department.id) || [],
    });
    setEditingUserId(u.id);
    setError(null);
    setSuccess(null);
    setShowEdit(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.email || !form.full_name) { setError('Email and name are required.'); return; }
    if (!showEdit && !form.password) { setError('Password is required.'); return; }
    if (DEPT_REQUIRED_ROLES.includes(form.role) && form.departmentIds.length === 0) { setError('At least one department is required for this role.'); return; }

    setSaving(true);
    try {
      const url = '/api/admin/users';
      const method = showEdit ? 'PUT' : 'POST';
      const body = showEdit ? { ...form, id: editingUserId } : form;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? (showEdit ? 'Failed to update user.' : 'Failed to create user.')); return; }
      setSuccess(`User "${form.full_name}" ${showEdit ? 'updated' : 'created'} successfully.`);
      if (!showEdit) setForm(emptyForm());
      setTimeout(() => { 
        setSuccess(null); 
        if (showEdit) setShowEdit(false); else setShowCreate(false); 
        router.refresh(); 
      }, 1500);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete user "${name}"? This action cannot be undone.`)) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error ?? 'Failed to delete user.'); return; }
      router.refresh();
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
                  {(u as any).profileDepartments?.map((pd: any) => pd.department.name).join(', ') || '—'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" title="Edit user" onClick={() => handleEditClick(u)}>
                      <Pencil size={13} />
                    </button>
                    <button className="btn btn-ghost btn-sm" title="Delete user" onClick={() => handleDeleteUser(u.id, u.full_name)}>
                      <Trash2 size={13} style={{ color: 'var(--danger)' }} />
                    </button>
                  </div>
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

      {/* User modal */}
      <Modal open={showCreate || showEdit} onClose={() => { setShowCreate(false); setShowEdit(false); }} title={showEdit ? "Edit User" : "Add New User"}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          {!showEdit && (
            <Input id="password" label="Temporary Password" type="password" required placeholder="Min. 8 characters" value={form.password} onChange={e => set('password', e.target.value)} />
          )}

          <div className="form-group">
            <label className="form-label">Role <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select className="form-input form-select" value={form.role} onChange={e => set('role', e.target.value as Role)}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>

          {DEPT_REQUIRED_ROLES.includes(form.role) && (
            <div className="form-group">
              <label className="form-label">Department(s) <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select multiple className="form-input form-select" value={form.departmentIds} onChange={e => {
                const options = Array.from(e.target.selectedOptions, option => option.value);
                set('departmentIds', options);
              }} style={{ height: '80px' }}>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Hold Ctrl/Cmd to select multiple</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowCreate(false); setShowEdit(false); }}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Saving…' : (showEdit ? <><Pencil size={14} /> Update User</> : <><UserPlus size={14} /> Create User</>)}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
