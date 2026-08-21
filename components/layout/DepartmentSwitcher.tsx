'use client';

import { useRouter } from 'next/navigation';
import { Building2, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

type Department = { id: string; name: string };

interface DepartmentSwitcherProps {
  departments: Department[];
  activeId: string;
}

export default function DepartmentSwitcher({ departments, activeId }: DepartmentSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeDept = departments.find((d) => d.id === activeId) || departments[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(id: string) {
    document.cookie = `active_department_id=${id}; path=/; max-age=31536000`; // 1 year
    setOpen(false);
    router.refresh();
  }

  if (!departments || departments.length === 0) return null;

  if (departments.length === 1) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <Building2 size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{activeDept?.name}</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        onClick={() => setOpen(!open)}
        style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
          background: open ? 'var(--bg-card-hover)' : 'rgba(255,255,255,0.6)', 
          borderRadius: '10px', border: '1px solid var(--border)', 
          cursor: 'pointer', transition: 'all 0.2s',
          boxShadow: open ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
        }}
      >
        <Building2 size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{activeDept?.name}</span>
        <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {open && (
        <div style={{ 
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, 
          width: '240px', background: '#fff', borderRadius: '12px', 
          border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', 
          zIndex: 50, padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px',
          animation: 'fadeUp 0.2s ease'
        }}>
          <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Switch Department
          </div>
          {departments.map(dept => (
            <button
              key={dept.id}
              onClick={() => handleSelect(dept.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '10px 12px', textAlign: 'left',
                background: activeId === dept.id ? 'var(--accent-glow)' : 'transparent',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => { if (activeId !== dept.id) e.currentTarget.style.background = 'var(--bg-base)'; }}
              onMouseLeave={e => { if (activeId !== dept.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '13px', fontWeight: activeId === dept.id ? 700 : 500, color: activeId === dept.id ? 'var(--accent-hover)' : 'var(--text-primary)' }}>
                {dept.name}
              </span>
              {activeId === dept.id && (
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }}></div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
