'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FilePlus, FolderOpen, Search,
  Users, LogOut, ChevronRight, FileStack, Building2,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import type { Profile } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/workflow';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',      label: 'Dashboard',       icon: <LayoutDashboard size={18} /> },
  { href: '/requests',       label: 'Source Requests', icon: <FolderOpen size={18} /> },
  { href: '/requests/new',   label: 'New Request',     icon: <FilePlus size={18} />,   roles: ['user'] },
  { href: '/search',         label: 'Search',          icon: <Search size={18} /> },
  { href: '/admin/departments',    label: 'Departments',     icon: <Building2 size={18} />,  roles: ['admin'] },
  { href: '/admin/hod-logins',     label: 'HOD Logins',      icon: <Users size={18} />,      roles: ['admin'] },
  { href: '/admin/employee-logins', label: 'Employee Logins', icon: <Users size={18} />,      roles: ['admin'] },
];

interface SidebarProps {
  profile: Profile;
  departmentName?: string;
}

export default function Sidebar({ profile, departmentName }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    item => {
      if (item.roles) {
        return item.roles.includes(profile.role);
      }
      return profile.role !== 'admin';
    }
  );

  async function handleSignOut() {
    await signOut({ redirect: false });
    window.location.href = '/login';
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ position: 'relative', zIndex: 1, padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
            <FileStack size={18} className="text-white" />
          </div>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', lineHeight: 1.2, margin: 0, letterSpacing: '-0.01em' }}>Source Request</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2, fontWeight: 500 }}>DXN Procurement</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <ChevronRight size={13} style={{ opacity: 0.5 }} />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User info + sign out */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.full_name}
            </p>
            {departmentName && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {departmentName}
              </p>
            )}
          </div>
        </div>
        <span className="role-badge" style={{ marginBottom: 10, display: 'inline-flex' }}>{ROLE_LABELS[profile.role]}</span>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '8px 14px', borderRadius: 8,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.16s ease', fontFamily: 'inherit',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.20)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
