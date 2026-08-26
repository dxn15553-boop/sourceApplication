'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Building2, Plus, Trash2, AlertCircle, CheckCircle, KeyRound, User, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HodEntry {
  departmentName: string;
  hodEmail: string | null;
  hodId: string | null;
  plaintextPassword?: string | null;
}

interface ManagerEntry {
  role: string;
  roleLabel: string;
  email: string | null;
  profileId: string | null;
  plaintextPassword?: string | null;
}

interface AdminHodClientProps {
  hodList: HodEntry[];
  managerList: ManagerEntry[];
}

export default function AdminHodClient({ hodList, managerList }: AdminHodClientProps) {
  const router = useRouter();
  
  const [showCreate, setShowCreate] = useState(false);
  const [role, setRole] = useState<string>('hod');
  const [departmentName, setDepartmentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [showReset, setShowReset] = useState(false);
  const [resetTargetId, setResetTargetId] = useState<string>('');
  const [resetDeptName, setResetDeptName] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const availableDepartments = hodList.filter(h => !h.hodEmail).map(h => h.departmentName);

  function togglePasswordVisibility(key: string) {
    setVisiblePasswords(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }

  function resetForm() {
    setRole('hod');
    setDepartmentName(availableDepartments[0] || '');
    setEmail('');
    setPassword('');
    setNewPassword('');
    setError(null);
    setSuccess(null);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!departmentName.trim() || !email || !password) { setError('All fields are required.'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/logins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          departmentName: role === 'hod' ? departmentName : undefined, 
          email, password, 
          role 
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to create login.'); return; }
      
      setSuccess(`HOD for "${departmentName}" created successfully.`);
      resetForm();
      setTimeout(() => { 
        setSuccess(null); 
        setShowCreate(false); 
        router.refresh(); 
      }, 1500);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newPassword || newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/logins/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profileId: resetTargetId, 
          newPassword 
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to reset password.'); return; }
      
      setSuccess(`Password for ${resetDeptName} HOD updated successfully.`);
      setNewPassword('');
      setTimeout(() => { 
        setSuccess(null); 
        setShowReset(false); 
        router.refresh();
      }, 1500);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, deptName: string) {
    if (!confirm(`Are you sure you want to delete the HOD login for "${deptName}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/logins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: id }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error ?? 'Failed to delete login.'); return; }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button 
          className="btn btn-primary btn-sm" 
          onClick={() => { setShowCreate(true); resetForm(); }}
        >
          <Plus size={15} /> Add Login Credential
        </button>
      </div>

      {/* Section 1: Workflow Managers */}
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Workflow Managers (Global)</h2>
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {managerList.map((m: ManagerEntry) => (
          <div key={m.role} className="card" style={{
            display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="animate-fade-in" style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: 700, color: '#fff', flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                }}>
                  <User size={20} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                    {m.roleLabel}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                    Global Manager
                  </span>
                </div>
              </div>
              {m.profileId && (
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.5)', border: '1px solid var(--border)', padding: '6px', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>
                  <button className="btn-ghost" style={{ background: 'none', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', color: 'var(--accent)' }} title="Reset Password" onClick={() => { setResetTargetId(m.profileId!); setResetDeptName(m.roleLabel); setShowReset(true); setError(null); setSuccess(null); }}>
                    <KeyRound size={14} />
                  </button>
                  <div style={{ width: '1px', height: '14px', background: 'var(--border)', alignSelf: 'center' }}></div>
                  <button className="btn-ghost" style={{ background: 'none', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', color: 'var(--danger)' }} title="Delete Login" onClick={() => handleDelete(m.profileId!, m.roleLabel)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(248, 250, 252, 0.6)', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', background: '#fff', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <span style={{ fontSize: '13px', color: m.email ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: m.email ? 600 : 400 }}>
                  {m.email || 'Not configured'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', background: '#fff', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <KeyRound size={13} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: m.plaintextPassword ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: m.plaintextPassword ? 600 : 400, fontFamily: m.plaintextPassword ? 'monospace' : 'inherit' }}>
                    {m.plaintextPassword ? (visiblePasswords[m.role] ? m.plaintextPassword : '••••••••') : (m.email ? '******** (Reset to view)' : 'Not configured')}
                  </span>
                  {m.plaintextPassword && (
                    <button 
                      className="btn-ghost"
                      onClick={() => togglePasswordVisibility(m.role)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                      title={visiblePasswords[m.role] ? "Hide Password" : "Show Password"}
                    >
                      {visiblePasswords[m.role] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Section 2: Department HODs */}
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 16px 0', color: 'var(--text-primary)' }}>Department Heads (HODs)</h2>
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
        {hodList.map((h) => (
          <div key={h.departmentName} className="card" style={{
            display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="animate-fade-in" style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: 700, color: '#fff', flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                }}>
                  <User size={20} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                    {h.departmentName}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>
                    Head of Department
                  </span>
                </div>
              </div>
              {h.hodId && (
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.5)', border: '1px solid var(--border)', padding: '6px', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>
                  <button className="btn-ghost" style={{ background: 'none', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', color: 'var(--accent)' }} title="Reset Password" onClick={() => { setResetTargetId(h.hodId!); setResetDeptName(h.departmentName); setShowReset(true); setError(null); setSuccess(null); }}>
                    <KeyRound size={14} />
                  </button>
                  <div style={{ width: '1px', height: '14px', background: 'var(--border)', alignSelf: 'center' }}></div>
                  <button className="btn-ghost" style={{ background: 'none', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', color: 'var(--danger)' }} title="Delete HOD" onClick={() => handleDelete(h.hodId!, h.departmentName)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(248, 250, 252, 0.6)', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', background: '#fff', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <span style={{ fontSize: '13px', color: h.hodEmail ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: h.hodEmail ? 600 : 400 }}>
                  {h.hodEmail || 'Not assigned'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', background: '#fff', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <KeyRound size={13} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: h.plaintextPassword ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: h.plaintextPassword ? 600 : 400, fontFamily: h.plaintextPassword ? 'monospace' : 'inherit' }}>
                    {h.plaintextPassword ? (visiblePasswords[h.departmentName] ? h.plaintextPassword : '••••••••') : (h.hodEmail ? '******** (Reset to view)' : 'Not assigned')}
                  </span>
                  {h.plaintextPassword && (
                    <button 
                      className="btn-ghost"
                      onClick={() => togglePasswordVisibility(h.departmentName)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                      title={visiblePasswords[h.departmentName] ? "Hide Password" : "Show Password"}
                    >
                      {visiblePasswords[h.departmentName] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Login Credential">
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Role *</label>
                <select 
                  value={role} 
                  onChange={e => {
                    const newRole = e.target.value;
                    setRole(newRole);
                    if (newRole !== 'hod') {
                      setDepartmentName('');
                    } else {
                      setDepartmentName(availableDepartments[0] || '');
                    }
                  }}
                  style={{
                    padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    fontSize: 14, background: '#fff', color: 'var(--text-primary)',
                    outline: 'none', transition: 'border-color 0.2s'
                  }}
                >
                  <option value="hod">Head of Department (HOD)</option>
                  <option value="regional_coordinator">Regional Coordinator</option>
                  <option value="final_head">Regional Head</option>
                  <option value="procurement_manager">Procurement Manager</option>
                  <option value="section_manager">Section Manager</option>
                </select>
              </div>

              {role === 'hod' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Department *</label>
                  <select 
                    value={departmentName} 
                    onChange={e => setDepartmentName(e.target.value)}
                    style={{
                      padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
                      fontSize: 14, background: '#fff', color: 'var(--text-primary)',
                      outline: 'none', transition: 'border-color 0.2s'
                    }}
                  >
                    {availableDepartments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              <Input 
                id="email" label="Email Address *" type="email" placeholder="e.g. user@dxn.com" 
                value={email} onChange={e => setEmail(e.target.value)} required 
              />
              <Input 
                id="password" label="Temporary Password *" type="password" placeholder="Min. 8 characters" 
                value={password} onChange={e => setPassword(e.target.value)} required 
              />

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Login'}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>

      <Modal open={showReset} onClose={() => setShowReset(false)} title="Reset HOD Password">
        <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
               <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                 Resetting password for the <strong>{resetDeptName} HOD</strong> account.
               </p>
 
               <Input 
                 id="newPassword" label="New Password *" type="password" placeholder="Min. 8 characters" 
                 value={newPassword} onChange={e => setNewPassword(e.target.value)} required 
               />
 
               <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                 <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowReset(false)}>Cancel</button>
                 <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                   {saving ? 'Saving…' : 'Reset Password'}
                 </button>
               </div>
             </>
           )}
        </form>
      </Modal>
    </>
  );
}
