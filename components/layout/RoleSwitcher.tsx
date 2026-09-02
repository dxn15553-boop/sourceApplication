'use client';

import { useState, useRef, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { 
  UserCheck, 
  ChevronDown, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Briefcase, 
  Building2, 
  User, 
  Layers 
} from 'lucide-react';
import type { Role } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/workflow';

interface PersonaOption {
  email: string;
  name: string;
  role: Role;
  department?: string;
  badge: string;
  color: string;
}

const PERSONAS: { category: string; icon: any; items: PersonaOption[] }[] = [
  {
    category: 'Source Requesters & Staff',
    icon: User,
    items: [
      { email: 'requester@dxn.com', name: 'Universal Requester', role: 'user', badge: 'Creator', color: '#10b981' },
      { email: 'employee@dxn.com', name: 'Universal Employee', role: 'employee', badge: 'Employee', color: '#06b6d4' },
      { email: 'itemployee@gmail.com', name: 'IT Staff Employee', role: 'employee', department: 'IT', badge: 'IT Staff', color: '#3b82f6' },
      { email: 'agroemployee@gmail.com', name: 'Agro Staff Employee', role: 'employee', department: 'Agro Food', badge: 'Agro Staff', color: '#10b981' },
    ],
  },
  {
    category: 'HODs & FPIC Approvers (Step 2-4)',
    icon: Building2,
    items: [
      { email: 'hod@dxn.com', name: 'Universal HOD', role: 'hod', badge: 'FPIC (All Depts)', color: '#6366f1' },
      { email: 'ithod@gmail.com', name: 'HOD (IT Dept)', role: 'hod', department: 'IT', badge: 'IT FPIC', color: '#3b82f6' },
      { email: 'ehs@gmail.com', name: 'HOD (EHS Dept)', role: 'hod', department: 'EHS', badge: 'EHS Review', color: '#10b981' },
      { email: 'agro@gmail.com', name: 'HOD (Agro Food)', role: 'hod', department: 'Agro Food', badge: 'Agro FPIC', color: '#f59e0b' },
    ],
  },
  {
    category: 'Regional Approvals (Step 5-6)',
    icon: ShieldCheck,
    items: [
      { email: 'regionalcoordinator@dxn.com', name: 'Regional Coordinator (South)', role: 'regional_coordinator', badge: 'RC South', color: '#ec4899' },
      { email: 'regionalhead@dxn.com', name: 'Regional Head of Factories (RHoF)', role: 'final_head', badge: 'RHoF Approval', color: '#8b5cf6' },
    ],
  },
  {
    category: 'Procurement Team (Step 7-12)',
    icon: Briefcase,
    items: [
      { email: 'procurement@dxn.com', name: 'Procurement Manager', role: 'procurement_manager', badge: 'Purchase Mgr', color: '#f97316' },
      { email: 'sectionmanager@dxn.com', name: 'Section Manager (Indirect)', role: 'section_manager', badge: 'Section Mgr', color: '#eab308' },
    ],
  },
  {
    category: 'Administration',
    icon: Layers,
    items: [
      { email: 'admin@dxn.com', name: 'System Administrator', role: 'admin', badge: 'Super Admin', color: '#ef4444' },
    ],
  },
];

interface RoleSwitcherProps {
  currentEmail?: string;
  currentName?: string;
  currentRole?: Role;
}

export default function RoleSwitcher({ currentEmail, currentName, currentRole }: RoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSwitch(persona: PersonaOption) {
    if (persona.email === currentEmail) {
      setIsOpen(false);
      return;
    }

    setSwitchingTo(persona.email);
    try {
      const res = await signIn('credentials', {
        email: persona.email,
        password: '__QUICK_SWITCH__',
        redirect: false,
      });

      if (res?.ok) {
        window.location.reload();
      } else {
        alert('Could not switch persona. Please try again.');
        setSwitchingTo(null);
      }
    } catch (err) {
      console.error('Error switching persona:', err);
      alert('Error switching persona');
      setSwitchingTo(null);
    }
  }

  const activeRoleLabel = currentRole ? ROLE_LABELS[currentRole] || currentRole : 'User';

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={!!switchingTo}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderRadius: 8,
          background: 'var(--bg-hover)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: switchingTo ? 'wait' : 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
        title="Switch user role / persona instantly"
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {switchingTo ? (
            <span
              style={{
                width: 12,
                height: 12,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
              }}
            />
          ) : (
            <Sparkles size={13} />
          )}
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>Role:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {switchingTo ? 'Switching…' : activeRoleLabel}
          </span>
        </span>

        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 320,
            maxHeight: 480,
            overflowY: 'auto',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            zIndex: 9999,
            padding: 8,
          }}
          className="animate-fade-in"
        >
          <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>
              <Sparkles size={14} />
              1-Click Persona Switcher
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              Switch roles to test or act on behalf of any department or approver.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PERSONAS.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.category}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 10.5,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--text-muted)',
                      padding: '4px 8px',
                    }}
                  >
                    <GroupIcon size={12} />
                    {group.category}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                    {group.items.map((p) => {
                      const isCurrent = p.email.toLowerCase() === currentEmail?.toLowerCase();
                      const isSelected = switchingTo === p.email;

                      return (
                        <button
                          key={p.email}
                          type="button"
                          onClick={() => handleSwitch(p)}
                          disabled={!!switchingTo}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '7px 10px',
                            borderRadius: 8,
                            background: isCurrent ? 'rgba(99,102,241,0.08)' : 'transparent',
                            border: isCurrent ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                            color: 'var(--text-primary)',
                            fontSize: 12,
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.12s ease',
                            width: '100%',
                          }}
                          onMouseOver={(e) => {
                            if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                          }}
                          onMouseOut={(e) => {
                            if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 600, fontSize: 12.5 }}>{p.name}</span>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  background: `${p.color}15`,
                                  color: p.color,
                                  border: `1px solid ${p.color}30`,
                                }}
                              >
                                {p.badge}
                              </span>
                            </div>
                            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>
                              {p.email}
                            </span>
                          </div>

                          {isCurrent && (
                            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                              <Check size={15} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
