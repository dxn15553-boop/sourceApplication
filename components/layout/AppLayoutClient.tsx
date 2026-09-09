'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import type { Profile } from '@/lib/types';

interface AppLayoutClientProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  headerAction?: React.ReactNode;
  profile: Profile;
  departmentName?: string;
}

export default function AppLayoutClient({
  children,
  pageTitle,
  pageSubtitle,
  headerAction,
  profile,
  departmentName,
}: AppLayoutClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="app-layout">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar with mobile drawer state */}
      <Sidebar
        profile={profile}
        departmentName={departmentName}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="main-content">
        <header className="topbar">
          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>

          {/* Page title & subtitle */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {pageTitle && (
              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    fontSize: 'clamp(15px, 3.5vw, 18px)',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {pageTitle}
                </h1>
                {pageSubtitle && (
                  <p
                    style={{
                      fontSize: 'clamp(11px, 2.5vw, 12px)',
                      color: 'var(--text-muted)',
                      margin: '2px 0 0',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pageSubtitle}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right actions: notification bell and page actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <NotificationBell />
            {headerAction && <div style={{ flexShrink: 0 }}>{headerAction}</div>}
          </div>
        </header>

        <main className="page-content animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
