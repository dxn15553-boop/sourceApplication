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
    item => !item.roles || item.roles.includes(profile.role)
  );

  async function handleSignOut() {
    await signOut({ callbackUrl: window.location.origin + '/login' });
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="p-5 border-b border-[var(--border)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent)] rounded-full blur-[40px] opacity-20 -z-10"></div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] flex items-center justify-center shrink-0 shadow-[0_0_15px_var(--accent-glow)]">
            <FileStack size={20} className="text-white" />
          </div>
          <div>
            <p className="text-[14px] font-extrabold text-[var(--text-primary)] leading-tight tracking-tight">Source Request</p>
            <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-0.5">DXN Procurement</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={14} className="opacity-60" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User info + sign out */}
      <div className="p-4 border-t border-[var(--border)] bg-[rgba(255,255,255,0.3)]">
        <div className="mb-4 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-secondary)] to-[var(--accent)] flex items-center justify-center text-[15px] font-bold text-white mb-2 shadow-[0_4px_15px_var(--accent-glow)] border border-[var(--border)]">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <p className="text-[13px] font-bold text-[var(--text-primary)] leading-tight">
            {profile.full_name}
          </p>
          {departmentName && (
            <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1">
              {departmentName}
            </p>
          )}
          <span className="role-badge mt-2">
            {ROLE_LABELS[profile.role]}
          </span>
        </div>

        <button
          onClick={handleSignOut}
          className="btn btn-ghost btn-sm w-full justify-center gap-2"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
