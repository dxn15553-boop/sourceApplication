'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, AlertCircle, FileText, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  request_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  request?: {
    id: string;
    srf_number?: string | null;
    srf_date?: string | null;
    status?: string;
    description?: string;
  };
}

function getDayCategory(dateStr: string): 'Today' | 'Yesterday' | 'Earlier' {
  const date = new Date(dateStr);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  return 'Earlier';
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/notifications', { signal });
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('Notifications fetch warning:', err.message || err);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchNotifications(controller.signal);

    const interval = setInterval(() => {
      fetchNotifications();
    }, 45000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'POST', body: JSON.stringify({}) });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const markOneAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Group notifications by day
  const grouped: Record<'Today' | 'Yesterday' | 'Earlier', Notification[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  notifications.forEach(n => {
    const cat = getDayCategory(n.created_at);
    grouped[cat].push(n);
  });

  const todayUnread = grouped.Today.filter(n => !n.is_read).length;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: unreadCount > 0 ? 'var(--accent, #6366f1)' : 'var(--text-secondary)',
          position: 'relative',
          transition: 'background 0.2s',
        }}
        onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseOut={e => e.currentTarget.style.background = 'none'}
        title={unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'Notifications'}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 1,
              right: 1,
              minWidth: 17,
              height: 17,
              padding: '0 4px',
              borderRadius: 99,
              background: '#ef4444',
              color: '#fff',
              fontSize: 9.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px var(--bg-card, #1e293b)',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 10,
            width: 390,
            maxWidth: '92vw',
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border, rgba(255,255,255,0.12))',
            borderRadius: 14,
            boxShadow: '0 16px 40px -8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
            zIndex: 100,
            maxHeight: 520,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
              background: 'var(--bg-card, #1e293b)',
              position: 'sticky',
              top: 0,
              zIndex: 2,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 99,
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent, #6366f1)',
                  fontSize: 11.5,
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '2px 6px',
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List of notifications */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                No notifications right now
              </div>
            ) : (
              (['Today', 'Yesterday', 'Earlier'] as const).map(groupName => {
                const groupItems = grouped[groupName];
                if (groupItems.length === 0) return null;

                return (
                  <div key={groupName}>
                    {/* Day Group Header */}
                    <div
                      style={{
                        padding: '8px 18px',
                        background: groupName === 'Today' ? 'rgba(59, 130, 246, 0.06)' : 'rgba(255,255,255,0.02)',
                        borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
                        borderTop: '1px solid var(--border, rgba(255,255,255,0.06))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: groupName === 'Today' ? '#3b82f6' : 'var(--text-muted)',
                        }}
                      >
                        {groupName}
                      </span>
                      {groupName === 'Today' && todayUnread > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#3b82f6',
                            background: 'rgba(59, 130, 246, 0.15)',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}
                        >
                          {todayUnread} new
                        </span>
                      )}
                    </div>

                    {/* Notifications within this day */}
                    {groupItems.map(n => {
                      const isUnread = !n.is_read;
                      const hasSrf =
                        n.title.toLowerCase().includes('srf') ||
                        n.title.toLowerCase().includes('assignment') ||
                        Boolean(n.request?.srf_number);

                      const srfNumber = n.request?.srf_number || (n.title.match(/SRF-\d{4}-\d{4}/) ? n.title.match(/SRF-\d{4}-\d{4}/)![0] : null);

                      return (
                        <div
                          key={n.id}
                          style={{
                            padding: '13px 18px',
                            borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
                            background: isUnread
                              ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.04) 100%)'
                              : 'transparent',
                            borderLeft: isUnread ? '4px solid #3b82f6' : '4px solid transparent',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ marginTop: 2, flexShrink: 0 }}>
                              {hasSrf ? (
                                <FileText size={16} style={{ color: '#0284c7' }} />
                              ) : (
                                <AlertCircle size={16} style={{ color: isUnread ? '#3b82f6' : 'var(--text-muted)' }} />
                              )}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                                <span
                                  style={{
                                    fontSize: 12.5,
                                    fontWeight: isUnread ? 700 : 600,
                                    color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {n.title}
                                </span>
                                {isUnread && (
                                  <span
                                    style={{
                                      background: '#3b82f6',
                                      color: '#fff',
                                      fontSize: 9,
                                      fontWeight: 800,
                                      padding: '1px 5px',
                                      borderRadius: 4,
                                      letterSpacing: '0.04em',
                                      flexShrink: 0,
                                    }}
                                  >
                                    NEW
                                  </span>
                                )}
                              </div>

                              <p
                                style={{
                                  fontSize: 12,
                                  color: 'var(--text-secondary)',
                                  margin: '0 0 6px 0',
                                  lineHeight: 1.45,
                                  whiteSpace: 'pre-line',
                                }}
                              >
                                {n.message}
                              </p>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                                <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                                  {formatRelativeTime(n.created_at)}
                                </span>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {/* Direct SRF PDF Download Button */}
                                  {hasSrf && (
                                    <a
                                      href={`/requests/${n.request_id}/srf?download=1`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => markOneAsRead(n.id)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '4px 9px',
                                        background: 'rgba(2, 132, 199, 0.15)',
                                        color: '#0284c7',
                                        border: '1px solid rgba(2, 132, 199, 0.35)',
                                        borderRadius: 6,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                      }}
                                      title="Open printable SRF Form and save as PDF"
                                    >
                                      <FileText size={12} />
                                      <span>Download SRF PDF 📥</span>
                                    </a>
                                  )}

                                  <Link
                                    href={`/requests/${n.request_id}`}
                                    onClick={() => {
                                      markOneAsRead(n.id);
                                      setOpen(false);
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: 'var(--accent, #6366f1)',
                                      textDecoration: 'none',
                                    }}
                                  >
                                    <span>View</span>
                                    <ArrowRight size={12} />
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
